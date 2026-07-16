// lib/readout.ts
// SERVER-ONLY data access. Client components must import types and pick()
// from lib/contract.ts instead; importing this file into a client component
// would drag the Node-only mongodb driver into the browser bundle and break
// the build.
import { Readout, pick } from "@/lib/contract";

export type { Readout, Freshness } from "@/lib/contract";
export { pick } from "@/lib/contract";

const BASE = process.env.READOUT_BASE_URL || "https://trainwithus.app.n8n.cloud/webhook";

// Preferred path: read the cached documents straight from MongoDB. The
// GitHub Actions sync (scripts/sync-readout.mjs) writes them every 10
// minutes; n8n is not in the dashboard's path at all when MONGODB_URI is
// set. Falls back to the n8n endpoints below when it isn't.
let mongoClientPromise: Promise<any> | null = null;
async function getMongoDb(): Promise<any | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  try {
    if (!mongoClientPromise) {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri);
      mongoClientPromise = client.connect();
    }
    const client = await mongoClientPromise;
    const dbName = process.env.MONGODB_DB_NAME;
    if (!dbName) return null; // same failure mode as the sync script: no silent fallback to the wrong db
    return client.db(dbName);
  } catch {
    mongoClientPromise = null;
    return null;
  }
}

export async function readCacheDoc(docId: string): Promise<any | null> {
  const db = await getMongoDb();
  if (!db) return null;
  try {
    const doc = await db.collection("readout_cache_v2").findOne({ doc_id: docId });
    if (!doc?.payload) return null;
    if (doc.payload.meta) doc.payload.meta.cache_generated_at = doc.generated_at;
    return doc.payload;
  } catch {
    return null;
  }
}

// The sync script's own self-report of its last run, written whether that
// run succeeded or failed. Read directly (no page load triggers a sync) so
// a broken sync shows up loudly on the dashboard itself instead of quietly
// serving whatever stale cache existed before anyone noticed.
export async function getSyncStatus(): Promise<{ ok: boolean; last_success_at: string | null; last_attempt_at: string | null; last_error: string | null } | null> {
  const db = await getMongoDb();
  if (!db) return null;
  try {
    const doc = await db.collection("readout_cache_v2").findOne({ doc_id: "sync_status" });
    if (!doc) return null;
    return {
      ok: !!doc.ok,
      last_success_at: doc.last_success_at ? new Date(doc.last_success_at).toISOString() : null,
      last_attempt_at: doc.last_attempt_at ? new Date(doc.last_attempt_at).toISOString() : null,
      last_error: doc.last_error || null,
    };
  } catch {
    return null;
  }
}

// v2 architecture: a scheduled sync runs the heavy GHL + Sheets + Mongo
// fetch ONCE and stores the compact result in MongoDB. These reads only
// touch that stored document, so a dashboard load can never trigger a
// whole-dataset fetch again (that per-load fetch is what used to crash
// n8n). Order: Mongo direct, then the n8n cached endpoint, then the legacy
// direct endpoints, so the dashboard keeps working during any migration.
async function fetchSource(v2Path: string, legacyPath: string, requiredKey: string, mongoDocId: string): Promise<{ json: any; error: string | null }> {
  // 1) MongoDB direct (no n8n involved).
  const fromMongo = await readCacheDoc(mongoDocId);
  if (fromMongo && fromMongo[requiredKey]) return { json: fromMongo, error: null };
  // 2) n8n cached endpoint.
  try {
    const res = await fetch(`${BASE}/${v2Path}`, { cache: "no-store" });
    if (res.ok) {
      const raw = await res.json();
      const j = Array.isArray(raw) ? raw[0] : raw;
      if (j && !j.cache_empty && j[requiredKey]) return { json: j, error: null };
    }
  } catch {
    // fall through to legacy
  }
  // 3) legacy direct endpoint.
  try {
    const res = await fetch(`${BASE}/${legacyPath}`, { next: { revalidate: 30 } });
    if (!res.ok) return { json: null, error: `${legacyPath} responded ${res.status}` };
    const raw = await res.json();
    const j = Array.isArray(raw) ? raw[0] : raw;
    return { json: j, error: null };
  } catch (e: any) {
    return { json: null, error: e?.message || `${legacyPath} unreachable` };
  }
}

