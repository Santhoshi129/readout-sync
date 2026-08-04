import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Read-only diagnostic for the n8n connection.
 *
 * Lists recent executions of the configured workflow and reports the shape
 * of the most recent one — node names and the top-level keys each node
 * produced — so the retention extractor can be pointed at the right node
 * without guessing. It never triggers, edits, or re-runs anything, and it
 * never returns credential values or member-level data.
 */

function nodeJsonByPrefix(
  runData: Record<string, { data?: { main?: { json?: unknown }[][] } }[]>,
  prefix: string
): Record<string, unknown> | null {
  for (const [name, runs] of Object.entries(runData)) {
    if (!name.toLowerCase().startsWith(prefix)) continue;
    for (let i = runs.length - 1; i >= 0; i--) {
      const json = runs[i]?.data?.main?.[0]?.[0]?.json;
      if (json && typeof json === "object") return json as Record<string, unknown>;
    }
  }
  return null;
}

function truncate(v: unknown): unknown {
  if (Array.isArray(v)) return `array(${v.length})`;
  if (v && typeof v === "object") return `object{${Object.keys(v).slice(0, 12).join(",")}}`;
  if (typeof v === "string") return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  return v;
}

export async function GET(req: NextRequest) {
  // Shares the cron guard: once CRON_SECRET is set this endpoint is closed
  // to anyone without it, since it reveals n8n workflow names and structure.
  const denied = authorizeCron(req);
  if (denied) return denied;

  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  // ?workflow=<id> inspects a different workflow than the configured one,
  // for confirming an id before committing it to the env var.
  const workflowId = req.nextUrl.searchParams.get("workflow") || process.env.N8N_WORKFLOW_ID;

  if (!baseUrl || !apiKey || !workflowId) {
    return NextResponse.json({
      ok: false,
      configured: { baseUrl: Boolean(baseUrl), apiKey: Boolean(apiKey), workflowId: Boolean(workflowId) },
    });
  }

  const root = baseUrl.replace(/\/+$/, "");
  const headers = { "X-N8N-API-KEY": apiKey, accept: "application/json" };
  const report: Record<string, unknown> = { base_host: new URL(root).host, workflow_id: workflowId };

  // 0. Every workflow the key can see, so a wrong N8N_WORKFLOW_ID is
  //    obvious and the correct id can be read off directly.
  try {
    const res = await fetch(`${root}/api/v1/workflows?limit=100`, { headers, cache: "no-store" });
    report.all_workflows = res.ok
      ? ((await res.json())?.data ?? []).map((w: { id: string; name: string; active: boolean }) => ({
          id: w.id,
          name: w.name,
          active: w.active,
        }))
      : { status: res.status, body: truncate(await res.text()) };
  } catch (e) {
    report.all_workflows = { error: e instanceof Error ? e.message : String(e) };
  }

  // 1. Does the workflow exist, and what are its nodes called?
  try {
    const wfRes = await fetch(`${root}/api/v1/workflows/${workflowId}`, { headers, cache: "no-store" });
    report.workflow_status = wfRes.status;
    if (wfRes.ok) {
      const wf = await wfRes.json();
      report.workflow_name = wf?.name ?? null;
      report.workflow_active = wf?.active ?? null;
      report.workflow_nodes = (wf?.nodes ?? []).map((nd: { name: string; type: string }) => ({
        name: nd.name,
        type: nd.type,
      }));
    } else {
      report.workflow_body = truncate(await wfRes.text());
    }
  } catch (e) {
    report.workflow_error = e instanceof Error ? e.message : String(e);
  }

  // 2. Recent executions, filtered and unfiltered (some n8n versions reject
  //    the status filter, which would silently look like "no executions").
  for (const [label, qs] of [
    ["executions_success", `workflowId=${workflowId}&status=success&limit=5`],
    ["executions_any", `workflowId=${workflowId}&limit=5`],
  ] as const) {
    try {
      const res = await fetch(`${root}/api/v1/executions?${qs}`, { headers, cache: "no-store" });
      const body = res.ok ? await res.json() : await res.text();
      report[label] = res.ok
        ? {
            status: res.status,
            count: body?.data?.length ?? 0,
            items: (body?.data ?? []).map(
              (x: { id: string; finished: boolean; status?: string; startedAt: string }) => ({
                id: x.id,
                finished: x.finished,
                status: x.status,
                startedAt: x.startedAt,
              })
            ),
          }
        : { status: res.status, body: truncate(body) };
    } catch (e) {
      report[label] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 3. Shape of the newest execution's node output.
  const newest =
    (report.executions_success as { items?: { id: string }[] })?.items?.[0] ??
    (report.executions_any as { items?: { id: string }[] })?.items?.[0];

  if (newest?.id) {
    try {
      const res = await fetch(`${root}/api/v1/executions/${newest.id}?includeData=true`, {
        headers,
        cache: "no-store",
      });
      report.detail_status = res.status;
      if (res.ok) {
        const detail = await res.json();
        const runData = detail?.data?.resultData?.runData ?? {};
        report.execution_id = newest.id;
        report.node_output_shapes = Object.fromEntries(
          Object.entries(runData).map(([nodeName, runs]) => {
            const first = (runs as { data?: { main?: { json?: unknown }[][] } }[])?.[0];
            const json = first?.data?.main?.[0]?.[0]?.json as Record<string, unknown> | undefined;
            if (!json || typeof json !== "object") return [nodeName, null];
            return [
              nodeName,
              Object.fromEntries(Object.entries(json).slice(0, 20).map(([k, v]) => [k, truncate(v)])),
            ];
          })
        );
      } else {
        report.detail_body = truncate(await res.text());
      }
    } catch (e) {
      report.detail_error = e instanceof Error ? e.message : String(e);
    }
  }

  // Are alert types mutually exclusive per member? The KPI layer sums them
  // to get "members flagged", which is only valid if no member appears
  // twice. Verified here rather than assumed. No member data is returned —
  // only counts.
  if (newest?.id) {
    try {
      const res = await fetch(`${root}/api/v1/executions/${newest.id}?includeData=true`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const runData = (await res.json())?.data?.resultData?.runData ?? {};
        const payload = nodeJsonByPrefix(runData, "build batch payload");
        const alerts = (payload?.alerts ?? []) as Record<string, unknown>[];
        const keys = new Set<string>();
        const perMember = new Map<string, number>();
        for (const a of alerts) {
          const k = String(a.profile_id ?? a.zp_person_id ?? a.email ?? Math.random());
          keys.add(k);
          perMember.set(k, (perMember.get(k) ?? 0) + 1);
        }
        const dupes = [...perMember.values()].filter((n) => n > 1).length;
        report.exclusivity_check = {
          alerts_total: alerts.length,
          distinct_members: keys.size,
          members_with_more_than_one_alert: dupes,
          mutually_exclusive: dupes === 0 && keys.size === alerts.length,
        };
      }
    } catch (e) {
      report.exclusivity_check = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
