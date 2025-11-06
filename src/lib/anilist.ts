const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const ANILIST_ENDPOINT = metaEnv?.VITE_ANILIST_URL || 'https://graphql.anilist.co';
const IS_DEV = metaEnv?.MODE !== 'production';
const DEBUG_LIMITER = metaEnv?.VITE_ANILIST_DEBUG === '1';

export type GraphQLError = { message: string };
export type GraphQLResponse<T> = { data?: T; errors?: GraphQLError[] };

const MAX_CONCURRENCY = 2;
let activeRequests = 0;
const waitQueue: Array<() => void> = [];

function acquire(signal?: AbortSignal): Promise<void> | void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }
  if (activeRequests < MAX_CONCURRENCY) {
    activeRequests += 1;
    if (IS_DEV && DEBUG_LIMITER) {
      // eslint-disable-next-line no-console
      console.log('[AniListLimiter] acquire immediate', { activeRequests, queued: waitQueue.length });
    }
    return;
  }
  return new Promise<void>((resolve, reject) => {
    const grant = () => {
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      activeRequests += 1;
      cleanup();
      if (IS_DEV && DEBUG_LIMITER) {
        // eslint-disable-next-line no-console
        console.log('[AniListLimiter] acquire from queue', { activeRequests, queued: waitQueue.length });
      }
      resolve();
    };
    waitQueue.push(grant);

    const onAbort = () => {
      const idx = waitQueue.indexOf(grant);
      if (idx >= 0) waitQueue.splice(idx, 1);
      cleanup();
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

function release() {
  if (activeRequests > 0) activeRequests -= 1;
  if (waitQueue.length > 0 && activeRequests < MAX_CONCURRENCY) {
    const next = waitQueue.shift();
    if (next) next();
  }
  if (IS_DEV && DEBUG_LIMITER) {
    // eslint-disable-next-line no-console
    console.log('[AniListLimiter] release', { activeRequests, queued: waitQueue.length });
  }
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const messageMaybe = (error as { message?: unknown }).message;
    if (typeof messageMaybe === 'string') return messageMaybe;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errorLikeObject = error as { name?: string; message?: string };
  return (
    errorLikeObject.name === 'AbortError' || /aborted/i.test(errorLikeObject.message || '')
  );
}

function sleep(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => resolve(), milliseconds);
    if (signal) {
      const onAbort = () => {
        clearTimeout(timeoutId);
        const abortError = new DOMException('The operation was aborted.', 'AbortError');
        reject(abortError);
      };
      if (signal.aborted) onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue);
  if (!Number.isNaN(seconds)) return Math.max(0, Math.floor(seconds * 1000));
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function backoffDelayMs(attempt: number): number {
  const base = 300 * Math.pow(2, Math.max(0, attempt - 1));
  const jitter = 0.5 + Math.random(); // 0.5..1.5
  const delay = base * jitter;
  return Math.max(200, Math.min(5000, Math.floor(delay)));
}

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  init?: { signal?: AbortSignal; retries?: number }
): Promise<T> {
  const { signal, retries = 2 } = init || {};

  let attempt = 0;
  while (true) {
    try {
      await acquire(signal);
      const response = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      });
      if (!response.ok) {
        const text = await response.text();
        const retriable =
          response.status === 429 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;
        if (retriable && attempt < retries) {
          attempt += 1;
          const retryAfter = parseRetryAfterMs(response.headers.get('Retry-After'));
          const delay = retryAfter != null ? retryAfter : backoffDelayMs(attempt);
          await sleep(delay, signal);
          continue;
        }
        throw new Error(
          `AniList request failed: ${response.status} ${response.statusText} — ${text.substring(0, 200)}`
        );
      }
      const jsonResponse = (await response.json()) as GraphQLResponse<T>;
      if (jsonResponse.errors?.length) {
        const hasTooMany = (jsonResponse.errors as any[]).some(
          (err) => err?.status === 429 || /Too\s*Many\s*Requests/i.test(String(err?.message))
        );
        if (hasTooMany && attempt < retries) {
          attempt += 1;
          const delay = backoffDelayMs(attempt);
          await sleep(delay, signal);
          continue;
        }
        throw new Error(jsonResponse.errors.map((err) => err.message).join('; '));
      }
      if (!jsonResponse.data) throw new Error('No data returned');
      return jsonResponse.data;
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (attempt < (init?.retries ?? 2)) {
        attempt += 1;
        const delay = backoffDelayMs(attempt);
        await sleep(delay, signal);
        continue;
      }
      throw error;
    } finally {
      // Only release if we actually acquired a slot
      if (activeRequests > 0) release();
    }
  }
}
