// POST: trigger a sync on demand (the Refresh now button).
//   1) GitHub Actions workflow dispatch when GITHUB_PAT + GITHUB_REPO are set
//      (the n8n-free path).
//   2) Otherwise the n8n v3 sync webhooks, then the legacy combined hook.
// GET: report the cache's generated_at so the client can tell when the
// on-demand sync has finished writing fresh numbers.
import { NextResponse } from "next/server";
import { readCacheDoc } from "@/lib/readout";

const BASE = process.env.READOUT_BASE_URL || "https://trainwithus.app.n8n.cloud/webhook";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO; // e.g. "youruser/twu-dash"
    if (pat && repo) {
      const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/readout-sync.yml/dispatches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: process.env.GITHUB_BRANCH || "main" }),
        cache: "no-store",
      });
      if (res.status === 204) return NextResponse.json({ ok: true, via: "github" });
    }
    const [lg, aa] = await Promise.all([
      fetch(`${BASE}/twu-sync-leadgen-now`, { cache: "no-store" }).catch(() => null),
      fetch(`${BASE}/twu-sync-appadoption-now`, { cache: "no-store" }).catch(() => null),
    ]);
    if (lg?.ok || aa?.ok) return NextResponse.json({ ok: true, via: "n8n-v3" });
    const legacy = await fetch(`${BASE}/twu-readout-sync-now`, { cache: "no-store" }).catch(() => null);
    return NextResponse.json({ ok: !!legacy?.ok, via: "n8n-legacy", status: legacy?.status ?? 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "sync trigger failed" }, { status: 502 });
  }
}

export async function GET() {
  // Prefer MongoDB direct; fall back to the n8n cached endpoint.
  const doc = await readCacheDoc("twu_readout_live");
  if (doc?.meta) {
    return NextResponse.json({ generatedAt: doc.meta.cache_generated_at || doc.meta.generated_at || null });
  }
  try {
    const res = await fetch(`${BASE}/twu-readout-leadgen-v2`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ generatedAt: null });
    const raw = await res.json();
    const j = Array.isArray(raw) ? raw[0] : raw;
    return NextResponse.json({ generatedAt: j?.meta?.cache_generated_at || j?.meta?.generated_at || null });
  } catch {
    return NextResponse.json({ generatedAt: null });
  }
}
