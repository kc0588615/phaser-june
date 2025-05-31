# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a match-3 puzzle game with habitat/species themes built using:
- **Game Engine**: Phaser 3.90.0 
- **Framework**: Next.js 15.3.1 with React 18
- **Language**: Mixed JavaScript and TypeScript (currently migrating to TypeScript on `refactor/TS` branch)
- **Mapping**: Cesium with Resium for habitat visualization

## Common Development Commands

```bash
# Install dependencies (includes Cesium symlink setup)
npm install

# Development server on http://localhost:8080
npm run dev

# Production build to dist/ folder  
npm run build

# Development/build without analytics
npm run dev-nolog
npm run build-nolog
```

## Architecture

### Game Architecture (MVC Pattern)

- **Model**: `src/game/BackendPuzzle.js` - Core game logic, board state, match detection
- **View**: `src/game/BoardView.js` - Rendering logic, animations, visual representation
- **Controller**: `src/game/scenes/Game.js` - Input handling, game flow coordination

### React-Phaser Communication

Uses EventBus pattern (`src/game/EventBus.ts`) for bidirectional communication:
- React → Phaser: `EventBus.emit('event-name', data)`
- Phaser → React: Scene emits `current-scene-ready` when ready
- React accesses game via `ref.current.game` and scene via `ref.current.scene`

### Scene Flow

Standard Phaser scene progression:
1. `Boot.js` - Initial setup
2. `Preloader.js` - Asset loading
3. `MainMenu.js` - Title screen
4. `Game.js` - Main gameplay
5. `GameOver.js` - End screen

Each scene must emit `EventBus.emit('current-scene-ready', this)` for React integration.

### Key Game Components

- `MoveAction.js` - Handles gem swapping logic
- `ExplodeAndReplacePhase.js` - Match explosion and board refill animations
- `constants.js` - Game configuration (board size, gem types, etc.)

## TypeScript Migration Notes

Currently on `refactor/TS` branch converting from JavaScript:
- TypeScript strict mode enabled with some exceptions
- Path alias configured: `@/*` maps to `./src/*`
- Mixed JS/TS files during transition

## Cesium Integration

- Complex webpack configuration in `next.config.mjs` for Cesium
- Post-install script creates symlink: `node_modules/cesium/Build/Cesium` → `public/cesium`
- `CesiumMap.tsx` component for habitat visualization
- Integration with TiTiler backend for habitat data

## Testing

No testing framework currently configured. Only ESLint via Next.js core-web-vitals preset.

### Type Checking

TypeScript type checking available via:
```bash
npm run typecheck        # Single type check
npm run typecheck:watch  # Continuous type checking
```

## Important Notes

- Static export configured (`output: 'export'` in next.config.mjs)
- Assets stored in `public/assets/` (gem sprites, backgrounds)
- Development port is 8080, not the Next.js default 3000
- Optional analytics via `log.js` for template usage tracking

## TypeScript Conversion

The project is undergoing TypeScript migration. See:
- `TYPESCRIPT_CONVERSION_PLAN.md` - Detailed conversion strategy
- `TYPESCRIPT_CONVERSION_CHECKLIST.md` - Quick reference checklist
- `ONBOARDING_GUIDE.md` - Full system architecture documentation

Current status: React components (.tsx) converted, game logic (.js) pending conversion.