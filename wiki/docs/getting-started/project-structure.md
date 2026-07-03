---
sidebar_position: 2
title: Project Structure
description: Where everything lives in the codebase
tags: [structure, navigation]
---

# Project Structure

Understanding where code lives is essential for navigating this hybrid React-Phaser-Cesium application.

## Directory Overview

```
phaser-june/
├── src/
│   ├── pages/              # Pages Router UI routes + legacy player API routes
│   │   ├── _app.tsx        # App wrapper
│   │   ├── _document.tsx   # HTML document
│   │   └── index.tsx       # Main entry point
│   │
│   ├── app/api/            # App Router API routes
│   │   ├── protected-areas/at-point/
│   │   ├── runs/
│   │   └── species/
│   │
│   ├── game/               # Phaser game code
│   │   ├── scenes/         # Game scenes (Boot, Preloader, MainMenu, Game, GameOver)
│   │   ├── matchBattle/    # Combat pieces, route, gear, rewards, species mapping
│   │   ├── BackendPuzzle.ts  # Match-3 logic (Model)
│   │   ├── BoardView.ts      # Sprite rendering (View)
│   │   ├── MoveAction.ts     # Move validation
│   │   ├── EventBus.ts       # React↔Phaser communication
│   │   └── main.ts           # Phaser config & bootstrap
│   │
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── CesiumMap.tsx   # 3D globe
│   │   ├── MatchBattle*.tsx  # Combat HUD, reward draft, route map
│   │   ├── SpeciesPanel.tsx  # Clue display
│   │   └── SpeciesList.tsx   # Species catalog
│   │
│   ├── contexts/           # React state owners
│   │   ├── ExpeditionContext.tsx  # Run state, Match Battle reducers, persistence
│   │   └── GameBridgeContext.tsx  # EventBus listeners for UI state
│   │
│   ├── expedition/         # Run economy, affinities, gem effects/domain config
│   │
│   ├── db/                # Drizzle client + schema
│   │   ├── index.ts       # Drizzle client singleton
│   │   ├── types.ts       # Inferred types
│   │   └── schema/        # Table definitions
│   │
│   ├── lib/                # Services & utilities
│   │   ├── speciesQueries.ts   # Drizzle + SQL queries
│   │   ├── speciesService.ts   # API-backed species queries
│   │   └── playerTracking.ts   # Session telemetry
│   │
│   ├── hooks/              # React hooks
│   │   └── useSpeciesData.ts   # React Query wrapper
│   │
│   ├── types/              # TypeScript definitions
│   │   └── database.ts     # Shared database types
│   │
│   ├── styles/             # Global styles
│   │   └── globals.css     # Tailwind imports
│   │
│   ├── MainAppLayout.tsx   # Layout orchestrator
│   └── PhaserGame.tsx      # React-Phaser bridge
│
├── public/
│   ├── assets/             # Game sprites (gems)
│   └── cesium/             # Cesium static assets
│
├── docs/                   # Maintainer source docs and archived design docs
├── wiki/                   # Docusaurus documentation site
│
├── drizzle.config.ts       # Drizzle CLI config
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## Key Files by Role

### Entry Points

| File | Purpose |
|------|---------|
| `src/pages/index.tsx` | Main game page, renders MainAppLayout |
| `src/MainAppLayout.tsx` | Orchestrates Cesium, Phaser, and UI panels |
| `src/PhaserGame.tsx` | Creates Phaser.Game instance, exposes ref |

### Game Logic (MVC Pattern)

| File | Role | Responsibility |
|------|------|----------------|
| `src/game/scenes/Game.ts` | Controller | Input handling, game flow, EventBus emissions |
| `src/game/BackendPuzzle.ts` | Model | Board state, match detection, move validation |
| `src/game/BoardView.ts` | View | Sprite positioning, animations, visual updates |
| `src/game/matchBattle/*` | Combat config | Pieces, route map, gear, upgrades, enemy mapping |

### Communication

| File | Purpose |
|------|---------|
| `src/game/EventBus.ts` | Typed pub/sub for React↔Phaser events |
| `src/contexts/ExpeditionContext.tsx` | React owner for run phase, Match Battle state, route/reward reducers |
| `src/contexts/GameBridgeContext.tsx` | React listener bridge for HUD, clues, encounters, combat HUD state |

### Data Layer

| File | Purpose |
|------|---------|
| `src/db/index.ts` | Drizzle client singleton |
| `src/db/schema/*` | Table definitions (app tables + spatial mappings) |
| `src/app/api/runs/*` | Run creation, resume, checkpoint, completion APIs |
| `src/app/api/species/*` | Species, deduction, card, and combat-trait APIs |
| `src/lib/speciesService.ts` | API wrappers for species queries |
| `src/hooks/useSpeciesData.ts` | React Query caching layer |

## Import Aliases

The codebase uses `@/` as an alias for `./src/`:

```typescript
// Instead of:
import { EventBus } from '../../../game/EventBus';

// Use:
import { EventBus } from '@/game/EventBus';
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Next Steps

- [Environment Setup](/docs/getting-started/environment-setup) - Configure all services
- [Event Types Reference](/docs/reference/event-types) - Understand React↔Phaser communication
- [Match Battle Guide](/docs/guides/game/match-battle) - Understand the active combat route
