import { NextRequest, NextResponse } from "next/server";
import { kvSetJSON } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  const token = process.env.TWU_API_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "TWU_API_TOKEN not set" }, { status: 200 });
  }

  const res = await fetch("https://dashboard.trainwithus.app/api/v1/community/member-overlap", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `member-overlap responded ${res.status}` }, { status: 200 });
  }
  const json = await res.json();
  const data = json?.data ?? null;
  if (!data) {
    return NextResponse.json({ ok: false, error: "Unexpected response shape" }, { status: 200 });
  }

  const stored = { ...data, synced_at: new Date().toISOString() };
  const ok = await kvSetJSON("adoption:latest", stored);

  return NextResponse.json({ ok, synced_at: stored.synced_at });
}
