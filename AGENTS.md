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
Guidance for Codex in this repo. Keep instructions short; prefer facts over prose.

## Project Stack
- Runtime: TypeScript (Next.js)
- ORM: Drizzle (migrated from Prisma, which was migrated from Supabase)
- Database: PostgreSQL with PostGIS on Hetzner VPS, accessed via PgBouncer with TLS
- Auth: Clerk
- Hosting: Vercel (frontend), Hetzner VPS (database/services)
- Docs: Docusaurus wiki with TypeDoc

## Important: Prefer Simplicity
When implementing solutions, prefer the simplest approach that works. Do not over-engineer with excessive fallbacks, complex verification chains, or multi-layer abstractions. If the user asks for something straightforward, implement it straightforwardly. Ask before adding complexity.

## Migration Context
This project has been through multiple migrations: Supabase -> Prisma/Hetzner -> Drizzle/Hetzner. There should be zero remaining Supabase and Prisma references in the codebase. If you encounter any Supabase or Prisma imports, env vars, or references, flag them for removal. Do not suggest Supabase or Prisma-based solutions.

## Database Access
- Use the `postgres-tunnel` skill for Postgres access.
- Inspect/query through the SSH tunnel with `psql`.
- Do not set up a new database MCP server.
- Connection goes through PgBouncer on port 6432 with TLS; do not use `?pgbouncer=true` param (causes empty introspection).
- Always use the `DATABASE_URL` from environment, never hardcode connection strings.
- Always wrap database lookups and external calls in try/catch blocks.
- In migration scripts, verify imported modules are available in the migration context (migrations run in isolation).

## Repo Quick Start
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:8080)
- Build/serve static: `npm run build && npm run serve` (serves `dist/`); or `npm start`
- Typecheck: `npm run typecheck`
- Drizzle: `npm run db:introspect`
- Env: set `DATABASE_URL` (+ optional `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`) in `.env.local`. Clerk keys TBD.

## Where Things Live
- Layout host: `src/MainAppLayout.tsx` (keeps MapLibre + Phaser mounted; viewMode toggles map/clues/species list).
- Phaser entry: `src/PhaserGame.tsx` boots `src/game/main.ts` -> scenes (Boot, Preloader, MainMenu, Game, GameOver).
- Event bus: `src/game/EventBus.ts` -- fully typed; see file for catalog. Key categories: location (`map-location-selected`), board (`game-hud-updated`, `game-over`, `game-reset`), expedition (`expedition-start`, `node-complete`, `node-advance-requested`), clue/deduction, auth/progress.
- Controller: `src/game/scenes/Game.ts` (input, move flow, streak/score, HUD emit, node objectives).
- Model: `src/game/BackendPuzzle.ts` (board state, matches, move registration), `src/game/boardTypes.ts` (cell schema), `src/game/gemSemantics.ts` (shared gem meaning config), `src/game/nodeObstacles.ts` (typed obstacle contracts + seeded cell state), `src/game/clueConfig.ts` (CluePayload, clue category keys).
- Move pipeline: `src/game/MoveAction.ts`, `src/game/ExplodeAndReplacePhase.ts` (swap/cascade).
- View: `src/game/BoardView.ts` (sprite layout/animation, resize tweens).
- Map ingress: `src/components/MapLibreExploreMap.tsx` (click -> expedition data, highlights habitats/species polygons).
- HUD/clues: `src/components/SpeciesPanel.tsx` (listens to clue + HUD events; emits `show-species-list`).
- Species catalog: `src/components/SpeciesList.tsx` (React Query, filters, localStorage discoveries).
- Expedition run: `src/types/expedition.ts` (RunState, clue fragments, deduction state), `src/contexts/ExpeditionContext.tsx` (run state/persistence), `src/expedition/` (affinities.ts, domain.ts), `src/lib/nodeScoring.ts` (node generation from GIS), `src/components/ExpeditionBriefing.tsx`, `src/components/FieldNotebook.tsx`, `src/components/ExpeditionRouteRecap.tsx`.
- Data layer: `src/db/schema/*` (schema), `src/db/index.ts` (singleton), `src/lib/speciesQueries.ts` (Drizzle queries), `src/hooks/useSpeciesData.ts` (React Query), `src/lib/playerTracking.ts` (sessions, clue/discovery writes).
- Styles/UI: shadcn in `src/components/ui/*`, global CSS in `src/styles/globals.css`, Tailwind config at root.

## Docs Map
Read relevant docs before big edits.

- Hub: `docs/DEVELOPER_ONBOARDING.md` (full index + reading order).
- Architecture: `docs/GAME_SYSTEM_ARCHITECTURE.md`.
- Board/clues: `docs/archive/CLUE_BOARD_IMPLEMENTATION.md` (archived), `docs/SPECIES_DISCOVERY_IMPLEMENTATION.md`.
- Expedition/runs: `docs/EXPEDITION_RUN_LOOP.md`, `docs/ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md`, `docs/DEDUCTION_CAMP_ECONOMY.md`.
- Affinity system: `docs/AFFINITY_MIGRATION_IMPLEMENTATION.md`.
- Album/TCG: `docs/SPECIES_ALBUM_TCG_SYSTEM_SPEC.md`, `docs/SPECIES_ALBUM_TCG_INTEGRATION_TODO.md` (Phase 2-3 remaining work).
- Comparative ref slot: `docs/COMPARATIVE_REFERENCE_SLOT.md`.
- Map/data: `docs/MAPLIBRE_UI_CUSTOMIZATION.md`, `docs/HABITAT_HIGHLIGHT_IMPLEMENTATION.md`, `docs/HABITAT_RASTER_MIGRATION.md`.
- UI/styling: `docs/SHADCN_IMPLEMENTATION_GUIDE.md`, `docs/SPECIES_CARD_UI_IMPROVEMENTS.md`, `docs/SPECIES_UI_MOBILE_IMPROVEMENTS.md`, `docs/SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md`.
- Data/auth: `docs/DATABASE_USER_GUIDE.md`, `docs/SPECIES_DATABASE_IMPLEMENTATION.md`, `docs/SPECIES_TABLE_SIMPLIFICATION_PLAN.md` (species table + iucn rename), `docs/DRIZZLE_ORM_GUIDE.md`, `docs/DRIZZLE_VERCEL_MIGRATION.md`.
- Tracking/stats: `docs/PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md`, `docs/PLAYER_TRACKING_INTEGRATION_PLAN.md`, `docs/PLAYER_STATS_DASHBOARD_INTEGRATION.md`, `docs/PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md`.
- Biodiversity content: `docs/archive/BIOREGION_FEATURE_SUMMARY.md` (archived), `docs/BIOREGION_IMPLEMENTATION.md`, `docs/ECOREGION_IMPLEMENTATION.md`.

## Code Style / Safety
- TypeScript everywhere; use `@/` path alias.
- Keep React/Phaser components mounted (prefer `display: none` over unmount) to preserve EventBus listeners.
- Prefer `rg` for search. Avoid network installs (restricted). No destructive git commands unless explicitly asked.
- Keep edits minimal and commented only when non-obvious.
