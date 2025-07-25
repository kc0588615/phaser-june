# Developer Onboarding Guide

## Overview
This guide helps new developers quickly understand and contribute to the Phaser/Next.js match-3 puzzle game codebase, focusing on the gameplay presentation layer and state management.

## Core Architecture Overview

### 1. Hybrid React + Phaser Architecture
The codebase uses a unique hybrid approach where:
- **React** manages UI overlays, menus, and global state
- **Phaser** handles the game canvas and core gameplay
- Communication happens via an EventBus singleton

### 2. Essential Files to Understand First

#### Game Entry Points
- `/src/game/PhaserGame.tsx` - React wrapper component that initializes Phaser
- `/src/game/main.ts` - Phaser game configuration and scene setup
- `/src/game/EventBus.ts` - Critical singleton for React-Phaser communication

#### MVC Game Architecture
```
Model (Game Logic):
- /src/game/BackendPuzzle.ts - Core match-3 logic, board state
- /src/game/constants.ts - Game configuration (board size, gem types)
- /src/game/clueConfig.ts - Gem-to-clue mappings

View (Rendering):
- /src/game/BoardView.ts - Visual representation, animations
- /src/game/objects/Gem.ts - Individual gem sprites

Controller (Game Flow):
- /src/game/scenes/Game.ts - Main gameplay scene
- /src/game/MoveAction.ts - Gem swapping logic
- /src/game/ExplodeAndReplacePhase.ts - Match animations
```

### 3. Scene Flow Structure
```
Boot.ts → Preloader.ts → MainMenu.ts → Game.ts → GameOver.ts
```
Each scene in `/src/game/scenes/` handles a specific game state.

### 4. Critical State Management Patterns

#### EventBus Communication
```typescript
// React → Phaser
EventBus.emit('layout-changed', { mapMinimized: true });

// Phaser → React
EventBus.emit('current-scene-ready', this);
EventBus.emit('show-species-dialog', speciesData);
```

#### Game State Flow
1. User input → `Game.ts` scene
2. Scene → `MoveAction.ts` for validation
3. Valid move → `BackendPuzzle.ts` updates model
4. Model → `ExplodeAndReplacePhase.ts` for animations
5. Animations → `BoardView.ts` updates visuals
6. Match found → EventBus notifies React UI

### 5. Key Dependencies & Patterns

#### Clue System Architecture
- `/src/game/clueConfig.ts` - Central configuration
- Matches trigger clue reveals via EventBus
- React components (`ClueSheet.tsx`) display revealed clues

#### Species/Habitat Integration
- Game matches reveal species information
- `/src/lib/speciesService.ts` - Database queries
- `/src/types/database.ts` - TypeScript interfaces

### 6. Development Workflow

#### Initial Setup
```bash
npm install
npm run dev  # Note: Use npm run build && npm run serve for production-like env
```

#### Key Configuration Files
- `/next.config.mjs` - Complex webpack setup for Cesium
- `/.env.local` - Supabase and API keys (copy from `.env.example`)
- `/src/game/constants.ts` - Tweak game parameters here

### 7. Common Development Tasks

#### Adding New Gem Types
1. Update `GEM_TYPES` in `constants.ts`
2. Add sprite in `Preloader.ts`
3. Map to clue category in `clueConfig.ts`

#### Modifying Game Logic
1. Start with `BackendPuzzle.ts` for core mechanics
2. Update `BoardView.ts` for visual changes
3. Modify `Game.ts` scene for input handling

#### Adding UI Overlays
1. Create React component in `/src/components/`
2. Add to `MainAppLayout.tsx`
3. Listen for EventBus events to show/hide

### 8. Testing & Debugging

#### TypeScript Checking
```bash
npm run typecheck        # One-time check
npm run typecheck:watch  # Continuous checking
```

#### Debugging Tips
- Use browser DevTools for Phaser scene inspection
- Add `console.log` in EventBus listeners
- Check `BackendPuzzle.boardState` for game state

### 9. Architecture Gotchas

1. **Static Export**: Project uses `output: 'export'` - some Next.js features unavailable
2. **Scene Lifecycle**: Phaser scenes have init/preload/create/update phases
3. **Asset Loading**: All game assets must be preloaded in `Preloader.ts`
4. **Coordinate Systems**: Phaser uses different coordinate system than React
5. **Event Timing**: React state updates are async, Phaser is sync

### 10. Quick Start Checklist

For a new developer to start contributing:

1. **Read these code files in order:**
   - `EventBus.ts` - Communication pattern
   - `constants.ts` - Game configuration
   - `Game.ts` - Main game scene
   - `BackendPuzzle.ts` - Core logic
   - `BoardView.ts` - Visual representation

