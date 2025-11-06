import { useEffect, useRef, useState } from 'react';

export type PageLoader<T> = (
  page: number,
  perPage: number,
  signal: AbortSignal
) => Promise<T[]>;

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

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadFirst() {
      setLoadingInitial(true);
      setError(null);
      setEnded(false);
      inFlight.current = true;
      try {
        const data = await loader(initialPage, perPage, controller.signal);
        if (cancelled) return;
        setItems(maxItems != null ? data.slice(0, maxItems) : data);
        setPage(initialPage + 1);
        if (data.length < perPage) setEnded(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
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
  }, deps);

  async function showMore() {
    if (loadingMore || loadingInitial || inFlight.current) return;
    if (ended) return;
    if (maxItems != null && items.length >= maxItems) return;
    const controller = new AbortController();
    setLoadingMore(true);
    inFlight.current = true;
    const pageToLoad = page;
    try {
      const data = await loader(pageToLoad, perPage, controller.signal);
      let next = items.concat(data);
      if (maxItems != null) next = next.slice(0, maxItems);
      setItems(next);
      setPage(pageToLoad + 1);
      if (data.length < perPage) setEnded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
