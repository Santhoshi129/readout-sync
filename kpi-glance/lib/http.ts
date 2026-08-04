/**
 * fetch with a single retry-with-backoff, for the daily cron routes only.
 *
 * Retries EXACTLY once, and only for transient failures:
 *   - a thrown error (network drop, DNS, or an AbortSignal.timeout firing)
 *   - HTTP 429 (rate limited)
 *   - HTTP 5xx (server-side)
 *
 * It never retries other 4xx responses — an auth/permission error (401/403)
 * or a 404 will not fix itself on a second identical call, so those are
 * returned straight to the caller to handle. The response is returned as-is
 * (ok or not); only thrown/transient cases are retried.
 */

const TRANSIENT_STATUS = (status: number) => status === 429 || status >= 500;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FetchRetryOptions extends RequestInit {
  /** Number of retries after the first attempt. Capped at 1 by design. */
  retries?: number;
  /** Base backoff before the retry, in ms. */
  delayMs?: number;
  /** Optional hard timeout per attempt; a hang becomes a retryable throw. */
  timeoutMs?: number;
}

export async function fetchWithRetry(
  url: string | URL,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const { retries = 1, delayMs = 600, timeoutMs, ...init } = options;
  const maxRetries = Math.min(retries, 1); // one retry, not more

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const signal = timeoutMs ? AbortSignal.timeout(timeoutMs) : init.signal;
      const res = await fetch(url, { ...init, signal });
      // Transient server-side / rate-limit statuses: back off and retry once.
      if (TRANSIENT_STATUS(res.status) && attempt < maxRetries) {
        await sleep(delayMs * (attempt + 1));
        continue;
      }
      // Success, or a non-transient failure (4xx incl. auth) the caller owns.
      return res;
    } catch (err) {
      // Thrown = network error or timeout: transient, so retry once.
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(delayMs * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  // Unreachable in practice; the loop either returns or throws above.
  throw lastError;
}
