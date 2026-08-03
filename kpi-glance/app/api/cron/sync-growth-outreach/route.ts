import { NextRequest, NextResponse } from "next/server";
import { kvSetJSON } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Hobby plan caps this at 10s regardless — see note in chat

// Same fallback tokens Readout's own sync-readout.mjs already uses in
// production (env var overrides available, same as there).
const LG_TOKEN = process.env.GHL_LG_TOKEN || "Bearer pit-80260df3-f7ad-46af-b7ac-77e1d40f0432";
const LG_LOC = process.env.GHL_LG_LOC || "XaKN6Kl5NGnFbEbYvtWO";
const GHL_VER = "2021-07-28";

async function ghlGet(token: string, url: string, qs: Record<string, string | number>) {
  const u = new URL(url);
  Object.entries(qs || {}).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { headers: { Authorization: token, Version: GHL_VER } });
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

interface Counts {
  [key: string]: number;
}

async function syncGrowthOutreach() {
  const c: Counts = {};
  const inc = (k: string) => {
    c[k] = (c[k] || 0) + 1;
  };
  let total = 0;

  for (let page = 1; ; page++) {
    const r = await ghlGet(LG_TOKEN, "https://services.leadconnectorhq.com/contacts/", {
      locationId: LG_LOC,
      limit: 100,
      page,
    });
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
    if (page > 100) break; // hard safety cap, avoids runaway loops
  }

  const n = (k: string) => c[k] || 0;
  const round1 = (x: number) => Math.round(x * 10) / 10;

  const igSentTotal = n("igReadyAndSent") + n("igSentOnly");
  const igReplies = n("igPos") + n("igNeg");

  const payload = {
    total_contacts: total,
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
    hot_lead_share_pct: n("hot") + n("warm") > 0 ? round1((n("hot") / (n("hot") + n("warm"))) * 100) : 0,
    sequence_complete_rate_pct:
      n("seqdone") + n("seqstopped") > 0 ? round1((n("seqdone") / (n("seqdone") + n("seqstopped"))) * 100) : 0,
    synced_at: new Date().toISOString(),
  };

  return kvSetJSON("growth-outreach:latest", payload);
}

async function syncAdoption() {
  const token = process.env.TWU_API_TOKEN;
  if (!token) return { ok: false, reason: "TWU_API_TOKEN not set" };

  const res = await fetch("https://dashboard.trainwithus.app/api/v1/community/member-overlap", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, reason: `member-overlap responded ${res.status}` };
  const json = await res.json();
  const data = json?.data ?? null;
  if (!data) return { ok: false, reason: "Unexpected response shape" };

  const ok = await kvSetJSON("adoption:latest", { ...data, synced_at: new Date().toISOString() });
  return { ok };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const [growthOutreachOk, adoptionResult] = await Promise.all([syncGrowthOutreach(), syncAdoption()]);

  return NextResponse.json({
    ok: growthOutreachOk && adoptionResult.ok,
    growth_outreach: growthOutreachOk,
    adoption: adoptionResult,
    synced_at: new Date().toISOString(),
  });
}
