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
  popularity?: number | null;
  coverImage?: CoverImage | null;
  format?: string | null;
  episodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
};

type PageInfo = {
  total?: number | null;
  perPage?: number | null;
  currentPage?: number | null;
  lastPage?: number | null;
  hasNextPage?: boolean | null;
};

type AniListPage = {
  pageInfo: PageInfo;
  media: Anime[];
};

const QUERY = `
  query TopAnime($page: Int!, $perPage: Int!, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total perPage currentPage lastPage hasNextPage }
      media(type: ANIME, sort: $sort) {
        id
        siteUrl
        title { romaji english native }
        averageScore
        popularity
        coverImage { medium large color }
        format
        episodes
        season
        seasonYear
      }
    }
  }
`;

async function fetchPage(
  page: number,
  perPage = 50,
  sort: string[] = ['SCORE_DESC'],
  signal?: AbortSignal
): Promise<Anime[]> {
  const data = await fetchGraphQL<{ Page: AniListPage }>(
    QUERY,
    { page, perPage, sort },
    { signal }
  );
  return data.Page.media ?? [];
}

export default function TopAnimeList() {
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [p1, p2] = await Promise.all([
          fetchPage(1, 50, ['SCORE_DESC'], controller.signal),
          fetchPage(2, 50, ['SCORE_DESC'], controller.signal),
        ]);
        if (!cancelled) {
          setItems([...p1, ...p2]);
        }
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        if (!cancelled) setError(getErrorMessage(e) || 'Failed to load top anime.');
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

  const subtitle = useMemo(() => {
    if (loading) return 'Loading top 100…';
    if (error) return 'Something went wrong';
    return `Top ${items.length} by score`;
  }, [loading, error, items.length]);

  return (
    <section className="top-list" aria-labelledby="top-anime-heading">
      <div className="container">
        <h2 id="top-anime-heading">Top Anime</h2>
        <p className="top-list__subtitle">{subtitle}</p>

        {error && (
          <div className="top-list__error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <ul className="top-list__grid skeleton">
            {Array.from({ length: 12 }).map((_, i) => (
              <li key={i} className="card" />
            ))}
          </ul>
        ) : (
          <ol className="top-list__grid">
            {items.map((a, idx) => (
              <AnimeCard key={a.id} anime={a} rank={idx + 1} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const POPOVER_WIDTH = 240;

function AnimeCard({ anime: a, rank }: { anime: Anime; rank: number }) {
  const title = a.title.english || a.title.romaji || a.title.native || 'Untitled';
  const img = a.coverImage?.large || a.coverImage?.medium || '';
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [active, setActive] = useState(false);
  const cardRef = useRef<HTMLLIElement | null>(null);

  function decideSide() {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    setSide(spaceRight >= POPOVER_WIDTH + 12 ? 'right' : 'left');
  }

  return (
    <li
      ref={cardRef}
      className={`card pos-${side}`}
      onMouseEnter={() => {
        decideSide();
        setActive(true);
      }}
      onMouseLeave={() => setActive(false)}
      onFocus={() => {
        decideSide();
        setActive(true);
      }}
      onBlur={() => setActive(false)}
    >
      <a href={`#anime/${a.id}`} className="card__link">
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
        {active && (
          <div className={`card__popover side-${side}`} aria-hidden="true">
            <div className="card__popover-inner">
              {(a.title.native || a.title.romaji) && (
                <p className="card__subtitle">{a.title.native || a.title.romaji}</p>
              )}
              <div className="card__hover-meta">
                {a.popularity != null && <span className="chip">Pop {a.popularity}</span>}
                {a.format && <span className="chip">{a.format}</span>}
                {a.episodes != null && <span className="chip">{a.episodes} eps</span>}
                {(a.season || a.seasonYear) && (
                  <span className="chip">
                    {a.season ? a.season : ''}
                    {a.season && a.seasonYear ? ' ' : ''}
                    {a.seasonYear ? a.seasonYear : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </a>
    </li>
  );
}
