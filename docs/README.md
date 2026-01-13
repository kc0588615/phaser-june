# Phaser + Next.js + Cesium + Drizzle

A Next.js + React application that embeds a Phaser 3 puzzle game and a Cesium 3D map, with species and habitat data stored in Postgres via Drizzle ORM. Server runtime is required for API routes and database access. Auth is planned via Clerk (not implemented yet). UI built with Tailwind CSS and shadcn/ui.

## Tech Stack

- Phaser 3.90.0 for gameplay
- Next.js 16.1.0 with server runtime (API routes + Drizzle)
- TypeScript 5
- Cesium + Resium for 3D map
- Postgres (Hetzner VPS) + Drizzle ORM for data
- Clerk for auth (planned, not implemented)
- Tailwind CSS 4 + shadcn/ui for styling

## Prerequisites

- Node.js 18+
- Postgres database (Hetzner VPS or other)
- Cesium Ion token
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
- `NEXT_PUBLIC_CESIUM_ION_TOKEN`
- Clerk keys TBD
- Optional: `NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`

## Project Structure

- `src/pages/` — Next.js routes (`_app.tsx`, `_document.tsx`, `index.tsx`)
- `src/PhaserGame.tsx` — React ↔ Phaser bridge component
- `src/game/` — Game core: `BackendPuzzle.ts`, `BoardView.ts`, `MoveAction.ts`, scenes in `scenes/`, `EventBus.ts`
- `src/components/` — UI components: `CesiumMap.tsx`, `SpeciesPanel.tsx`, `SpeciesList.tsx`, etc., plus `components/ui/*` from shadcn
- `src/db/` — Drizzle client + schema + types
- `src/lib/` — Services: `speciesQueries.ts`, `playerTracking.ts`
- `src/types/` — Shared types including `database.ts`
- `public/` — Static assets (sprites, icons), Cesium static assets under `public/cesium`

## Key Concepts

- React–Phaser bridge via `PhaserGame.tsx` and `EventBus.ts`
- Cesium integration in `src/components/CesiumMap.tsx`
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
- Architecture: [`EVENTBUS_AND_DISPLAY_ARCHITECTURE.md`](./EVENTBUS_AND_DISPLAY_ARCHITECTURE.md), [`GAME_REACTIVITY_GUIDE.md`](./GAME_REACTIVITY_GUIDE.md), [`UI_DISPLAY_SYSTEM_REFERENCE.md`](./UI_DISPLAY_SYSTEM_REFERENCE.md)
- Data: [`DATABASE_USER_GUIDE.md`](./DATABASE_USER_GUIDE.md), [`SPECIES_DATABASE_IMPLEMENTATION.md`](./SPECIES_DATABASE_IMPLEMENTATION.md), [`DRIZZLE_ORM_GUIDE.md`](./DRIZZLE_ORM_GUIDE.md)
- UI & styling: [`SHADCN_IMPLEMENTATION_GUIDE.md`](./SHADCN_IMPLEMENTATION_GUIDE.md), [`STYLE_MAPPING.md`](./STYLE_MAPPING.md)
- Map/game layout: [`MAP_MINIMIZE_IMPLEMENTATION.md`](./MAP_MINIMIZE_IMPLEMENTATION.md), [`LAYOUT_RESTRUCTURE_IMPLEMENTATION.md`](./LAYOUT_RESTRUCTURE_IMPLEMENTATION.md)

## Deploying

Deploy with a server runtime (recommended: Vercel). Build with `npm run build` and run with `npm run start` or `npm run serve`. Ensure required environment variables are available at runtime.
