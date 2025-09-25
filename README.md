# Phaser + Next.js + Cesium + Supabase

A Next.js + React application that embeds a Phaser 3 puzzle game and a Cesium 3D map, with species and habitat data fetched from Supabase. The UI is built with Tailwind CSS and shadcn/ui.

## Tech Stack

- Phaser 3.90.0 for gameplay
- Next.js 15.3.1 with static export (`output: 'export'`)
- TypeScript 5
- Cesium + Resium for 3D map
- Supabase (RPC functions) for data
- Tailwind CSS 4 + shadcn/ui for styling

## Prerequisites

- Node.js 18+
- Supabase project (URL + anon key)
- Cesium Ion token

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys

# Development (Next.js dev server)
npm run dev  # http://localhost:8080

# Production (static export)
npm run build
npm run serve # serves ./dist on port 8080
```

Required environment variables (set in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CESIUM_ION_TOKEN`
- Optional: `NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`

## Project Structure

- `src/pages/` — Next.js routes (`_app.tsx`, `_document.tsx`, `index.tsx`)
- `src/PhaserGame.tsx` — React ↔ Phaser bridge component
- `src/game/` — Game core: `BackendPuzzle.ts`, `BoardView.ts`, `MoveAction.ts`, scenes in `scenes/`, `EventBus.ts`
- `src/components/` — UI components: `CesiumMap.tsx`, `SpeciesPanel.tsx`, `SpeciesList.tsx`, etc., plus `components/ui/*` from shadcn
- `src/lib/` — Clients and services: `supabaseClient.ts`, `speciesService.ts`
- `src/types/` — Shared types including `database.ts`
- `public/` — Static assets (sprites, icons), Cesium static assets under `public/cesium`

## Key Concepts

- React–Phaser bridge via `PhaserGame.tsx` and `EventBus.ts`
- Cesium integration in `src/components/CesiumMap.tsx`
- Supabase RPC data layer in `src/lib/speciesService.ts`
- Match-3 MVC-like flow: BackendPuzzle ↔ Scene ↔ BoardView

## Scripts

- `npm run dev` — Start Next.js dev server on port 8080
- `npm run build` — Static export to `dist/`
- `npm run serve` — Serve `dist/` statically on port 8080
- `npm run start` — Build then serve
- `npm run typecheck` — TypeScript check

Note: This project supports dev server usage. The app is also configured for static export (see `next.config.mjs`).

## Docs

- Developer onboarding: `DEVELOPER_ONBOARDING.md`
- Event system: `EVENTBUS_AND_DISPLAY_ARCHITECTURE.md`, `GAME_REACTIVITY_GUIDE.md`
- Database layer: `DATABASE_USER_GUIDE.md`, `SPECIES_DATABASE_IMPLEMENTATION.md`
- UI and styling: `SHADCN_IMPLEMENTATION_GUIDE.md`, `UI_DISPLAY_SYSTEM_REFERENCE.md`

## Deploying

`npm run build` produces a fully static site under `dist/`. Deploy the entire `dist/` folder to your static host (or use Vercel static hosting). Ensure required environment variables are available at build time.
