import { useEffect, useMemo, useRef, useState } from 'react';

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

type AniListResponse = {
  data?: {
    Page: {
      media: Anime[];
    };
  };
  errors?: Array<{ message: string }>;
};

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

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
  const setGridRef = (el: HTMLOListElement | HTMLUListElement | null) => {
    gridRef.current = el as unknown as HTMLElement | null;
  };
  const [actionsRightGap, setActionsRightGap] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(ANILIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query: QUERY, variables: { perPage: 20, sort: ['TRENDING_DESC'] } }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as AniListResponse;
        if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
        if (!cancelled) setItems(json.data?.Page.media ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trending anime.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || error) return;
    const el = gridRef.current;
    if (!el) return;

    const measure = () => {
      const children = Array.from(el.children).filter((n) => n.classList.contains('card')) as HTMLElement[];
      if (!children.length) return;
      const limit = expanded ? 20 : 10;
      const visibleCount = Math.min(children.length, limit);
      const visible = children.slice(0, visibleCount);
      const gridRect = el.getBoundingClientRect();
      let maxRight = 0;
      for (const c of visible) {
        const r = c.getBoundingClientRect();
        if (r.right > maxRight) maxRight = r.right;
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
          <div className="top-list__error" role="alert">{error}</div>
        )}

        {loading ? (
          <ul ref={setGridRef} className="top-list__grid skeleton">
            {Array.from({ length: 20 }).map((_, i) => (
              <li key={i} className="card" />
            ))}
          </ul>
        ) : (
          <ol ref={setGridRef} className="top-list__grid">
            {(expanded ? items.slice(0, Math.min(20, items.length)) : items.slice(0, Math.min(10, items.length))).map((a, idx) => {
              const title = a.title.english || a.title.romaji || a.title.native || 'Untitled';
              const img = a.coverImage?.large || a.coverImage?.medium || '';
              const rank = idx + 1;
              return (
                <li key={a.id} className="card">
                  <a href={a.siteUrl || '#'} target="_blank" rel="noreferrer" className="card__link">
                    <div className="card__media" style={{ backgroundColor: a.coverImage?.color || '#222' }}>
                      {img && <img src={img} alt="" loading="lazy" />}
                      <span className="card__rank">#{rank}</span>
                    </div>
                    <div className="card__body">
                      <h3 className="card__title">{title}</h3>
                    </div>
                    {a.averageScore != null && (
                      <span className="card__score badge">Score {a.averageScore}</span>
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
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
