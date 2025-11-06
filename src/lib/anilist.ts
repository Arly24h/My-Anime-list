const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const ANILIST_ENDPOINT = metaEnv?.VITE_ANILIST_URL || 'https://graphql.anilist.co';

export type GraphQLError = { message: string };
export type GraphQLResponse<T> = { data?: T; errors?: GraphQLError[] };

export function getErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

export function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const anyE = e as { name?: string; message?: string };
  return anyE.name === 'AbortError' || /aborted/i.test(anyE.message || '');
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(t);
        const err = new DOMException('The operation was aborted.', 'AbortError');
        reject(err);
      };
      if (signal.aborted) onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
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
      const res = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal,
      });
      if (!res.ok) {
        const text = await res.text();
        const retriable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
        if (retriable && attempt < retries) {
          attempt += 1;
          await sleep(300 * attempt, signal);
          continue;
        }
        throw new Error(
          `AniList request failed: ${res.status} ${res.statusText} — ${text.substring(0, 200)}`
        );
      }
      const json = (await res.json()) as GraphQLResponse<T>;
      if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
      if (!json.data) throw new Error('No data returned');
      return json.data;
    } catch (e) {
      if (isAbortError(e)) throw e;
      if (attempt < (init?.retries ?? 2)) {
        attempt += 1;
        await sleep(300 * attempt, signal);
        continue;
      }
      throw e;
    }
  }
}
