import { useEffect, useRef, useState } from 'react';
import { toUserMessage } from './errorhandling';

export type PageData<T> = { items: T[]; hasNextPage: boolean };
export type PageLoader<T> = (
  page: number,
  perPage: number,
  signal: AbortSignal
) => Promise<PageData<T>>;

type Options = {
  initialPage?: number;
  perPage?: number;
  maxItems?: number;
  deps?: unknown[];
};

export function useIncrementalLoader<T>(
  loader: PageLoader<T>,
  { initialPage = 1, perPage = 10, maxItems, deps = [] }: Options = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [ended, setEnded] = useState(false);
  const inFlight = useRef(false);
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadFirst() {
      setLoadingInitial(true);
      setError(null);
      setEnded(false);
      inFlight.current = true;
      try {
        const pageData = await loader(initialPage, perPage, controller.signal);
        if (cancelled) return;
        const initialItems = maxItems != null ? pageData.items.slice(0, maxItems) : pageData.items;
        setItems(initialItems);
        setPage(initialPage + 1);
        if (!pageData.hasNextPage || (maxItems != null && initialItems.length >= maxItems)) {
          setEnded(true);
        }
      } catch (e) {
        if (cancelled) return;
        setError(toUserMessage(e));
      } finally {
        inFlight.current = false;
        if (!cancelled) setLoadingInitial(false);
      }
    }
    loadFirst();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [...deps, resetTick]);

  async function showMore() {
    if (loadingMore || loadingInitial || inFlight.current) return;
    if (ended) return;
    if (maxItems != null && items.length >= maxItems) return;
    const controller = new AbortController();
    setLoadingMore(true);
    inFlight.current = true;
    const pageToLoad = page;
    try {
      const pageData = await loader(pageToLoad, perPage, controller.signal);
      let next = items.concat(pageData.items);
      if (maxItems != null) next = next.slice(0, maxItems);
      setItems(next);
      setPage(pageToLoad + 1);
      if (!pageData.hasNextPage || (maxItems != null && next.length >= maxItems)) {
        setEnded(true);
      }
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      inFlight.current = false;
      setLoadingMore(false);
    }
  }

  function reset() {
    setItems([]);
    setError(null);
    setLoadingInitial(true);
    setLoadingMore(false);
    setPage(initialPage);
    setEnded(false);
    setResetTick((t) => t + 1);
  }

  const hasMore = !ended && (maxItems == null || items.length < maxItems);

  return {
    items,
    error,
    loadingInitial,
    loadingMore,
    hasMore,
    showMore,
    reset,
  } as const;
}
