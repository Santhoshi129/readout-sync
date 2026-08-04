import { NextRequest, NextResponse } from "next/server";
import { fetchLatestWebhookPayload } from "@/lib/n8n";
import { storeSetJSON } from "@/lib/store";
import { KEY_RETENTION } from "@/lib/live-data";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day via Vercel Cron (see vercel.json). This is the only thing
 * in the project that ever calls n8n, and it only ever reads execution
 * history — it never triggers, edits, or re-runs a workflow.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  let payload: Record<string, unknown> | null = null;
  try {
    payload = await fetchLatestWebhookPayload();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "n8n request failed" },
      { status: 200 }
    );
  }

  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No usable payload from n8n. Check N8N_BASE_URL / N8N_API_KEY / N8N_WORKFLOW_ID, and that the workflow has at least one successful execution.",
      },
      { status: 200 }
    );
  }

  const stored = { ...payload, synced_at: new Date().toISOString() };
  const result = await storeSetJSON(KEY_RETENTION, stored);

  return NextResponse.json({
    ok: result.ok,
    ...(result.ok ? { synced_at: stored.synced_at } : { error: result.error }),
    alert_types: Object.keys((payload.alerts_by_type as object) ?? {}),
  });
}
