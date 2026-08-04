import { NextResponse } from "next/server";
import {
  fetchLatestGrowthOutreach,
  fetchLatestOverlap,
  fetchLatestRetentionPayload,
} from "@/lib/live-data";
import { hoursSince } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Operational health check. Reports which snapshots exist and how old they
 * are, plus whether each required credential is configured — presence only,
 * never a value.
 */
export async function GET() {
  const [overlap, retention, growth] = await Promise.all([
    fetchLatestOverlap(),
    fetchLatestRetentionPayload(),
    fetchLatestGrowthOutreach(),
  ]);

  const describe = (present: boolean, syncedAt?: string | null) => ({
    snapshot: present,
    synced_at: syncedAt ?? null,
    age_hours: syncedAt ? Math.round((hoursSince(syncedAt) ?? 0) * 10) / 10 : null,
  });

  return NextResponse.json({
    ok: true,
    checked_at: new Date().toISOString(),
    sources: {
      product_usage: {
        ...describe(overlap !== null, overlap?.synced_at),
        origin: overlap?.origin ?? null,
        members: overlap ? overlap.in_both + overlap.in_zp_not_app : null,
      },
      member_health: {
        ...describe(retention !== null, retention?.synced_at),
        alert_types: Object.keys(retention?.alerts_by_type ?? {}),
        alert_count: retention?.alert_count ?? null,
      },
      pipeline_outreach: describe(growth !== null, growth?.synced_at),
    },
    config: {
      blob_store: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      twu_api_token: Boolean(process.env.TWU_API_TOKEN),
      n8n_base_url: Boolean(process.env.N8N_BASE_URL),
      n8n_api_key: Boolean(process.env.N8N_API_KEY),
      n8n_workflow_id: Boolean(process.env.N8N_WORKFLOW_ID),
      cron_secret: Boolean(process.env.CRON_SECRET),
    },
  });
}
