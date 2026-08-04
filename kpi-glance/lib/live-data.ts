import { storeGetJSON } from "./store";

export interface OverlapMember {
  zp_person_id?: string;
  profile_id?: string;
  email?: string;
}

export interface OverlapData {
  in_both: OverlapMember[];
  in_zp_not_app: OverlapMember[];
  in_app_not_zp: OverlapMember[];
  synced_at?: string;
}

export interface RetentionAlertsPayload {
  run_completed_at?: string;
  alert_count?: number;
  alerts_by_type?: Record<string, number>;
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

export const KEY_ADOPTION = "adoption-latest";
export const KEY_RETENTION = "retention-latest";
export const KEY_GROWTH = "growth-outreach-latest";

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// These read whatever the daily crons last wrote. Nothing here calls an
// external API — see app/api/cron/*.
export function fetchLatestOverlap(): Promise<OverlapData | null> {
  return storeGetJSON<OverlapData>(KEY_ADOPTION);
}

export function fetchLatestRetentionPayload(): Promise<RetentionAlertsPayload | null> {
  return storeGetJSON<RetentionAlertsPayload>(KEY_RETENTION);
}

export function fetchLatestGrowthOutreach(): Promise<GrowthOutreachPayload | null> {
  return storeGetJSON<GrowthOutreachPayload>(KEY_GROWTH);
}
