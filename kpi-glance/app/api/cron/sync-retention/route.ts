import { NextRequest, NextResponse } from "next/server";
import {
  fetchExecutionCounts,
  fetchLatestRetentionSnapshot,
  listRecentExecutions,
  resolveWorkflow,
} from "@/lib/n8n";
import { storeGetJSONFresh, storeSetJSON } from "@/lib/store";
import { KEY_ADOPTION_N8N, KEY_RETENTION } from "@/lib/live-data";
import {
  dayOf,
  KEY_MEMBER_HISTORY,
  MemberPoint,
  mergePoints,
  Series,
} from "@/lib/history";
import { authorizeCron } from "@/lib/cron-auth";
import { recordSyncStatus } from "@/lib/sync-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day via Vercel Cron. The only thing in this project that
 * touches n8n, and it only reads execution history — it never triggers,
 * activates, edits, or re-runs the Retention Watch workflow.
 *
 * Three outputs from one workflow:
 *   - today's alert counts          -> KEY_RETENTION
 *   - today's member-overlap counts -> KEY_ADOPTION_N8N
 *   - a daily history series        -> KEY_MEMBER_HISTORY
 *
 * The history is real, not synthesised: the workflow has been running daily
 * for weeks and n8n keeps each execution, so past days are read back from
 * the archive. Only aggregate counts are persisted — the per-member alerts
 * array and member emails are dropped here and never written to storage.
 */

/**
 * Executions to look back over, and how many missing days to fetch per run.
 * Each detail fetch pulls a multi-megabyte payload, so the per-run budget is
 * capped to stay inside the function timeout; a few consecutive runs (or
 * calls to this route) fill the window in.
 */
const LOOKBACK = 30;
const BACKFILL_PER_RUN = 8;

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  // A total n8n failure means none of the three outputs updated — record all
  // three as failed so the page can flag them rather than showing stale data.
  const failAll = async (error: string) => {
    const at = new Date().toISOString();
    await recordSyncStatus(
      {
        retention: { ok: false, error },
        overlap_n8n: { ok: false, error },
        member_history: { ok: false, error },
      },
      at
    ).catch(() => {});
  };

  let result: Awaited<ReturnType<typeof fetchLatestRetentionSnapshot>>;
  try {
    result = await fetchLatestRetentionSnapshot();
  } catch (err) {
    const error = err instanceof Error ? err.message : "n8n request failed";
    await failAll(error);
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
  if (!result.ok) {
    await failAll(result.error);
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

  written.history = await backfillHistory(snapshot.started_at);

  // Per-source health, so a source that failed inside an otherwise-successful
  // run still surfaces on the page instead of quietly serving stale numbers.
  const status = (v: unknown) =>
    (v as { ok?: boolean; error?: string }) ?? { ok: false, error: "no result" };
  const r = status(written.retention);
  const o = status(written.overlap);
  const h = status(written.history);
  await recordSyncStatus(
    {
      retention: { ok: !!r.ok, error: r.ok ? undefined : r.error },
      overlap_n8n: { ok: !!o.ok, error: o.ok ? undefined : o.error },
      member_history: { ok: !!h.ok, error: h.ok ? undefined : h.error },
    },
    synced_at
  ).catch(() => {});

  return NextResponse.json({
    ok: true,
    execution_id: snapshot.execution_id,
    execution_started_at: snapshot.started_at,
    synced_at,
    ...written,
  });
}

async function backfillHistory(latestStartedAt: string | null) {
  const wf = await resolveWorkflow();
  if (!wf.ok) return { ok: false, error: wf.error };

  const stored = (await storeGetJSONFresh<Series<MemberPoint>>(KEY_MEMBER_HISTORY)) ?? { points: [] };
  const haveDates = new Set(stored.points.map((p) => p.date));

  const executions = await listRecentExecutions(wf.root, wf.apiKey, wf.workflowId, LOOKBACK);

  // One execution per day: the workflow runs daily, and if it ever ran twice
  // the newest wins (the list comes back newest-first).
  const wanted: { id: string; date: string }[] = [];
  const seenDays = new Set<string>();
  for (const ex of executions) {
    const date = dayOf(ex.startedAt);
    if (!date || seenDays.has(date)) continue;
    seenDays.add(date);
    if (haveDates.has(date)) continue;
    wanted.push({ id: ex.id, date });
  }

  const batch = wanted.slice(0, BACKFILL_PER_RUN);
  const fresh: MemberPoint[] = [];
  for (const item of batch) {
    let counts: Awaited<ReturnType<typeof fetchExecutionCounts>> = null;
    try {
      counts = await fetchExecutionCounts(wf.root, wf.apiKey, item.id);
    } catch {
      continue; // one unreadable execution must not abort the backfill
    }
    if (!counts?.overlap || !counts.retention) continue;
    fresh.push({
      date: item.date,
      in_both: counts.overlap.in_both,
      in_zp_not_app: counts.overlap.in_zp_not_app,
      alerts: counts.retention.alerts_by_type,
    });
  }

  if (fresh.length === 0) {
    return {
      ok: true,
      added: 0,
      total: stored.points.length,
      remaining: wanted.length,
      note: latestStartedAt ? "already current" : undefined,
    };
  }

  const merged = mergePoints(stored.points, fresh);
  const write = await storeSetJSON(KEY_MEMBER_HISTORY, {
    points: merged,
    updated_at: new Date().toISOString(),
  });

  return write.ok
    ? {
        ok: true,
        added: fresh.length,
        total: merged.length,
        remaining: Math.max(0, wanted.length - batch.length),
        range: merged.length ? `${merged[0].date} → ${merged[merged.length - 1].date}` : null,
      }
    : { ok: false, error: write.error };
}
