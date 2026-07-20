# Phaser + Next.js + MapLibre + Drizzle

A Next.js + React application that embeds a Phaser 3 puzzle game and a MapLibre 3D map, with species and habitat data stored in Postgres via Drizzle ORM. Server runtime is required for API routes and database access. Auth is planned via Clerk (not implemented yet). UI built with Tailwind CSS and shadcn/ui.

Note: The data layer was migrated from Prisma to Drizzle; Prisma is no longer used in this repo.

## Tech Stack

- Phaser 3.90.0 for gameplay
- Next.js 16.1.0 with server runtime (API routes + Drizzle)
- TypeScript 5
- MapLibre GL JS for globe and regional maps
- Postgres (Hetzner VPS) + Drizzle ORM for data
- Clerk for auth (planned, not implemented)
- Tailwind CSS 4 + shadcn/ui for styling

## Prerequisites

- Node.js 18+
- Postgres database (Hetzner VPS or other)
- Clerk account (planned, not required yet)

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys

# Development (Next.js dev server)
npm run dev  # http://localhost:8080

# Production (server runtime)
npm run build
npm run serve # runs Next.js server on port 8080
```

Required environment variables (set in `.env.local`):

- `DATABASE_URL` (Postgres connection string)
- Clerk keys TBD
- Optional: `NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`

## Project Structure

- `src/pages/` — Next.js routes (`_app.tsx`, `_document.tsx`, `index.tsx`)
- `src/PhaserGame.tsx` — React ↔ Phaser bridge component
- `src/game/` — Game core: `BackendPuzzle.ts`, `BoardView.ts`, `MoveAction.ts`, scenes in `scenes/`, `EventBus.ts`
- `src/components/` — UI components: `MapLibreExploreMap.tsx`, `SpeciesPanel.tsx`, `SpeciesList.tsx`, etc., plus `components/ui/*` from shadcn
- `src/db/` — Drizzle client + schema + types
- `src/lib/` — Services: `speciesQueries.ts`, `playerTracking.ts`
- `src/types/` — Shared types including `database.ts`
- `public/` — Static assets (sprites, icons, local GeoJSON)

## Key Concepts

- React–Phaser bridge via `PhaserGame.tsx` and `EventBus.ts`
- MapLibre integration in `src/components/MapLibreExploreMap.tsx`
- Drizzle data layer in `src/db/*` and `src/lib/speciesQueries.ts`
- Match-3 MVC-like flow: BackendPuzzle ↔ Scene ↔ BoardView

## Scripts

- `npm run dev` — Start Next.js dev server on port 8080
- `npm run build` — Build `.next/` for server runtime
- `npm run serve` — Run Next.js server on port 8080
- `npm run start` — Build then serve
- `npm run typecheck` — TypeScript check

Note: This project requires the Next.js server runtime for API routes and database access. Static export is disabled in `next.config.mjs`.

## Docs

- Start with onboarding: [`DEVELOPER_ONBOARDING.md`](./DEVELOPER_ONBOARDING.md) (full index of every doc)
- Architecture: [`GAME_SYSTEM_ARCHITECTURE.md`](./GAME_SYSTEM_ARCHITECTURE.md), [`EXPEDITION_RUN_LOOP.md`](./EXPEDITION_RUN_LOOP.md), [`CLUE_BOARD_IMPLEMENTATION.md`](./archive/CLUE_BOARD_IMPLEMENTATION.md)
- Data: [`DATABASE_USER_GUIDE.md`](./DATABASE_USER_GUIDE.md), [`SPECIES_DATABASE_IMPLEMENTATION.md`](./SPECIES_DATABASE_IMPLEMENTATION.md), [`DRIZZLE_ORM_GUIDE.md`](./DRIZZLE_ORM_GUIDE.md)
- UI & styling: [`SHADCN_IMPLEMENTATION_GUIDE.md`](./SHADCN_IMPLEMENTATION_GUIDE.md), [`STYLE_MAPPING.md`](./archive/STYLE_MAPPING.md)
- Brand/art/copy standard: [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md)
- Map/game layout: [`MAPLIBRE_UI_CUSTOMIZATION.md`](./MAPLIBRE_UI_CUSTOMIZATION.md), [`HABITAT_HIGHLIGHT_IMPLEMENTATION.md`](./HABITAT_HIGHLIGHT_IMPLEMENTATION.md)

## Deploying

Deploy with a server runtime (recommended: Vercel). Build with `npm run build` and run with `npm run start` or `npm run serve`. Ensure required environment variables are available at runtime.
