import { NextRequest, NextResponse } from "next/server";
import { fetchLatestRetentionSnapshot } from "@/lib/n8n";
import { storeSetJSON } from "@/lib/store";
import { KEY_ADOPTION_N8N, KEY_RETENTION } from "@/lib/live-data";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day via Vercel Cron (see vercel.json). The only thing in this
 * project that touches n8n, and it only reads execution history — it never
 * triggers, activates, edits, or re-runs the Retention Watch workflow.
 *
 * One execution yields two snapshots: the alert-type counts, and the
 * member-overlap report the workflow already fetched. Only aggregate
 * counts are written; per-member records are discarded.
 */
export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  let result: Awaited<ReturnType<typeof fetchLatestRetentionSnapshot>>;
  try {
    result = await fetchLatestRetentionSnapshot();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "n8n request failed" },
      { status: 200 }
    );
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  const { snapshot } = result;
  const synced_at = new Date().toISOString();
  const written: Record<string, unknown> = {};

  if (snapshot.retention) {
    const write = await storeSetJSON(KEY_RETENTION, {
      ...snapshot.retention,
      execution_id: snapshot.execution_id,
      synced_at,
    });
    written.retention = write.ok
      ? { ok: true, alert_types: Object.keys(snapshot.retention.alerts_by_type) }
      : { ok: false, error: write.error };
  } else {
    written.retention = { ok: false, error: "No alert payload in the latest execution" };
  }

  if (snapshot.overlap) {
    const write = await storeSetJSON(KEY_ADOPTION_N8N, {
      in_both: snapshot.overlap.in_both,
      in_zp_not_app: snapshot.overlap.in_zp_not_app,
      in_app_not_zp: snapshot.overlap.in_app_not_zp,
      origin: "n8n" as const,
      synced_at,
    });
    written.overlap = write.ok
      ? { ok: true, members: snapshot.overlap.in_both + snapshot.overlap.in_zp_not_app }
      : { ok: false, error: write.error };
  } else {
    written.overlap = { ok: false, error: "No overlap report in the latest execution" };
  }

  return NextResponse.json({
    ok: true,
    execution_id: snapshot.execution_id,
    execution_started_at: snapshot.started_at,
    synced_at,
    ...written,
  });
}
