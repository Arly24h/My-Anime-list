import { useMemo, useRef, useState } from 'react';
import { fetchGraphQL } from '../lib/anilist';
import { toUserMessage } from '../lib/errorhandling';
import { useIncrementalLoader } from '../lib/useIncrementalLoader';
import { useRightAlignedActions } from '../lib/useRightAlignedActions';
import AnimePopover from './AnimePopover';

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
  format?: string | null;
  episodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
};

const QUERY = `
  query TrendingAnime($page: Int!, $perPage: Int!, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage }
      media(type: ANIME, sort: $sort) {
        id
        siteUrl
        title { romaji english native }
        averageScore
        trending
        format
        episodes
        season
        seasonYear
        coverImage { medium large color }
      }
    }
  }
`;

async function fetchPage(
  page: number,
  perPage = 10,
  sort: string[] = ['TRENDING_DESC'],
  signal?: AbortSignal
): Promise<{ items: Anime[]; hasNextPage: boolean }> {
  const data = await fetchGraphQL<{ Page: { pageInfo?: { hasNextPage?: boolean | null } | null; media: Anime[] } }>(
    QUERY,
    { page, perPage, sort },
    { signal }
  );
  const items = data.Page.media ?? [];
  const hasNextPage = !!data.Page.pageInfo?.hasNextPage;
  return { items, hasNextPage };
}

const POPOVER_WIDTH = 240;

export default function TrendingList() {
  const PER_PAGE = 10;
  const MAX_ITEMS = 20;

  const { items, error, loadingInitial: loading, loadingMore, hasMore, showMore, reset } =
    useIncrementalLoader<Anime>((page, perPage, signal) => fetchPage(page, perPage, ['TRENDING_DESC'], signal), {
      perPage: PER_PAGE,
      maxItems: MAX_ITEMS,
      deps: [],
    });

  const { setGridRef, actionsRightGap } = useRightAlignedActions([
    loading,
    error,
    items.length,
  ]);

  const subtitle = useMemo(() => {
    if (loading) return 'Loading trending…';
    if (error) return toUserMessage(error);
    return `Top ${items.length} trending now`;
  }, [loading, error, items.length]);

  return (
    <section className="top-list trending-list" aria-labelledby="trending-heading">
      <div className="container">
        <h2 id="trending-heading">Trending</h2>
        <p className="top-list__subtitle">{subtitle}</p>

        {error && (
          <div className="top-list__error" role="alert">
            {toUserMessage(error)}
            <div className="top-list__actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn-link" onClick={reset} aria-label="Retry loading trending anime">
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <ul className="top-list__grid skeleton">
            {Array.from({ length: 20 }).map((_, index) => (
              <li key={index} className="card" />
            ))}
          </ul>
        ) : (
          <>
            <ol ref={setGridRef} className="top-list__grid">
              {items.map((anime, index) => (
                <TrendingCard key={anime.id} anime={anime} rank={index + 1} />
              ))}
            </ol>
            {hasMore && !error && (
              <div
                className="top-list__actions"
                style={{ marginRight: actionsRightGap, justifyContent: 'flex-end' }}
              >
                <button
                  type="button"
                  className="btn-link"
                  onClick={showMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                >
                  {loadingMore ? 'Loading…' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function TrendingCard({ anime, rank }: { anime: Anime; rank: number }) {
  const title = anime.title.english || anime.title.romaji || anime.title.native || 'Untitled';
  const img = anime.coverImage?.large || anime.coverImage?.medium || '';
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [active, setActive] = useState(false);
  const cardRef = useRef<HTMLLIElement | null>(null);

  function decideSide() {
    const element = cardRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
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
      <a href={`#anime/${anime.id}`} className="card__link">
        <div className="card__media" style={{ backgroundColor: anime.coverImage?.color || '#222' }}>
          {img && <img src={img} alt="" loading="lazy" />}
          <span className="card__rank">#{rank}</span>
        </div>
        <div className="card__body">
          <h3 className="card__title">{title}</h3>
        </div>
        {anime.averageScore != null && (
          <span className="card__score badge">Score {anime.averageScore}</span>
        )}
  {active && <AnimePopover side={side} anime={anime} />}
      </a>
    </li>
  );
}
