import { useEffect, useMemo, useState } from 'react';
import { fetchGraphQL, getErrorMessage, isAbortError } from '../lib/anilist';
import './AnimePage.css';
 

export type MediaTitle = {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
  userPreferred?: string | null;
};

export type FuzzyDate = { 
    year?: number | null; 
    month?: number | null; 
    day?: number | null 
};

export type Image = {
  medium?: string | null;
  large?: string | null;
  extraLarge?: string | null;
  color?: string | null;
};

export type StudioNode = { 
    id: number; 
    name: string; 
    siteUrl?: string | null 
};

export type StudioConnection = { 
    edges: { isMain?: boolean | null }[]; 
    nodes: StudioNode[] 
};

export type CharacterNode = {
  id: number;
  siteUrl?: string | null;
  name: { full?: string | null; native?: string | null };
  image?: { medium?: string | null; large?: string | null } | null;
};

export type CharacterEdge = {
  role?: string | null;
};

export type RelationNode = {
  id: number;
  title: MediaTitle;
  format?: string | null;
  coverImage?: Image | null;
};

export type Ranking = {
  rank: number;
  type?: string | null;
  year?: number | null;
  season?: string | null;
  allTime?: boolean | null;
  context?: string | null;
};

export type Media = {
  id: number;
  siteUrl?: string | null;
  title: MediaTitle;
  synonyms?: string[] | null;
  description?: string | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  duration?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  startDate?: FuzzyDate | null;
  endDate?: FuzzyDate | null;
  source?: string | null;
  countryOfOrigin?: string | null;
  isAdult?: boolean | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  coverImage?: Image | null;
  bannerImage?: string | null;
  genres?: string[] | null;
  tags?:
    | {
        name: string;
        rank?: number | null;
        isGeneralSpoiler?: boolean | null;
        isMediaSpoiler?: boolean | null;
      }[]
    | null;
  studios?: StudioConnection | null;
  trailer?: { id?: string | null; site?: string | null; thumbnail?: string | null } | null;
  relations?: { edges: { relationType?: string | null }[]; nodes: RelationNode[] } | null;
  characters?: { edges: CharacterEdge[]; nodes: CharacterNode[] } | null;
  rankings?: Ranking[] | null;
  nextAiringEpisode?: {
    airingAt?: number | null;
    timeUntilAiring?: number | null;
    episode?: number | null;
  } | null;
  streamingEpisodes?:
    | {
        title?: string | null;
        url?: string | null;
        site?: string | null;
        thumbnail?: string | null;
      }[]
    | null;
};

const QUERY = `
  query MediaDetail($id: Int!) {
    Media(id: $id, type: ANIME) {
      id
      siteUrl
      title { romaji english native userPreferred }
      synonyms
      description(asHtml: false)
      format
      status
      episodes
      duration
      season
      seasonYear
      startDate { year month day }
      endDate { year month day }
      source
      countryOfOrigin
      isAdult
      averageScore
      meanScore
      popularity
      favourites
      coverImage { medium large extraLarge color }
      bannerImage
      genres
      tags { name rank isGeneralSpoiler isMediaSpoiler }
      studios { edges { isMain } nodes { id name siteUrl } }
      trailer { id site thumbnail }
      relations { edges { relationType } nodes { id title { romaji english native } format coverImage { medium large } } }
      characters(perPage: 10, sort: [ROLE, RELEVANCE, FAVOURITES_DESC]) { edges { role } nodes { id siteUrl name { full native } image { medium large } } }
      rankings { rank type year season allTime context }
      nextAiringEpisode { airingAt timeUntilAiring episode }
      streamingEpisodes { title url site thumbnail }
    }
  }
`;

async function fetchMedia(id: number, signal?: AbortSignal): Promise<Media> {
  const data = await fetchGraphQL<{ Media: Media }>(QUERY, { id }, { signal });
  if (!data.Media) throw new Error('Not found');
  return data.Media;
}

