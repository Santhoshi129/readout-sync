/**
 * Daily history series, so every KPI can be read as a trend rather than a
 * bare number.
 *
 * Member Health and Product Usage history is genuinely backfilled from
 * n8n's execution archive — the Retention Watch workflow has been running
 * daily for weeks, and each stored execution carries that day's alert
 * counts and overlap report. Nothing here is interpolated or invented.
 *
 * Pipeline/Outreach history starts accumulating the first day the cron
 * runs; GHL exposes current tag state only, with no archive to backfill
 * from. A sparkline is simply not drawn until there are two real points.
 */

export interface MemberPoint {
  date: string; // YYYY-MM-DD, the day the workflow ran
  in_both: number;
  in_zp_not_app: number;
  alerts: Record<string, number>;
}

export interface GrowthPoint {
  date: string;
  interested_rate_pct: number;
  hot_lead_share_pct: number;
  sequence_complete_rate_pct: number;
  email_reply_rate_pct: number;
  ig_reply_rate_pct: number;
  total_contacts: number;
}

export interface Series<T> {
  points: T[];
  updated_at?: string;
}

export const KEY_MEMBER_HISTORY = "history-member";
export const KEY_GROWTH_HISTORY = "history-growth";

/** Keep a quarter of history — enough for any trend the page draws. */
export const MAX_POINTS = 90;

export function dayOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Merge new points in by date, newest last. A repeated date replaces the
 * earlier entry rather than duplicating it, so re-running a sync is safe.
 */
export function mergePoints<T extends { date: string }>(existing: T[], incoming: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const p of existing) byDate.set(p.date, p);
  for (const p of incoming) byDate.set(p.date, p);
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_POINTS);
}

/** Values for one metric across the series, oldest → newest. */
export function seriesOf<T>(points: T[], pick: (p: T) => number | null): number[] {
  return points.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

/**
 * Change between the first and last point of a series, in percentage
 * points for rates. Null when there aren't two points to compare.
 */
export function deltaOf(values: number[]): number | null {
  if (values.length < 2) return null;
  return Math.round((values[values.length - 1] - values[0]) * 10) / 10;
}
