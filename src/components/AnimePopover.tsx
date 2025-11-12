type Title = {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
};

type AnimeLike = {
  title: Title;
  format?: string | null;
  episodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
};

export function AnimePopover({
  anime,
  side,
}: {
  anime: AnimeLike;
  side: 'right' | 'left';
}) {
  const subtitle = anime.title.native || anime.title.romaji;
  const hasAnyMeta = Boolean(
    anime.format || anime.episodes != null || anime.season || anime.seasonYear
  );

  return (
    <div className={`card__popover side-${side}`} aria-hidden="true">
      <div className="card__popover-inner">
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
        {hasAnyMeta && (
          <div className="card__hover-meta">
            {anime.format && <span className="chip">{anime.format}</span>}
            {anime.episodes != null && <span className="chip">{anime.episodes} eps</span>}
            {(anime.season || anime.seasonYear) && (
              <span className="chip">
                {anime.season ? anime.season : ''}
                {anime.season && anime.seasonYear ? ' ' : ''}
                {anime.seasonYear ? anime.seasonYear : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnimePopover;
