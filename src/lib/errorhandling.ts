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
  return errorLikeObject.name === 'AbortError' || /aborted/i.test(errorLikeObject.message || '');
}

export function toUserMessage(error: unknown): string {
  if (isAbortError(error)) return '';
  const raw = getErrorMessage(error);
  const msg = raw.toLowerCase();
  if (msg.includes('request timed out') || msg.includes('timeout')) {
    return 'Request timed out — please try again.';
  }
  if (msg.includes('429') || msg.includes('too many')) {
    return 'Too many actions at once — please wait a bit and try again.';
  }
  if (msg.includes('503') || msg.includes('504') || msg.includes('unavailable') || msg.includes('temporar')) {
    return 'Service is busy — please try again later.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('offline')) {
    return 'Network issue — please check your connection and try again.';
  }
  return 'Something went wrong — please try again.';
}
