// lib/readout.ts
// Live data contract for TWU · The Readout (v9.0).
// Every dashboard metric traces to a field defined here. Nothing is hardcoded.
// Shapes mirror the "Live Parallel Fetch & Build JSON" node exactly.

export type Freshness = Record<string, string>;

export interface Readout {
  meta: {
    dashboard: string;
    generated_at: string;
    version: string;
    data_freshness: Freshness;
  };
  lead_gen: {
    total_contacts_in_ghl: number;
    crossfit_contacts_in_ghl: number;
    hyrox_contacts_in_ghl: number;
    hot_leads: number;
    warm_leads: number;
    email_outreach_sent: number;
    email_replied: number;
    sequence_complete: number;
    touch_sequence: {
      in_sequence: number;
      step_1: number; step_2: number; step_3: number; step_4: number; step_5: number;
    };
    ig_outreach_ready: number;
    ig_outreach_sent: number;
    ig_replied_positive: number;
    ig_replied_negative: number;
    replied_contacts: { name: string; time: string; channel: string }[];
    phone_followup_due: number;
    phone_still_due: number;
    phone_positive: number;
    phone_negative: number;
    phone_called_only: number;
    phone_resolved: number;
    stage_new_lead: number;
    stage_responded: number;
    stage_dead: number;
    stage_no_response: number;
    stage_ig_outreach: number;
    total_in_pipeline: number;
    email_reply_rate_pct: number;
  };
  lead_sources_raw: {
    cf_scraped: number; cf_processed: number; cf_pending: number;
    hy_scraped: number; hy_processed: number; hy_pending: number;
    combined_scraped: number; combined_processed: number; combined_pending: number;
  };
  lead_sources_failed: {
    cf_failed: number; hy_failed: number; total_failed: number;
    cf_no_email: number; hy_no_email: number; total_no_email: number;
    cf_duplicates_skipped: number; hy_duplicates_skipped: number; total_duplicates_skipped: number;
  };
  lead_sources_drafts: {
    cf_drafts_created: number; hy_drafts_created: number; total_drafts_created: number;
  };
  lead_sources_enriched: Record<string, number>;
  app_adoption: {
    total_identified: number;
    email_draft_in_gmail: number;
    followup_draft_in_gmail: number;
    email_outreach_confirmed: number;
    followup_confirmed: number;
    adopted: number;
    already_on_app: number;
    total_joined: number;
    opted_out: number;
    no_response: number;
    needs_dave_review: number;
    adoption_rate_pct: number;
    no_email_mongo_count: number;
    duplicate_mongo_count: number;
    no_email_sheet_count: number;
    duplicate_sheet_count: number;
    not_joining_confirmed: number;
    stage_drafted: number; stage_sent: number; stage_followup: number;
    stage_no_response: number; stage_adopted: number; stage_not_joining: number;
    stage_opted_out: number; stage_replied: number;
  };
  geo_distribution: { label: string; count: number }[];
  data_integrity: {
    stuck_draft_tags: number;
    step_tag_mismatch: number;
    ig_unmatched_duplicates: number;
    ig_bridge_stuck_pending: number;
    stuck_past_resume_date: number;
    missing_resume_date: number;
    legacy_ig_bridge_stuck_tag: number;
    [k: string]: unknown;
  };
  reply_breakdown: {
    interested: number; not_interested: number; auto_responder: number;
    auto_ack: number; other: number; total_classified: number;
  };
  alt_email_outreach: {
    auto_responders_detected: number;
    alt_outreach_started: number;
    alt_outreach_coverage_pct: number;
    in_alt_outreaching_stage: number;
    awaiting_reply: number;
    replied: number;
    interested: number;
    not_interested: number;
  };
  ig_bridge_outreach: {
    touch1_sent: number; sequence_complete: number;
    replied_interested: number; replied_not_interested: number;
    auto_ack: number; needs_review: number;
    temp_paused: number; temp_paused_legacy_tag: number; reply_rate_pct: number;
  };
  temp_away_pause_resume: {
    total_paused: number;
    paused_by_source: Record<string, number>;
    total_resumed: number;
    resumed_by_source: Record<string, number>;
    resume_sequence_exhausted?: number;
    resume_exhausted_by_source?: Record<string, number>;
    stuck_past_resume_date: number;
    missing_resume_date: number;
    legacy_ig_bridge_stuck_tag: number;
  };
  summary: Record<string, number>;
}

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
    return client.db();
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

// v2 architecture: a scheduled n8n workflow (every 5 min, or on demand via
// /twu-readout-sync-now) runs the heavy GHL + Sheets + Mongo fetch ONCE and
// stores the compact result in MongoDB. These v2 endpoints read only that
// stored document, so a dashboard load can never trigger a whole-dataset
// fetch again (that per-load fetch is what used to crash n8n). If the cache
// is empty or the v2 workflows are not imported yet, we fall back to the
// legacy direct endpoints so the dashboard keeps working during migration.
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
    // already fully computed inside whichever of the two webhooks owns it.
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
        version: lg.meta?.served_from === "mongo-cache" ? "v2-cached" : "v1.0-split",
        data_freshness: {
          lead_gen: "live via 5-minute sync: GHL contacts API",
          app_adoption: "live via 5-minute sync: GHL opportunities + MongoDB",
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

// Safe deep getter used by the config-driven metric binding.
export function pick(obj: any, path: string): number | string | null {
  const v = path.split(".").reduce((a: any, k: string) => (a == null ? a : a[k]), obj);
  return v == null ? null : v;
}
