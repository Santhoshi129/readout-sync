import { storeGetJSON, storeGetJSONFresh, storeSetJSON } from "./store";

/**
 * Per-source sync health, written by the daily cron routes on every run —
 * success OR failure. Without this, a source that quietly fails just keeps
 * serving yesterday's numbers with no signal that it stopped updating; the
 * page reads this to flag any source whose last attempt failed.
 */

export const KEY_SYNC_STATUS = "sync-status";

export interface SourceStatus {
  /** Did the most recent attempt succeed? */
  ok: boolean;
  /** When the most recent attempt ran (success or failure). */
  last_attempt_at: string;
  /** When this source last succeeded — unchanged by a later failure. */
  last_success_at: string | null;
  /** Reason for the most recent failure, if it failed. */
  error?: string;
}

export type SyncStatusMap = Record<string, SourceStatus>;

/** Human labels for the stored source keys, for display on the page. */
export const SOURCE_LABELS: Record<string, string> = {
  growth_outreach: "Pipeline & Outreach (GHL)",
  adoption_twu: "Product Usage (TWU API)",
  retention: "Member Health alerts (Retention Watch)",
  overlap_n8n: "Member overlap (Retention Watch)",
  member_history: "Member history backfill",
};

/**
 * Merge the given per-source outcomes into the stored status map. Uses a
 * fresh (uncached) read so concurrent writes in the same run don't clobber
 * each other's last_success_at.
 */
export async function recordSyncStatus(
  outcomes: Record<string, { ok: boolean; error?: string }>,
  at: string
): Promise<void> {
  const existing = (await storeGetJSONFresh<SyncStatusMap>(KEY_SYNC_STATUS)) ?? {};
  for (const [source, r] of Object.entries(outcomes)) {
    const prev = existing[source];
    existing[source] = {
      ok: r.ok,
      last_attempt_at: at,
      last_success_at: r.ok ? at : prev?.last_success_at ?? null,
      ...(r.ok ? {} : { error: r.error ?? "unknown error" }),
    };
  }
  await storeSetJSON(KEY_SYNC_STATUS, existing);
}

export function fetchSyncStatus(): Promise<SyncStatusMap | null> {
  return storeGetJSON<SyncStatusMap>(KEY_SYNC_STATUS);
}
