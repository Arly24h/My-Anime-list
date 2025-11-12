const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const ANILIST_ENDPOINT = metaEnv?.VITE_ANILIST_URL || 'https://graphql.anilist.co';
const IS_DEV = metaEnv?.MODE !== 'production';
const DEBUG_LIMITER = metaEnv?.VITE_ANILIST_DEBUG === '1';
export const ANILIST_TIMEOUT_MS = metaEnv?.VITE_ANILIST_TIMEOUT_MS
  ? Number(metaEnv.VITE_ANILIST_TIMEOUT_MS)
  : undefined;

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
    console.log('[AniListLimiter] release', { activeRequests, queued: waitQueue.length });
  }
}

import { getErrorMessage, isAbortError, toUserMessage } from './errorhandling';
export { getErrorMessage, isAbortError, toUserMessage };

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

type FetchOptions = { signal?: AbortSignal; retries?: number; timeoutMs?: number };

function createTimeoutSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (parent) parent.addEventListener('abort', onAbort, { once: true });
  const cleanup = () => {
    clearTimeout(timer);
    if (parent) parent.removeEventListener('abort', onAbort);
  };
  return { signal: controller.signal, cleanup, timedOut: () => timedOut };
}

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  init?: FetchOptions
): Promise<T> {
  const { signal: externalSignal, retries = 2, timeoutMs = ANILIST_TIMEOUT_MS ?? 10000 } = init || {};
  const timeoutWrapper =
    typeof timeoutMs === 'number' && timeoutMs > 0
      ? createTimeoutSignal(externalSignal, timeoutMs)
      : null;
  const signal = timeoutWrapper ? timeoutWrapper.signal : externalSignal;

  let attempt = 0;
  while (true) {
    let acquired = false;
    try {
      await acquire(signal);
      acquired = true;
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
      if (isAbortError(error)) {
        if (timeoutWrapper && timeoutWrapper.timedOut()) {
          throw new Error('Request timed out');
        }
        throw error;
      }
      if (attempt < (init?.retries ?? 2)) {
        attempt += 1;
        const delay = backoffDelayMs(attempt);
        await sleep(delay, signal);
        continue;
      }
      throw error;
    } finally {
      if (acquired) release();
      if (timeoutWrapper) timeoutWrapper.cleanup();
    }
  }
}
