# My-Anime-list

Track, rate, and review your anime. Create watchlists, log episodes, and mark favorites.
Search by title/tags. See stats, progress, and recommendations. Clean, responsive UI.

## Tech stack

- React + TypeScript + Vite
- ESLint configured for TypeScript/React
- Prettier for code formatting

## Local development

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`
4. Preview build locally: `npm run preview`

## Project structure

- `src/` application source (components, styles, entry)
- `public/` static assets
- `vite.config.ts` Vite configuration
- `tsconfig*.json` TypeScript configuration files

## License

MIT

## API: AniList

- Docs: https://docs.anilist.co
- GraphQL endpoint: https://graphql.anilist.co

We will use AniList's GraphQL API for search, seasonal listings, trending/top, detailed pages, and user lists.

### Integration checklist (to-do)

- Env setup
	- Add Vite envs (client-safe):
		- `VITE_ANILIST_URL=https://graphql.anilist.co`
		- `VITE_ANILIST_TOKEN=` (optional; for authenticated/user-specific queries later)
	- Use `.env` for local values and commit an `.env.example` (no secrets).
- GraphQL client
	- Start with native `fetch` helper that accepts `{ query, variables }` and returns typed data.
	- Consider a lightweight client later (e.g., `graphql-request`, `urql`, or Apollo) if we need caching/devtools.
- Types and safety
	- Define minimal TypeScript types for core entities (Anime, PageInfo) or use GraphQL Codegen.
- Core queries to implement
	- Search by title/tags with pagination.
	- Seasonal listings (current/upcoming) and filters (genre, format, status).
	- Trending/Top anime (rankings) — to be shown under Discover.
	- Anime detail by ID (title(s), cover, banner, synopsis, episodes, status, studios, genres, tags, scores).
	- Suggestions/autocomplete for the navbar search.
- UX and performance
	- Debounced search, loading states, and graceful errors.
	- Basic caching/memoization for repeat queries (per-session).
- Auth (later)
	- Evaluate AniList OAuth for user-specific lists (watchlist/progress/favorites) and mutations.

## Roadmap

- Discover page: add a "Top Anime" section (rankings/trending) under Discover

## To-do

- [ ] Env setup
	- [ ] Add Vite envs (client-safe):
		- `VITE_ANILIST_URL=https://graphql.anilist.co`
		- `VITE_ANILIST_TOKEN=` (optional; for authenticated/user-specific queries later)
	- [ ] Use `.env` for local values and commit an `.env.example` (no secrets).
- [ ] GraphQL client
	- [ ] Start with native `fetch` helper that accepts `{ query, variables }` and returns typed data.
	- [ ] Consider a lightweight client later (e.g., `graphql-request`, `urql`, or Apollo) if we need caching/devtools.
- [ ] Types and safety
	- [ ] Define minimal TypeScript types for core entities (Anime, PageInfo) or use GraphQL Codegen.
- [ ] Core queries to implement
	- [ ] Search by title/tags with pagination.
	- [ ] Seasonal listings (current/upcoming) and filters (genre, format, status).
	- [ ] Trending/Top anime (rankings) — to be shown under Discover.
	- [ ] Anime detail by ID (title(s), cover, banner, synopsis, episodes, status, studios, genres, tags, scores).
	- [ ] Suggestions/autocomplete for the navbar search.
- [ ] UX and performance
	- [ ] Debounced search, loading states, and graceful errors.
	- [ ] Basic caching/memoization for repeat queries (per-session).
	- [ ] Trending optimization: fetch only first 10 by default; on “Show more”, request the next 10 (page 2) on demand instead of preloading 20. This reduces initial payload and speeds up first view.
- [ ] Auth (later)
	- [ ] Evaluate AniList OAuth for user-specific lists (watchlist/progress/favorites) and mutations.
