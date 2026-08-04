/**
 * Read-only n8n Cloud client.
 *
 * Called once a day by app/api/cron/sync-retention — never on a page load.
 * It only ever LISTS and READS execution history of the Retention Watch
 * workflow. It never triggers, activates, edits, or re-runs anything, and
 * the live workflow is not modified in any way.
 *
 * Env vars (on the Vercel project):
 *   N8N_BASE_URL     https://trainwithus.app.n8n.cloud
 *   N8N_API_KEY      read-only API key from n8n Settings -> API
 *   N8N_WORKFLOW_ID  XxqXDqbj6jzEdtTa  ("TWU - Retention Watch (Alerting)")
 *
 * Two useful things come out of a single execution, so one daily call
 * covers both:
 *   "Build Batch Payload*"        -> alert_count + alerts_by_type
 *   "Get Member Overlap Report*"  -> in_both / in_zp_not_app / in_app_not_zp
 *
 * Only aggregate counts are returned. The execution also contains a
 * per-member alerts array and member emails; those are deliberately
 * dropped here and never written to storage.
 */

export interface RetentionCounts {
  run_completed_at: string | null;
  alert_count: number;
  alerts_by_type: Record<string, number>;
}

export interface OverlapCounts {
  in_both: number;
  in_zp_not_app: number;
  in_app_not_zp: number;
  generated_at: string | null;
}

export interface N8nSnapshot {
  execution_id: string | null;
  started_at: string | null;
  retention: RetentionCounts | null;
  overlap: OverlapCounts | null;
}

type RunData = Record<string, { data?: { main?: { json?: unknown }[][] } }[]>;

function nodeJson(runData: RunData, predicate: (name: string) => boolean): Record<string, unknown> | null {
  for (const [name, runs] of Object.entries(runData)) {
    if (!predicate(name)) continue;
    // Later runs of a node overwrite earlier ones, so walk backwards for
    // the final state rather than the first pass.
    for (let i = runs.length - 1; i >= 0; i--) {
      const json = runs[i]?.data?.main?.[0]?.[0]?.json;
      if (json && typeof json === "object") return json as Record<string, unknown>;
    }
  }
  return null;
}

function toCountMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(num)) out[k] = num;
  }
  return out;
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

export async function fetchLatestRetentionSnapshot(): Promise<
  { ok: true; snapshot: N8nSnapshot } | { ok: false; error: string }
> {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  const workflowId = process.env.N8N_WORKFLOW_ID;
  if (!baseUrl || !apiKey || !workflowId) {
    return { ok: false, error: "N8N_BASE_URL / N8N_API_KEY / N8N_WORKFLOW_ID not all set" };
  }

  const root = baseUrl.replace(/\/+$/, "");
  const headers = { "X-N8N-API-KEY": apiKey, accept: "application/json" };

  // 0. Confirm the configured id resolves. A single mistyped character in
  //    N8N_WORKFLOW_ID previously pointed this at a workflow that didn't
  //    exist, which surfaced only as "no data". If the id 404s, fall back to
  //    finding the Retention Watch workflow by name.
  let activeId = workflowId;
  const probe = await fetch(`${root}/api/v1/workflows/${encodeURIComponent(workflowId)}`, {
    headers,
    cache: "no-store",
  });
  if (probe.status === 404) {
    const listAll = await fetch(`${root}/api/v1/workflows?limit=250`, { headers, cache: "no-store" });
    if (!listAll.ok) {
      return { ok: false, error: `Workflow ${workflowId} not found and workflow list returned ${listAll.status}` };
    }
    const all = ((await listAll.json())?.data ?? []) as { id: string; name: string }[];
    const match = all.find((w) => /retention\s*watch/i.test(w.name));
    if (!match) {
      return { ok: false, error: `Workflow ${workflowId} not found, and no workflow name matched "Retention Watch"` };
    }
    activeId = match.id;
  } else if (!probe.ok) {
    return { ok: false, error: `n8n workflow lookup returned ${probe.status}` };
  }

  // 1. Newest successful run. Deliberately no includeData here — cheap call.
  const listRes = await fetch(
    `${root}/api/v1/executions?workflowId=${encodeURIComponent(activeId)}&status=success&limit=1`,
    { headers, cache: "no-store" }
  );
  if (!listRes.ok) {
    return { ok: false, error: `n8n executions list returned ${listRes.status}` };
  }
  const latest = (await listRes.json())?.data?.[0] as
    | { id: string; startedAt: string }
    | undefined;
  if (!latest?.id) {
    return { ok: false, error: `No successful executions found for workflow ${activeId}` };
  }

  // 2. That one execution's data.
  const detailRes = await fetch(`${root}/api/v1/executions/${latest.id}?includeData=true`, {
    headers,
    cache: "no-store",
  });
  if (!detailRes.ok) {
    return { ok: false, error: `n8n execution ${latest.id} returned ${detailRes.status}` };
  }
  const runData: RunData = (await detailRes.json())?.data?.resultData?.runData ?? {};

  // 3a. Alert summary. Matched on a name prefix so a renamed/renumbered node
  //     still resolves, with a shape-based fallback if the name changes entirely.
  const payload =
    nodeJson(runData, (nm) => nm.toLowerCase().startsWith("build batch payload")) ??
    (() => {
      for (const [, runs] of Object.entries(runData)) {
        for (let i = runs.length - 1; i >= 0; i--) {
          const json = runs[i]?.data?.main?.[0]?.[0]?.json as Record<string, unknown> | undefined;
          if (json && typeof json === "object" && "alerts_by_type" in json) return json;
        }
      }
      return null;
    })();

  const retention: RetentionCounts | null = payload
    ? {
        run_completed_at: (payload.run_completed_at as string) ?? latest.startedAt ?? null,
        alert_count: Number(payload.alert_count) || len(payload.alerts),
        alerts_by_type: toCountMap(payload.alerts_by_type),
      }
    : null;

  // 3b. Member overlap, from the same execution — the workflow already calls
  //     the TWU API, so this needs no separate token.
  const overlapNode = nodeJson(runData, (nm) =>
    nm.toLowerCase().startsWith("get member overlap report")
  );
  const od = (overlapNode?.data ?? null) as Record<string, unknown> | null;
  const overlap: OverlapCounts | null =
    od && Array.isArray(od.in_both)
      ? {
          in_both: len(od.in_both),
          in_zp_not_app: len(od.in_zp_not_app),
          in_app_not_zp: len(od.in_app_not_zp),
          generated_at:
            ((overlapNode?.meta as Record<string, unknown> | undefined)?.generated_at as string) ??
            null,
        }
      : null;

  if (!retention && !overlap) {
    return {
      ok: false,
      error: `Execution ${latest.id} contained neither an alert payload nor an overlap report`,
    };
  }

  return {
    ok: true,
    snapshot: {
      execution_id: latest.id,
      started_at: latest.startedAt ?? null,
      retention,
      overlap,
    },
  };
}
