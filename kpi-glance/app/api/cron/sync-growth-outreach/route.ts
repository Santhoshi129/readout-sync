import { NextRequest, NextResponse } from "next/server";
import { storeSetJSON } from "@/lib/store";
import { KEY_ADOPTION, KEY_GROWTH } from "@/lib/live-data";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One daily job covering both GHL (pipeline + outreach) and the TWU
 * member-overlap API (product usage). They're merged into a single route
 * because the Hobby plan allows only two scheduled crons per project.
 */

// Same GHL credentials Readout's production sync already uses; env vars
// override them so the tokens can be rotated without a code change.
const LG_TOKEN = process.env.GHL_LG_TOKEN || "Bearer pit-80260df3-f7ad-46af-b7ac-77e1d40f0432";
const LG_LOC = process.env.GHL_LG_LOC || "XaKN6Kl5NGnFbEbYvtWO";
const GHL_VER = "2021-07-28";

async function ghlGet(token: string, url: string, qs: Record<string, string | number>) {
  const u = new URL(url);
  Object.entries(qs || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { headers: { Authorization: token, Version: GHL_VER }, cache: "no-store" });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return null;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

async function syncGrowthOutreach(): Promise<{ ok: boolean; reason?: string; contacts?: number }> {
  const c: Record<string, number> = {};
  const inc = (k: string) => {
    c[k] = (c[k] || 0) + 1;
  };
  let total = 0;
  let pagesFetched = 0;

  for (let page = 1; ; page++) {
    const r = await ghlGet(LG_TOKEN, "https://services.leadconnectorhq.com/contacts/", {
      locationId: LG_LOC,
      limit: 100,
      page,
    });
    // A hard failure on the very first page means we have nothing usable —
    // bail out rather than write a snapshot built from partial data.
    if (r === null) {
      if (page === 1) return { ok: false, reason: "GHL contacts request failed" };
      break;
    }
    pagesFetched++;
    const batch = r?.contacts ?? [];
    for (const ct of batch) {
      total++;
      const tLower = (ct.tags || []).map((x: string) => String(x).toLowerCase());
      const has = (x: string) => tLower.includes(x.toLowerCase());

      if (has("hot")) inc("hot");
      if (has("warm")) inc("warm");
      if (has("outreach-sent")) inc("sent");
      if (has("replied")) inc("replied");
      if (has("interested")) inc("interested");
      if (has("sequence-complete")) inc("seqdone");
      if (has("sequence-stopped")) inc("seqstopped");
      if (has("ig-outreach-ready") && has("ig-outreach-sent")) inc("igReadyAndSent");
      if (has("ig-outreach-sent") && !has("ig-outreach-ready")) inc("igSentOnly");
      if (has("ig-replied-positive")) inc("igPos");
      if (has("ig-replied-negative")) inc("igNeg");
    }
    if (batch.length < 100) break;
    if (page > 100) break; // safety cap against a runaway loop
  }

  if (total === 0) return { ok: false, reason: "GHL returned no contacts" };

  const n = (k: string) => c[k] || 0;
  const igSentTotal = n("igReadyAndSent") + n("igSentOnly");
  const igReplies = n("igPos") + n("igNeg");

  const payload = {
    total_contacts: total,
    pages_fetched: pagesFetched,
    hot_leads: n("hot"),
    warm_leads: n("warm"),
    email_sent: n("sent"),
    email_replied: n("replied"),
    interested: n("interested"),
    sequence_complete: n("seqdone"),
    sequence_stopped: n("seqstopped"),
    ig_sent_total: igSentTotal,
    ig_replies: igReplies,
    email_reply_rate_pct: n("sent") > 0 ? round1((n("replied") / n("sent")) * 100) : 0,
    ig_reply_rate_pct: igSentTotal > 0 ? round1((igReplies / igSentTotal) * 100) : 0,
    interested_rate_pct: n("replied") > 0 ? round1((n("interested") / n("replied")) * 100) : 0,
    hot_lead_share_pct:
      n("hot") + n("warm") > 0 ? round1((n("hot") / (n("hot") + n("warm"))) * 100) : 0,
    sequence_complete_rate_pct:
      n("seqdone") + n("seqstopped") > 0
        ? round1((n("seqdone") / (n("seqdone") + n("seqstopped"))) * 100)
        : 0,
    synced_at: new Date().toISOString(),
  };

  const result = await storeSetJSON(KEY_GROWTH, payload);
  return result.ok ? { ok: true, contacts: total } : { ok: false, reason: result.error };
}

async function syncAdoption(): Promise<{ ok: boolean; reason?: string; members?: number }> {
  const token = process.env.TWU_API_TOKEN;
  if (!token) return { ok: false, reason: "TWU_API_TOKEN not set" };

  let res: Response;
  try {
    res = await fetch("https://dashboard.trainwithus.app/api/v1/community/member-overlap", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "member-overlap fetch failed" };
  }
  if (!res.ok) return { ok: false, reason: `member-overlap responded ${res.status}` };

  const json = await res.json().catch(() => null);
  const data = json?.data ?? null;
  if (!data || !Array.isArray(data.in_both)) {
    return { ok: false, reason: "Unexpected member-overlap response shape" };
  }

  const result = await storeSetJSON(KEY_ADOPTION, { ...data, synced_at: new Date().toISOString() });
  return result.ok
    ? { ok: true, members: (data.in_both?.length ?? 0) + (data.in_zp_not_app?.length ?? 0) }
    : { ok: false, reason: result.error };
}

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  // Independent sources: one failing must not stop the other from syncing.
  const [growth, adoption] = await Promise.all([
    syncGrowthOutreach().catch((e) => ({ ok: false as const, reason: String(e) })),
    syncAdoption().catch((e) => ({ ok: false as const, reason: String(e) })),
  ]);

  return NextResponse.json({
    ok: growth.ok || adoption.ok,
    growth_outreach: growth,
    adoption,
    synced_at: new Date().toISOString(),
  });
}
