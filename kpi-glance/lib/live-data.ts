import { storeGetJSON } from "./store";

/**
 * Only aggregate counts are ever stored. Member-level records (names,
 * emails, ZenPlanner ids) are dropped at sync time and never persisted.
 */

export interface OverlapSnapshot {
  in_both: number;
  in_zp_not_app: number;
  in_app_not_zp: number;
  /** Which path produced this: the TWU API directly, or the n8n execution. */
  origin: "twu-api" | "n8n";
  synced_at?: string;
}

export interface RetentionSnapshot {
  run_completed_at?: string | null;
  alert_count?: number;
  alerts_by_type?: Record<string, number>;
  execution_id?: string | null;
  synced_at?: string;
}

export interface GrowthOutreachPayload {
  total_contacts: number;
  hot_leads: number;
  warm_leads: number;
  email_sent: number;
  email_replied: number;
  interested: number;
  sequence_complete: number;
  sequence_stopped: number;
  ig_sent_total: number;
  ig_replies: number;
  email_reply_rate_pct: number;
  ig_reply_rate_pct: number;
  interested_rate_pct: number;
  hot_lead_share_pct: number;
  sequence_complete_rate_pct: number;
  synced_at?: string;
}

export const KEY_ADOPTION = "adoption-latest"; // written by the TWU API path
export const KEY_ADOPTION_N8N = "adoption-n8n-latest"; // written by the n8n path
export const KEY_RETENTION = "retention-latest";
export const KEY_GROWTH = "growth-outreach-latest";

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// These read whatever the daily crons last wrote. Nothing here calls an
// external API — see app/api/cron/*.

/**
 * Prefers the direct TWU API snapshot; falls back to the copy the Retention
 * Watch execution already contains, so App Adoption works whether or not
 * TWU_API_TOKEN is configured.
 */
export async function fetchLatestOverlap(): Promise<OverlapSnapshot | null> {
  const direct = await storeGetJSON<OverlapSnapshot>(KEY_ADOPTION);
  if (direct && direct.in_both + direct.in_zp_not_app > 0) return direct;
  return storeGetJSON<OverlapSnapshot>(KEY_ADOPTION_N8N);
}

export function fetchLatestRetentionPayload(): Promise<RetentionSnapshot | null> {
  return storeGetJSON<RetentionSnapshot>(KEY_RETENTION);
}

export function fetchLatestGrowthOutreach(): Promise<GrowthOutreachPayload | null> {
  return storeGetJSON<GrowthOutreachPayload>(KEY_GROWTH);
}
