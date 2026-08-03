import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/**
 * This is the real endpoint Retention Watch's "Send Alerts" node should
 * point at, replacing the temporary n8n test webhook. Point the HTTP
 * Request node's URL at:
 *   https://<this-project's-domain>/api/retention-webhook
 *
 * POST: called once a day by Retention Watch, stores the full payload
 * GET:  called by the dashboard to read back the latest stored payload
 */

export async function POST(req: NextRequest) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI not set" }, { status: 500 });
  }

  const payload = await req.json();

  // Always overwrite "latest" so the dashboard has a single fast doc to read
  await db.collection("retention_watch").updateOne(
    { _id: "latest" as never },
    { $set: { ...payload, received_at: new Date().toISOString() } },
    { upsert: true }
  );

  // Also append to history so trend charts are possible later without
  // any workflow changes needed down the line
  await db.collection("retention_watch_history").insertOne({
    ...payload,
    received_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const db = await getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI not set" }, { status: 500 });
  }

  const latest = await db.collection("retention_watch").findOne({ _id: "latest" as never });
  if (!latest) {
    return NextResponse.json({ ok: false, error: "No data received yet" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: latest });
}