// Trend data for the last N days, read straight from the readout_history
// collection appended by scripts/sync-readout.mjs on every sync run. Returns
// [] (not fake data) if Mongo isn't reachable or nothing has accumulated
// yet - the chart component renders an honest "not enough history yet" state
// in that case rather than drawing a flat or invented line.
export type HistoryPoint = { ts: string; metrics: Record<string, number> };

export async function getHistory(docId: string, days = 14): Promise<HistoryPoint[]> {
  const db = await getMongoDb();
  if (!db) return [];
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .collection("readout_history")
      .find({ doc_id: docId, ts: { $gte: since } })
      .sort({ ts: 1 })
      .project({ _id: 0, ts: 1, metrics: 1 })
      .toArray();
    return rows.map((r: any) => ({ ts: new Date(r.ts).toISOString(), metrics: r.metrics || {} }));
  } catch {
    return [];
  }
}

export async function getReadout(): Promise<{ data: Readout | null; error: string | null; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  try {
    const [lgOut, aaOut] = await Promise.all([
      fetchSource("twu-readout-leadgen-v2", "twu-readout-leadgen", "lead_gen", "twu_readout_live"),
      fetchSource("twu-readout-appadoption-v2", "twu-readout-appadoption", "app_adoption", "blended_readout_live"),
    ]);
    if (!lgOut.json) return { data: null, error: lgOut.error || "Lead gen source unreachable", fetchedAt };
    if (!aaOut.json) return { data: null, error: aaOut.error || "App adoption source unreachable", fetchedAt };

    const lg = lgOut.json;
    const aa = aaOut.json;

    // The only fields that ever needed BOTH datasets - everything else is
    // already fully computed inside whichever source owns it.
    const summary = { ...lg.summary, ...aa.summary };
    summary.total_email_replied = (lg.lead_gen?.email_replied || 0) + (aa.app_adoption?.stage_replied || 0);
    summary.total_emails_sent =
      (lg.lead_gen?.email_outreach_sent || 0) +
      (aa.app_adoption?.email_outreach_confirmed || 0) +
      (aa.app_adoption?.followup_confirmed || 0);

    // When served from the Mongo cache, generated_at is the moment the sync
    // last computed the numbers. That is the honest "data as of" timestamp.
    const generatedAt = lg.meta?.cache_generated_at || lg.meta?.generated_at || new Date().toISOString();

    const data: Readout = {
      meta: {
        dashboard: "TWU · The Readout",
        generated_at: generatedAt,
        version: lg.meta?.served_from === "mongo-cache" ? lg.meta?.version || "v2-cached" : "v1.0-split",
        data_freshness: {
          lead_gen: "live via scheduled sync: GHL contacts API",
          app_adoption: "live via scheduled sync: GHL opportunities + MongoDB",
          ...(lg.meta?.data_freshness || {}),
        },
      },
      lead_gen: lg.lead_gen,
      lead_sources_raw: lg.lead_sources_raw,
      lead_sources_failed: lg.lead_sources_failed,
      lead_sources_drafts: lg.lead_sources_drafts,
      lead_sources_enriched: lg.lead_sources_enriched,
      app_adoption: aa.app_adoption,
      geo_distribution: lg.geo_distribution,
      franchise_mix: lg.franchise_mix || { independent: 0, f45: 0, orangetheory: 0, shred415: 0, total_franchise: 0 },
      data_integrity: lg.data_integrity,
      reply_breakdown: lg.reply_breakdown,
      alt_email_outreach: lg.alt_email_outreach,
      ig_bridge_outreach: lg.ig_bridge_outreach,
      temp_away_pause_resume: lg.temp_away_pause_resume,
      summary,
    };

    return { data, error: null, fetchedAt };
  } catch (e: any) {
    return { data: null, error: e?.message || "Readout unreachable", fetchedAt };
  }
}
