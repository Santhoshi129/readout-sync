/**
 * Read-only n8n Cloud API client. Only ever called once a day by the
 * cron job in app/api/cron/sync-retention — never on a live page load,
 * and never anything that triggers, modifies, or re-runs a workflow.
 *
 * Needs three env vars in Vercel:
 *   N8N_BASE_URL     e.g. https://trainwithus.app.n8n.cloud
 *   N8N_API_KEY      the read-only API key from n8n Settings -> API
 *   N8N_WORKFLOW_ID  the receiver workflow's ID (from its editor URL)
 */

interface N8nExecutionSummary {
  id: string;
  finished: boolean;
  startedAt: string;
}

export async function fetchLatestWebhookPayload(): Promise<Record<string, unknown> | null> {
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  const workflowId = process.env.N8N_WORKFLOW_ID;
  if (!baseUrl || !apiKey || !workflowId) return null;

  const headers = { "X-N8N-API-KEY": apiKey };

  // Step 1: find the most recent finished execution for this workflow.
  // Deliberately NOT requesting includeData here — keeps this call cheap.
  const listRes = await fetch(
    `${baseUrl}/api/v1/executions?workflowId=${workflowId}&status=success&limit=1`,
    { headers, cache: "no-store" }
  );
  if (!listRes.ok) return null;
  const listJson = await listRes.json();
  const latest: N8nExecutionSummary | undefined = listJson?.data?.[0];
  if (!latest) return null;

  // Step 2: fetch that one execution's full data.
  const detailRes = await fetch(`${baseUrl}/api/v1/executions/${latest.id}?includeData=true`, {
    headers,
    cache: "no-store",
  });
  if (!detailRes.ok) return null;
  const detail = await detailRes.json();

  // The Webhook node's output holds the POSTed body. n8n wraps the raw
  // POST body under .body by default for a webhook trigger node.
  const webhookOutput =
    detail?.data?.resultData?.runData?.Webhook?.[0]?.data?.main?.[0]?.[0]?.json;
  if (!webhookOutput) return null;

  return webhookOutput.body ?? webhookOutput;
}
