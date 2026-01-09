---
sidebar_position: 2
title: Project Structure
description: Where everything lives in the codebase
tags: [structure, navigation]
---

# Project Structure

Understanding where code lives is essential for navigating this hybrid React-Phaser application.

## Directory Overview

```
phaser-june/
├── src/
│   ├── pages/              # Next.js routes
│   │   ├── _app.tsx        # App wrapper
│   │   ├── _document.tsx   # HTML document
│   │   └── index.tsx       # Main entry point
│   │
│   ├── game/               # Phaser game code
│   │   ├── scenes/         # Game scenes (Boot, Preloader, MainMenu, Game, GameOver)
│   │   ├── BackendPuzzle.ts  # Match-3 logic (Model)
│   │   ├── BoardView.ts      # Sprite rendering (View)
│   │   ├── MoveAction.ts     # Move validation
│   │   ├── EventBus.ts       # React↔Phaser communication
│   │   └── main.ts           # Phaser config & bootstrap
│   │
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── CesiumMap.tsx   # 3D globe
│   │   ├── SpeciesPanel.tsx  # Clue display
│   │   └── SpeciesList.tsx   # Species catalog
│   │
│   ├── lib/                # Services & utilities
│   │   ├── prisma.ts           # Prisma client
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
│   ├── assets/             # Game sprites (gems, owl)
│   └── cesium/             # Cesium static assets
│
├── docs/                   # Source documentation (migrated to wiki)
├── wiki/                   # Docusaurus documentation site
├── prisma/                 # Prisma schema & migrations
│
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

## Key Files by Role

### Entry Points

| File | Purpose |
|------|---------|
| `src/pages/index.tsx` | Landing page, renders MainAppLayout |
| `src/MainAppLayout.tsx` | Orchestrates Cesium, Phaser, and UI panels |
| `src/PhaserGame.tsx` | Creates Phaser.Game instance, exposes ref |

### Game Logic (MVC Pattern)

| File | Role | Responsibility |
|------|------|----------------|
| `src/game/scenes/Game.ts` | Controller | Input handling, game flow, EventBus emissions |
| `src/game/BackendPuzzle.ts` | Model | Board state, match detection, move validation |
| `src/game/BoardView.ts` | View | Sprite positioning, animations, visual updates |

### Communication

| File | Purpose |
|------|---------|
| `src/game/EventBus.ts` | Typed pub/sub for React↔Phaser events |

### Data Layer

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma client singleton |
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
- [EventBus Architecture](/docs/architecture/eventbus-display) - Understand React↔Phaser communication