2. **Read documentation in this order:**
   - **Week 1 - Core Architecture:**
     - `README.md` - Setup instructions
     - `GAME_REACTIVITY_GUIDE.md` - React-Phaser architecture
     - `EVENTBUS_AND_DISPLAY_ARCHITECTURE.md` - Communication patterns
     - `UI_DISPLAY_SYSTEM_REFERENCE.md` - UI system overview
   
   - **Week 2 - Game Features:**
     - `CLUE_BOARD_IMPLEMENTATION.md` - Core game mechanic
     - `SPECIES_DATABASE_IMPLEMENTATION.md` - Species system
     - `SPECIES_DISCOVERY_IMPLEMENTATION.md` - Discovery feature
     - `DATABASE_USER_GUIDE.md` - Database queries
   
   - **As Needed - Specific Features:**
     - UI work: `SHADCN_IMPLEMENTATION_GUIDE.md`, `LAYOUT_RESTRUCTURE_IMPLEMENTATION.md`
     - Map features: `MAP_MINIMIZE_IMPLEMENTATION.md`, `HABITAT_HIGHLIGHT_IMPLEMENTATION.md`
     - Species UI: `SPECIES_CARD_UI_IMPROVEMENTS.md`, mobile improvement docs
     - Bioregions: `BIOREGION_IMPLEMENTATION.md`, `BIOREGION_FEATURE_SUMMARY.md`

3. **Run the game locally:**
   - Copy `.env.example` to `.env.local`
   - Run `npm install && npm run build && npm run serve`
   - Open `http://localhost:8080`

4. **Make a simple change:**
   - Try changing `BOARD_WIDTH` in `constants.ts`
   - Modify gem colors in `BoardView.ts`
   - Add a console.log in `MoveAction.ts`

## Complete Documentation Overview

### Architecture & Core Systems
- **`GAME_REACTIVITY_GUIDE.md`** - Detailed React-Phaser communication patterns
- **`EVENTBUS_AND_DISPLAY_ARCHITECTURE.md`** - Comprehensive EventBus system documentation
- **`UI_DISPLAY_SYSTEM_REFERENCE.md`** - UI overlay system architecture
- **`PAGE_ROUTING_INFRASTRUCTURE.md`** - Page routing setup and infrastructure

### UI & Component Implementation
- **`SHADCN_IMPLEMENTATION_GUIDE.md`** - UI component library usage with Phaser
- **`LAYOUT_RESTRUCTURE_IMPLEMENTATION.md`** - Layout restructuring implementation details
- **`MAP_MINIMIZE_IMPLEMENTATION.md`** - Map minimize/maximize feature
- **`BOARD_POSITION_FIX.md`** - Board positioning fixes for map interactions

### Species & Database Features
- **`SPECIES_DATABASE_IMPLEMENTATION.md`** - Species database structure and implementation
- **`DATABASE_USER_GUIDE.md`** - Supabase integration and database queries
- **`SPECIES_DISCOVERY_IMPLEMENTATION.md`** - Species discovery gameplay feature
- **`BIOREGION_IMPLEMENTATION.md`** - Bioregion-based habitat classification
- **`BIOREGION_FEATURE_SUMMARY.md`** - Summary of bioregion features
- **`HABITAT_HIGHLIGHT_IMPLEMENTATION.md`** - Map habitat highlighting

### UI Improvements & Fixes
- **`SPECIES_CARD_UI_IMPROVEMENTS.md`** - Species card visual improvements
- **`docs/SPECIES_UI_MOBILE_IMPROVEMENTS.md`** - Mobile-specific UI optimizations
- **`docs/SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md`** - Navigation and dropdown fixes
- **`docs/species-list-improvements.md`** - Species list UI enhancements
- **`STYLE_MAPPING.md`** - Style consistency between components

### Game Features
- **`CLUE_BOARD_IMPLEMENTATION.md`** - Clue board feature implementation
- **`docs/ECOREGION_IMPLEMENTATION.md`** - Ecoregion system documentation

### Project Setup & Guidelines
- **`README.md`** - Project setup and build instructions
- **`CLAUDE.md`** - AI assistant guidelines (useful for understanding project conventions)
- **`USER_ACCOUNTS_MIGRATION_PLAN.md`** - Future user accounts implementation plan

## Code Style Guidelines

- **TypeScript**: Strict mode enabled with full type coverage
- **Imports**: Use `@/` path alias for clean imports
- **React Components**: PascalCase filenames, functional components
- **Game Objects**: Extend Phaser classes, use TypeScript interfaces
- **Event Names**: kebab-case for EventBus events

## Common Patterns

### Adding a New Game Feature
1. Define the feature logic in `BackendPuzzle.ts`
2. Create visual representation in `BoardView.ts`
3. Handle user input in `Game.ts` scene
4. Emit events via EventBus for UI updates
5. Create React components for any UI overlays

### Debugging Game State
```typescript
// In Game.ts scene
console.log('Board state:', this.backendPuzzle.boardState);
console.log('Score:', this.backendPuzzle.score);
console.log('Moves:', this.backendPuzzle.moves);
```

### React-Phaser Communication Example
```typescript
// In Phaser scene
EventBus.emit('species-discovered', {
  speciesId: 123,
  cluesRevealed: ['habitat', 'morphology']
});

// In React component
useEffect(() => {
  const handler = (data) => {
    setDiscoveredSpecies(data.speciesId);
  };
  EventBus.on('species-discovered', handler);
  return () => EventBus.off('species-discovered', handler);
}, []);
```

This architecture allows clean separation between game logic and UI, making it easy to modify either layer independently. The EventBus pattern is crucial for maintaining this separation while allowing communication between React and Phaser.