function dateToString(d?: FuzzyDate | null) {
  if (!d?.year) return '';
  const m = d.month ? String(d.month).padStart(2, '0') : '';
  const day = d.day ? String(d.day).padStart(2, '0') : '';
  if (m && day) return `${d.year}-${m}-${day}`;
  if (m) return `${d.year}-${m}`;
  return String(d.year);
}

function sanitizeDescription(text?: string | null) {
  if (!text) return '';
  const withBreaks = text.replace(/<br\s*\/?>(\n)?/gi, '\n');
  const stripped = withBreaks.replace(/<[^>]+>/g, '');
  return stripped;
}

export default function AnimePage({ id }: { id: number }) {
  const [data, setData] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllStreaming, setShowAllStreaming] = useState(false);
  

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const m = await fetchMedia(id, controller.signal);
        if (!cancelled) setData(m);
      } catch (e: unknown) {
        if (isAbortError(e)) return;
        if (!cancelled) setError(getErrorMessage(e) || 'Failed to load anime');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id]);

  const title = useMemo(() => {
    if (!data) return '';
    return data.title.english || data.title.romaji || data.title.native || 'Untitled';
  }, [data]);

  if (loading) {
    return (
      <section className="anime-page">
        <div className="anime-hero skeleton" />
        <div className="container">
          <p className="muted">Loading…</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="anime-page">
        <div className="container">
          <div className="top-list__error" role="alert">
            {error}
          </div>
        </div>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="anime-page">
      <div
        className="anime-hero"
        style={{ backgroundImage: data.bannerImage ? `url(${data.bannerImage})` : undefined }}
      >
        <div className="anime-hero__overlay" />
      </div>

      <div className="container anime-hero-body">
        <div className="hero-left">
          <div className="cover" style={{ backgroundColor: data.coverImage?.color || '#222' }}>
            {data.coverImage?.extraLarge || data.coverImage?.large ? (
              <img src={data.coverImage.extraLarge || data.coverImage.large!} alt="" />
            ) : null}
          </div>
        </div>
        <div className="hero-right">
          <h1 className="anime-title">{title}</h1>
          {(data.title.native || data.title.romaji) && (
            <p className="anime-title-sub">{data.title.native || data.title.romaji}</p>
          )}
          <div className="meta-chips">
            {data.format && <span className="chip">{data.format}</span>}
            {data.status && <span className="chip">{data.status}</span>}
            {data.episodes != null && <span className="chip">{data.episodes} eps</span>}
            {data.duration != null && <span className="chip">{data.duration}m/ep</span>}
            {(data.season || data.seasonYear) && (
              <span className="chip">{[data.season, data.seasonYear].filter(Boolean).join(' ')}</span>
            )}
            {data.averageScore != null && <span className="chip">Avg {data.averageScore}</span>}
            {data.meanScore != null && <span className="chip">Mean {data.meanScore}</span>}
            {data.popularity != null && <span className="chip">Pop {data.popularity}</span>}
            {data.favourites != null && <span className="chip">Fav {data.favourites}</span>}
            {data.source && <span className="chip">{data.source}</span>}
            {data.countryOfOrigin && <span className="chip">{data.countryOfOrigin}</span>}
          </div>
          <div className="hero-links">
            {data.siteUrl && (
              <a className="btn-link" href={data.siteUrl} target="_blank" rel="noreferrer">
                AniList
              </a>
            )}
            {data.trailer?.id && data.trailer.site === 'youtube' && (
              <a
                className="btn-link"
                href={`https://youtu.be/${data.trailer.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Trailer
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="container anime-content">
        <div className="content-main">
          {data.description && (
            <div className="section">
              <h2>Description</h2>
              <p className="description">{sanitizeDescription(data.description)}</p>
            </div>
          )}

          {data.genres?.length ? (
            <div className="section">
              <h3>Genres</h3>
              <div className="chip-list">
                {data.genres.map((g) => (
                  <span key={g} className="chip">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {data.tags?.length ? (
            <div className="section">
              <h3>Tags</h3>
              <div className="chip-list">
                {data.tags.map((t) => (
                  <span
                    key={t.name}
                    className="chip"
                    title={
                      t.isGeneralSpoiler || t.isMediaSpoiler ? 'May contain spoilers' : undefined
                    }
                  >
                    {t.name}
                    {typeof t.rank === 'number' ? ` (${t.rank})` : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {data.relations?.nodes?.length ? (
            <div className="section">
              <h3>Related</h3>
              <ul className="card-row">
                {data.relations.nodes.map((r) => (
                  <li key={r.id} className="card">
                    <a className="card__link" href={`#anime/${r.id}`}>
                      <div
                        className="card__media"
                        style={{ backgroundColor: r.coverImage?.color || '#222' }}
                      >
                        {r.coverImage?.large || r.coverImage?.medium ? (
                          <img src={r.coverImage.large || r.coverImage.medium!} alt="" />
                        ) : null}
                      </div>
                      <div className="card__body">
                        <div className="card__title">
                          {r.title.english || r.title.romaji || r.title.native}
                        </div>
                        {r.format && <div className="card__meta">{r.format}</div>}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside className="content-side">
          {(data.startDate || data.endDate) && (
            <div className="section compact">
              <h3>Dates</h3>
              <div className="kv">
                {data.startDate && (
                  <div>
                    <span>Start</span>
                    <span>{dateToString(data.startDate)}</span>
                  </div>
                )}
                {data.endDate && (
                  <div>
                    <span>End</span>
                    <span>{dateToString(data.endDate)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.studios?.nodes?.length ? (
            <div className="section compact">
              <h3>Studios</h3>
              <ul className="list">
                {data.studios.nodes.map((s) => (
                  <li key={s.id}>
                    {s.siteUrl ? (
                      <a href={s.siteUrl} target="_blank" rel="noreferrer">
                        {s.name}
                      </a>
                    ) : (
                      s.name
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.characters?.nodes?.length ? (
            <div className="section compact">
              <h3>Characters</h3>
              <ul className="avatar-list">
                {data.characters.nodes.map((c) => (
                  <li key={c.id} className="avatar-item">
                    <a href={c.siteUrl || '#'} target="_blank" rel="noreferrer" className="avatar">
                      {c.image?.large || c.image?.medium ? (
                        <img src={c.image.large || c.image.medium!} alt="" />
                      ) : null}
                    </a>
                    <div className="avatar-name">{c.name.full || c.name.native}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.rankings?.length ? (
            <div className="section compact">
              <h3>Rankings</h3>
              <ul className="list">
                {data.rankings.map((r, i) => (
                  <li
                    key={i}
                  >{`#${r.rank} ${r.type}${r.allTime ? ' (all time)' : ''}${r.year ? ` ${r.year}` : ''}${r.season ? ` ${r.season}` : ''}${r.context ? ` — ${r.context}` : ''}`}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.nextAiringEpisode ? (
            <div className="section compact">
              <h3>Next airing</h3>
              <div className="kv">
                <div>
                  <span>Episode</span>
                  <span>{data.nextAiringEpisode.episode ?? '-'}</span>
                </div>
                <div>
                  <span>In</span>
                  <span>
                    {data.nextAiringEpisode.timeUntilAiring
                      ? `${Math.round(data.nextAiringEpisode.timeUntilAiring / 3600)}h`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {data.streamingEpisodes?.length ? (
            <div className="section compact">
              <h3>Streaming</h3>
              <ul className="list">
                {(showAllStreaming
                  ? data.streamingEpisodes
                  : data.streamingEpisodes.slice(0, 5)
                ).map((se, i) => (
                  <li key={i}>
                    {se.url ? (
                      <a href={se.url} target="_blank" rel="noreferrer">
                        {se.title || se.site || 'Episode'}
                      </a>
                    ) : (
                      se.title || se.site || ''
                    )}
                  </li>
                ))}
              </ul>
              {data.streamingEpisodes.length > 5 && (
                <div className="top-list__actions">
                  <button
                    type="button"
                    className="btn-link"
                    aria-expanded={showAllStreaming}
                    onClick={() => setShowAllStreaming((v) => !v)}
                  >
                    {showAllStreaming ? 'Show less' : 'Show more'}
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
