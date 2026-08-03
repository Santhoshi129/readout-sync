import { NextRequest, NextResponse } from "next/server";
import { fetchLatestWebhookPayload } from "@/lib/n8n";
import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/**
 * Runs once a day via Vercel Cron (see vercel.json). This is the ONLY
 * thing in this whole project that ever calls n8n's API — not the
 * dashboard page, not any per-request code. One call a day, full stop.
 *
 * Vercel automatically sends an Authorization: Bearer <CRON_SECRET>
 * header on scheduled invocations when CRON_SECRET is set — this check
 * just rejects anyone else from hitting the URL directly.
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

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI not set" }, { status: 200 });
  }

  await db.collection("retention_watch").updateOne(
    { _id: "latest" as never },
    { $set: { ...payload, synced_at: new Date().toISOString() } },
    { upsert: true }
  );
  await db.collection("retention_watch_history").insertOne({
    ...payload,
    synced_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, synced_at: new Date().toISOString() });
}
