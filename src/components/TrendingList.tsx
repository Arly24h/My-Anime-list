import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchGraphQL, getErrorMessage, isAbortError } from '../lib/anilist';

type Title = {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
};

type CoverImage = {
  medium?: string | null;
  large?: string | null;
  color?: string | null;
};

type Anime = {
  id: number;
  siteUrl?: string | null;
  title: Title;
  averageScore?: number | null;
  trending?: number | null;
  coverImage?: CoverImage | null;
};

const QUERY = `
  query TrendingAnime($perPage: Int!, $sort: [MediaSort]) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, sort: $sort) {
        id
        siteUrl
        title { romaji english native }
        averageScore
        trending
        coverImage { medium large color }
      }
    }
  }
`;

export default function TrendingList() {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);
  const gridRef = useRef<HTMLElement | null>(null);
  const setGridRef = (element: HTMLOListElement | HTMLUListElement | null) => {
    gridRef.current = element as unknown as HTMLElement | null;
  };
  const [actionsRightGap, setActionsRightGap] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchGraphQL<{ Page: { media: Anime[] } }>(
          QUERY,
          {
            perPage: 20,
            sort: ['TRENDING_DESC'],
          },
          { signal: controller.signal }
        );
        if (!cancelled) setItems(data.Page.media ?? []);
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        if (!cancelled)
          setError(getErrorMessage(error) || 'Failed to load trending anime.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const measure = () => {
      const children = Array.from(gridElement.children).filter((node) =>
        node.classList.contains('card')
      ) as HTMLElement[];
      if (!children.length) return;
      const limit = expanded ? 20 : 10;
      const visibleCount = Math.min(children.length, limit);
      const visible = children.slice(0, visibleCount);
      const gridRect = gridElement.getBoundingClientRect();
      let maxRight = 0;
      for (const childEl of visible) {
        const rect = childEl.getBoundingClientRect();
        if (rect.right > maxRight) maxRight = rect.right;
      }
      const leftover = Math.max(0, Math.round(gridRect.right - maxRight));
      setActionsRightGap(leftover);
    };

    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [loading, error, expanded, items.length]);

  const subtitle = useMemo(() => {
    if (loading) return 'Loading trending…';
    if (error) return 'Something went wrong';
    return `Top ${items.length} trending now`;
  }, [loading, error, items.length]);

  return (
    <section className="top-list trending-list" aria-labelledby="trending-heading">
      <div className="container">
        <h2 id="trending-heading">Trending</h2>
        <p className="top-list__subtitle">{subtitle}</p>

        {error && (
          <div className="top-list__error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <ul ref={setGridRef} className="top-list__grid skeleton">
            {Array.from({ length: 20 }).map((_, index) => (
              <li key={index} className="card" />
            ))}
          </ul>
        ) : (
          <ol ref={setGridRef} className="top-list__grid">
            {(expanded
              ? items.slice(0, Math.min(20, items.length))
              : items.slice(0, Math.min(10, items.length))
            ).map((anime, index) => {
              const title =
                anime.title.english || anime.title.romaji || anime.title.native || 'Untitled';
              const img = anime.coverImage?.large || anime.coverImage?.medium || '';
              const rank = index + 1;
              return (
                <li key={anime.id} className="card">
                  <a href={`#anime/${anime.id}`} className="card__link">
                    <div
                      className="card__media"
                      style={{ backgroundColor: anime.coverImage?.color || '#222' }}
                    >
                      {img && <img src={img} alt="" loading="lazy" />}
                      <span className="card__rank">#{rank}</span>
                    </div>
                    <div className="card__body">
                      <h3 className="card__title">{title}</h3>
                    </div>
                    {anime.averageScore != null && (
                      <span className="card__score badge">Score {anime.averageScore}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
        )}

        {!loading && !error && items.length > 10 && (
          <div className="top-list__actions" style={{ marginRight: actionsRightGap }}>
            <button
              type="button"
              className="btn-link"
              aria-expanded={expanded}
              onClick={() => setExpanded((isExpanded) => !isExpanded)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
