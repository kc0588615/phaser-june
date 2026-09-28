<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer -- your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and the user's question, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and the user's full question (not single words)
4. Answer using the fetched docs
<!-- context7 -->

In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# AGENTS.md
Guidance for coding agents in this repo. Keep instructions short; prefer facts over prose.

## Project Stack
- Runtime: TypeScript (Next.js)
- ORM: Drizzle (migrated from Prisma, which was migrated from Supabase)
- Database: PostgreSQL with PostGIS on Hetzner VPS, accessed via PgBouncer with TLS
- Auth: Clerk
- Hosting: local Next.js dev server in WSL (frontend), Hetzner VPS (database/services)
- Docs: `README.md`, `docs/` (Markdown)

## Important: Prefer Simplicity
When implementing solutions, prefer the simplest approach that works. Do not over-engineer with excessive fallbacks, complex verification chains, or multi-layer abstractions. If the user asks for something straightforward, implement it straightforwardly. Ask before adding complexity.

## Migration Context
This project has been through multiple migrations: Supabase -> Prisma/Hetzner -> Drizzle/Hetzner. There should be zero remaining Supabase and Prisma references in the codebase. If you encounter any Supabase or Prisma imports, env vars, or references, flag them for removal. Do not suggest Supabase or Prisma-based solutions.

## Database Access
- Codex and Claude Code use the installed `postgres-tunnel` skill for WSL database work.
- App/runtime traffic uses `DATABASE_URL` through TLS PgBouncer on port 6432.
- WSL agents inspect/query raw Postgres through `127.0.0.1:55432` via the SSH tunnel.
- Windows/QGIS uses a separate Windows-local tunnel on port 5433; agents do not use it.
- Do not set up a new database MCP server.
- Do not add `?pgbouncer=true` (invalid for `psql`/postgres.js; causes introspection issues).
- Always use the `DATABASE_URL` from environment, never hardcode connection strings.
- Credentials, SSH, firewall or deploy work: read `docs/DEPLOY.md#hardening-status-2026-09-26` first (password rotated; SSH keys only; UFW enabled; remaining owner tasks).
- Always wrap database lookups and external calls in try/catch blocks.

## Repo Quick Start
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:8080)
- Globe basemaps: `npm run clue:world-map`
- Build + serve: `npm run build && npm run serve`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint` (must exit 0; `react-hooks/set-state-in-effect` is off by design, see `eslint.config.mjs`)
- Drizzle: `npm run db:introspect`
- Env (`.env.local`): `DATABASE_URL`, Clerk keys, `NEXT_PUBLIC_TITILER_BASE_URL` + `NEXT_PUBLIC_COG_URL` (habitat snapshots; optional).

## Where Things Live
The app is two screens: a globe to pick a place (`/`) and Clue Match (`/clue-match`, optional `?place=` and `?seed=`). Guide: `docs/CLUE_MATCH.md`.
- Globe: `src/pages/index.tsx` -> `src/components/globe/` (`GlobeScreen` shell, `Globe` MapLibre globe, `PlaceList`, `PlaceCard` with TiTiler habitat snapshot). Data `GET /api/places`, `/api/places/outline` (`src/lib/places.ts`, `clue_match_places` view). Pure helpers `src/clueGame/places.ts`.
- Clue Match UI: `src/pages/clue-match.tsx` -> `src/components/clueGame/` (`ClueMatchGame` shell, `useClueMatch` state + board wiring, `useJournal` on-device journal, `PhaserGame` board host). Client GETs share `src/lib/getJson.ts` (cached per page load).
- Rules (pure): `src/clueGame/` (categories, traits, deduction, round, session, selectors, validatePool, glossary, journal, solveReport, speciesInfo, worldMap).
- Board: `src/game/` (flat). `main.ts` boots `ClueBoardScene.ts` (loads gem SVGs, reports matches). `BoardModel.ts` rules (pure), `BoardView.ts` sprites + animation, `BoardController.ts` drag + keyboard input, cascade loop. React <-> Phaser only via typed `EventBus.ts` (`gems-matched`, `clue-board-setup`, `clue-board-lock`, `clue-board-shuffled`, `clue-board-key`, `clue-board-announce`, `current-scene-ready`). Dev bridge `window.__cc` (`debugBridge.ts`).
- Data: `GET /api/clue-game/pool` (`src/lib/cluePool.ts`), `/api/clue-game/range`, `POST /api/clue-game/solves`, `GET /api/clue-game/journal` (signed-in journal sync). Drizzle `src/db/schema/*` models only the columns the app reads (species, clues, facts, profiles, clue_match_solves); the old expedition tables still exist in Postgres, unmodelled. Schema baseline `db/schema.sql` (no migration history; change the DB, then update the file). Scripts connect via `scripts/connect.ts`.
- Auth: Clerk (`src/pages/_app.tsx`, `src/proxy.ts`). A signed-in player's `profiles` row is created on their first solve (`src/lib/player.ts`).
- Content: profiles in `db/content/animals/*.json`, tiered sources `db/content/sources.json` (guide `docs/CONTENT_SOURCES.md`). `npm run content -- preview|build|check|ranges|photos`; never hand-edit content rows. New animal's range: `npm run iucn -- find|import` (IUCN shapefiles in `~/data/iucn/shp`). Practice SQL: `db/analysis/clue-match/`.

## Docs Map
- `docs/CLUE_MATCH.md`: the game, globe, rules, content workflow, database, practice SQL.
- `docs/CONTENT_SOURCES.md`: source tiers, tag vocabulary, profile workflow.
- `docs/DEPLOY.md`: serving the app from the VPS (Dockerfile, `deploy/`), the `critter_app` role, backups, hardening.
- `docs/DATABASE_ACCESS.md`, `docs/SHAPEFILE_BEST_PRACTICES.md`, `docs/DRIZZLE_ORM_GUIDE.md`: data layer.
- `README.md`: start here.

## Code Style / Safety
- TypeScript everywhere; use `@/` path alias.
- Prefer `rg` for search. Avoid network installs (restricted). No destructive git commands unless explicitly asked.
- Keep edits minimal and commented only when non-obvious.

## Testing
- Never write unit tests after you write code.
- Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.
- If you must test a system in isolation, first write down all the ways it could fail, then write the code.
- E2E here: `npm run e2e` (headless Chrome plays globe → place → Clue Match rounds against `npm run dev`, checks invariants every move; artifact `e2e-artifacts/<run>/report.json` + screenshots, same seed = same run), and the `playtest` skill for judgment calls (report in `docs/playtests/`). `npm test` keeps only unit tests for failures a playtest can't see (deduction rules, content simulations, input/storage parsing, board invariants).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
