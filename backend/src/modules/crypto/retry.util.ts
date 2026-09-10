/**
 * Retry policy shared by the two rate-limited providers a sync depends on: the
 * block explorer and the price API.
 *
 * Both are free, anonymous endpoints with a per-minute budget, and both are called
 * from inside an HTTP request, so the policy is the same for each — sleep through a
 * short refusal, give up on a long one and let the next sync continue.
 */

export const MAX_ATTEMPTS = 3;

/**
 * A provider that names a delay longer than this is telling us to come back later,
 * not to wait. Holding a request open for a minute is worse than failing with an
 * error the user can see and retry.
 */
const MAX_RETRY_WAIT_MS = 10_000;
const BACKOFF_MS = [1_000, 4_000];

/** Milliseconds to wait before the next attempt, or null when waiting is pointless. */
export function retryWaitMs(response: Response | null, attempt: number): number | null {
  const retryAfter = Number(response?.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const requested = retryAfter * 1000;
    return requested > MAX_RETRY_WAIT_MS ? null : requested;
  }
  return BACKOFF_MS[attempt] ?? null;
}

/** True when the response is worth asking about again rather than an answer. */
export function isTransient(response: Response | null): boolean {
  return response === null || response.status === 429 || response.status >= 500;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
