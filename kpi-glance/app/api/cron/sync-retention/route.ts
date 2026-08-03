import { NextRequest, NextResponse } from "next/server";
import { fetchLatestWebhookPayload } from "@/lib/n8n";
import { kvSetJSON } from "@/lib/kv";

export const dynamic = "force-dynamic";

/**
 * Runs once a day via Vercel Cron (see vercel.json). This is the ONLY
 * thing in this whole project that ever calls n8n's API — not the
 * dashboard page, not any per-request code. One call a day, full stop.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await fetchLatestWebhookPayload();
  if (!payload) {
    return NextResponse.json({ ok: false, error: "No payload found (check N8N_* env vars)" }, { status: 200 });
  }

  const stored = { ...payload, synced_at: new Date().toISOString() };
  const ok = await kvSetJSON("retention:latest", stored);

  return NextResponse.json({ ok, synced_at: stored.synced_at });
}
