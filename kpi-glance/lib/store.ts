import { get, put } from "@vercel/blob";

/**
 * Snapshot storage for the dashboard.
 *
 * The daily cron jobs write one JSON snapshot per data source; the page
 * only ever reads those snapshots. Nothing on a page load touches GHL,
 * the TWU API, or n8n.
 *
 * Backed by Vercel Blob (private access — the store requires the project's
 * BLOB_READ_WRITE_TOKEN to read or write, which Vercel injects
 * automatically for the connected project).
 */

const PREFIX = "kpi";

// A short cache window keeps page loads fast without ever serving a
// snapshot older than a minute past a fresh cron write. The data itself
// only changes once a day, so this costs nothing in accuracy.
const CACHE_SECONDS = 60;

function pathFor(key: string): string {
  return `${PREFIX}/${key.replace(/[^a-zA-Z0-9._-]/g, "-")}.json`;
}

/**
 * Cached read — correct for page loads, where a snapshot at most a minute
 * stale is indistinguishable from fresh.
 */
export async function storeGetJSON<T>(key: string): Promise<T | null> {
  return read<T>(key, true);
}

/**
 * Uncached read. Required for read-modify-write, where a cached copy would
 * silently drop whatever the previous write just added.
 */
export async function storeGetJSONFresh<T>(key: string): Promise<T | null> {
  return read<T>(key, false);
}

async function read<T>(key: string, useCache: boolean): Promise<T | null> {
  try {
    const res = await get(pathFor(key), { access: "private", useCache });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    const text = await new Response(res.stream).text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    // Missing blob, bad token, malformed JSON — all mean "no snapshot",
    // which the UI handles by hiding the section rather than guessing.
    return null;
  }
}

export async function storeSetJSON(
  key: string,
  value: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await put(pathFor(key), JSON.stringify(value), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: CACHE_SECONDS,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
