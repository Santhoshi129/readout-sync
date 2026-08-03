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

/**
 * Calls the same /community/member-overlap endpoint Retention Watch's
 * "Get Member Overlap Report" node already calls. Requires TWU_API_TOKEN
 * to be set in Vercel's Environment Variables (Settings -> Environments) —
 * use the same Bearer token from that n8n node's Authorization header.
 *
 * Returns null (never throws) if the token isn't set or the call fails, so
 * the UI can cleanly fall back to sample data instead of crashing the page.
 */
export async function fetchMemberOverlap(): Promise<OverlapData | null> {
  const token = process.env.TWU_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch("https://dashboard.trainwithus.app/api/v1/community/member-overlap", {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 }, // 5 min cache, matches Retention Watch's own daily cadence closely enough
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface RetentionAlertsPayload {
  run_completed_at: string;
  alert_count: number;
  alerts_by_type: Record<string, number>;
  received_at?: string;
}

/**
 * Reads back whatever Retention Watch's daily run most recently POSTed
 * to /api/retention-webhook. Returns null if nothing has landed yet
 * (workflow not repointed, or MONGODB_URI not set).
 */
export async function fetchLatestRetentionPayload(): Promise<RetentionAlertsPayload | null> {
  try {
    const { getDb } = await import("./mongo");
    const db = await getDb();
    if (!db) return null;
    const doc = await db.collection("retention_watch").findOne({ _id: "latest" as never });
    if (!doc) return null;
    return doc as unknown as RetentionAlertsPayload;
  } catch {
    return null;
  }
}
