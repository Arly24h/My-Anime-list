const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
export const ANILIST_ENDPOINT = metaEnv?.VITE_ANILIST_URL || 'https://graphql.anilist.co';

export type GraphQLError = { message: string };
export type GraphQLResponse<T> = { data?: T; errors?: GraphQLError[] };

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

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  init?: { signal?: AbortSignal; retries?: number }
): Promise<T> {
  const { signal, retries = 2 } = init || {};

  let attempt = 0;
  while (true) {
    try {
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
          await sleep(300 * attempt, signal);
          continue;
        }
        throw new Error(
          `AniList request failed: ${response.status} ${response.statusText} — ${text.substring(0, 200)}`
        );
      }
      const jsonResponse = (await response.json()) as GraphQLResponse<T>;
      if (jsonResponse.errors?.length)
        throw new Error(jsonResponse.errors.map((err) => err.message).join('; '));
      if (!jsonResponse.data) throw new Error('No data returned');
      return jsonResponse.data;
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (attempt < (init?.retries ?? 2)) {
        attempt += 1;
        await sleep(300 * attempt, signal);
        continue;
      }
      throw error;
    }
  }
}
