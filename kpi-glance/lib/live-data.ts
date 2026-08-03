export interface OverlapMember {
  zp_person_id?: string;
  profile_id?: string;
  email?: string;
}

export interface OverlapData {
  in_both: OverlapMember[];
  in_zp_not_app: OverlapMember[];
  in_app_not_zp: OverlapMember[];
}

export interface RetentionAlertsPayload {
  run_completed_at: string;
  alert_count: number;
  alerts_by_type: Record<string, number>;
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

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// All three of these just read whatever the daily crons last wrote to KV.
// Nothing here calls an external API directly — see app/api/cron/*.
export async function fetchLatestOverlap(): Promise<OverlapData | null> {
  const { kvGetJSON } = await import("./kv");
  return kvGetJSON<OverlapData>("adoption:latest");
}

export async function fetchLatestRetentionPayload(): Promise<RetentionAlertsPayload | null> {
  const { kvGetJSON } = await import("./kv");
  return kvGetJSON<RetentionAlertsPayload>("retention:latest");
}

export async function fetchLatestGrowthOutreach(): Promise<GrowthOutreachPayload | null> {
  const { kvGetJSON } = await import("./kv");
  return kvGetJSON<GrowthOutreachPayload>("growth-outreach:latest");
}
