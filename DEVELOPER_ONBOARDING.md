# Developer Onboarding Guide

## Quick Start for New Contributors

This guide helps new developers quickly understand the codebase structure and start contributing to the Phaser + Cesium + Supabase habitat puzzle game.

Quick links:
- Project README: `README.md`
- Event system: `EVENTBUS_AND_DISPLAY_ARCHITECTURE.md`, `GAME_REACTIVITY_GUIDE.md`
- Data & database: `DATABASE_USER_GUIDE.md`, `SPECIES_DATABASE_IMPLEMENTATION.md`
- UI & styling: `SHADCN_IMPLEMENTATION_GUIDE.md`, `UI_DISPLAY_SYSTEM_REFERENCE.md`

## 🎮 Core Gameplay Architecture

### Game State Management (MVC Pattern)

```
┌─────────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  BackendPuzzle.ts   │  ←→   │   Game.ts Scene  │  ←→   │  BoardView.ts   │
│      (Model)        │       │   (Controller)   │       │     (View)      │
└─────────────────────┘       └──────────────────┘       └─────────────────┘
         ↑                              ↓                           ↓
         │                         EventBus.ts                      │
         │                              ↓                           │
         └──────────────────────  React UI Layer  ─────────────────┘
```

### Key Files for Gameplay

1. **src/game/BackendPuzzle.ts** - Core game logic
   - Board state management
   - Match detection algorithms
   - Score calculation
   - Game rules enforcement

2. **src/game/BoardView.ts** - Visual representation
   - Gem sprite rendering
   - Animation sequences
   - Visual effects
   - Board layout calculations

3. **src/game/scenes/Game.ts** - Main gameplay controller
   - Input handling (mouse/touch)
   - Game flow orchestration
   - Turn management
   - Event emission to React

4. **src/game/MoveAction.ts** - Gem swapping mechanics
   - Swap validation
   - Animation coordination
   - Move completion callbacks

5. **src/game/ExplodeAndReplacePhase.ts** - Match resolution
   - Explosion animations
   - Board refill logic
   - Cascade detection

## 🔄 React-Phaser Communication

### EventBus Pattern

The game uses a singleton EventBus for bidirectional communication:

```typescript
// Phaser → React
EventBus.emit('match-made', { 
  gemTypes: matchedGems, 
  clueCategory: category 
});

// React → Phaser
EventBus.emit('layout-changed', { 
  mapMinimized: true 
});
```

### Critical Event Flows

1. **Species Selection & Game Loop**
   - User clicks location on Cesium map
   - `cesium-location-selected` event → Phaser with species array
   - Game loads first mystery species (sorted by ogc_fid)
   - Player matches gems to reveal clues
   - `clue-revealed` event → React for each new clue
   - Player guesses species via SpeciesGuessSelector
   - `species-guess-submitted` event → Phaser for validation
   - If correct and more species exist: advance to next
   - If correct and last species: prompt for new location
   - `all-species-completed` event → React when all discovered

2. **Match Detection**
   - Player makes match in Phaser
   - `match-made` event → React (if implemented)
   - `clue-revealed` event → React with clue data
   - ClueSheet and SpeciesPanel update with new info

3. **Layout Changes**
   - User toggles map/panels
   - `layout-changed` event → Phaser
   - Game resizes canvas appropriately

## 📁 Project Structure

```
src/
├── game/                    # Phaser game engine code
│   ├── scenes/             # Game scenes (Boot, Game, etc.)
│   ├── BackendPuzzle.ts    # Core game logic
│   ├── BoardView.ts        # Visual rendering
│   ├── EventBus.ts         # React-Phaser bridge
│   └── constants.ts        # Game configuration
│
├── components/             # React UI components
│   ├── SpeciesPanel.tsx    # Species display
│   ├── ClueSheet.tsx       # Clue revelation UI
│   ├── GemLegend.tsx       # Gem type reference
│   └── CesiumMap.tsx       # 3D habitat map
│
├── pages/                  # Next.js pages
│   ├── _app.tsx           # App wrapper
│   └── index.tsx          # Main game page
│
└── lib/                    # Utilities & services
    ├── supabaseClient.ts   # Database connection
    └── speciesService.ts   # Species data API
```

## 🚀 Initialization Steps

### 1. Environment Setup
```bash
# Clone and install
git clone [repo]
cd phaser-june
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with required API keys
# Required:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_CESIUM_ION_TOKEN
# Optional:
#   NEXT_PUBLIC_TITILER_BASE_URL
#   NEXT_PUBLIC_COG_URL
```

### 2. Database Setup
- Ensure Supabase connection is configured
- Run SQL functions in root directory if needed
- Verify species data is accessible

### 3. Development Workflow
```bash
# Type checking (always run before commits)
npm run typecheck

# Development server
npm run dev        # http://localhost:8080

# Production build (static export)
npm run build      # outputs to ./dist
npm run serve      # serves ./dist on http://localhost:8080
```

## 🎮 Game Loop & Species Progression

### Species Discovery Flow
1. **Location Selection**: Player clicks on Cesium map
2. **Species Queue**: Multiple species loaded (sorted by ogc_fid)
3. **Mystery Species**: Each species presented as "Mystery Species"
4. **Clue Collection**: Match gems to reveal clues about current species
5. **Species Guess**: Player can guess at any time via dropdown
6. **Progression Logic**:
   - Correct guess + more species → Advance to next mystery
   - Correct guess + last species → Complete location, prompt for new
   - All clues revealed → Encourage guessing (no auto-advance)

### Key Implementation Details
- `Game.ts::handleSpeciesGuess()` - Manages species progression
- `Game.ts::advanceToNextSpecies()` - Moves to next in queue
- `Game.ts::resetForNewLocation()` - Clears state for new location
- Species state tracked via `currentSpeciesIndex` and `currentSpecies[]`
- Duplicate notifications prevented via React ref in SpeciesPanel

## 🎯 Common Development Tasks

### Adding a New Gem Type
1. Update `src/game/constants.ts` - Add to GEM_TYPES
2. Add sprite asset to `public/assets/`
3. Update `src/game/clueConfig.ts` - Map to clue category
4. Update `src/components/GemLegend.tsx` - Add to legend

### Creating a New UI Component
1. Use shadcn/ui components as base
2. Place in `src/components/`
3. Emit events via EventBus for game interaction
4. Follow existing z-index patterns for layering

### Modifying Game Logic
1. Start with `BackendPuzzle.ts` for rules
2. Update `BoardView.ts` for visual changes
3. Coordinate in `Game.ts` scene
4. Test match detection thoroughly

## 🐛 Debugging Tips

### Phaser Inspector
- Press F12 → Console → `game.scene.scenes[0]`
- Inspect board state: `game.board`
- Check gem positions: `game.boardView.gems`

### React DevTools
- Monitor EventBus events in console
- Check species state in SpeciesPanel
- Verify clue updates in ClueSheet

### Common Issues
1. **Gems not swapping**: Check `MoveAction.ts` validation
2. **Clues not updating**: Verify EventBus connection
3. **Layout issues**: Check z-index in components
4. **Species not loading**: Verify Supabase connection

## 📚 Key Concepts to Understand

### 1. Phaser Scene Lifecycle
```typescript
preload() → create() → update()
```

### 2. Match-3 Algorithm
- Horizontal/vertical scanning
- Minimum 3 gems to match
- Cascade handling after matches

### 3. Species-Gem Relationship
- Each species has associated gem colors
- Matches reveal clues about species
- 8 clue categories total

### 4. State Synchronization
- Phaser owns game state
- React owns UI state
- EventBus keeps them in sync

## 🔧 Tools & Commands

```bash
# Type checking
npm run typecheck
npm run typecheck:watch

# Build & serve static export
npm run build
npm run serve

# Development server
npm run dev
```

## 📖 Documentation Catalog

### Core Architecture & Patterns

#### `CLAUDE.md`
**AI Assistant Guidelines** - Instructions for Claude AI when working with this codebase. Includes project overview, architecture patterns, and coding conventions.

#### `GAME_REACTIVITY_GUIDE.md`
**Event System Documentation** - Comprehensive guide to the EventBus pattern connecting React and Phaser. Details all events, their payloads, and usage examples.

#### `UI_DISPLAY_SYSTEM_REFERENCE.md`
**UI Architecture Reference** - Complete documentation of the UI layer, component hierarchy, and display system patterns.

#### `EVENTBUS_AND_DISPLAY_ARCHITECTURE.md`
**EventBus Deep Dive** - Technical details of the event-driven architecture, including event flow diagrams and best practices.

### UI Components & Implementation

#### `SHADCN_IMPLEMENTATION_GUIDE.md`
**UI Component Library Guide** - How to use shadcn/ui components, theming, and styling conventions in the project.

#### `CLUE_BOARD_IMPLEMENTATION.md`
**Clue System Architecture** - Details the match-3 to clue revelation system, including gem mappings, toast notifications, and UI components.

#### `SPECIES_CARD_UI_IMPROVEMENTS.md`
**Species Card Enhancements** - Documents responsive design improvements, layout optimizations, and interactive features for species cards.

#### `LAYOUT_RESTRUCTURE_IMPLEMENTATION.md`
**Layout System Refactoring** - Major UI restructuring documentation, including the move from grid to flex layouts.

### Feature Implementations

#### `MAP_MINIMIZE_IMPLEMENTATION.md`
**Cesium Map Toggle Feature** - Implementation of the collapsible map feature, including state management and responsive behavior.

#### `SPECIES_DISCOVERY_IMPLEMENTATION.md`
**Species Discovery System** - How species are revealed through gameplay, including local storage persistence and UI updates.

#### `HABITAT_HIGHLIGHT_IMPLEMENTATION.md`
**Habitat Visualization** - Integration of habitat data with Cesium map, including highlighting and interaction features.

#### `BIOREGION_IMPLEMENTATION.md` & `BIOREGION_FEATURE_SUMMARY.md`
**Bioregion Features** - Spatial data integration, filtering by geographic regions, and bioregion-based species grouping.

### Database & Backend

#### `DATABASE_USER_GUIDE.md`
**Database Schema & Usage** - Supabase integration, table structures, and query patterns for species data.

#### `SPECIES_DATABASE_IMPLEMENTATION.md`
**Species Data Architecture** - Complete implementation of species data fetching, caching, and display logic.

### Specialized Guides

#### `CESIUM_UI_CUSTOMIZATION.md`
**3D Map Customization** - How to modify Cesium map appearance, controls, and integration with game features.

#### `BOARD_POSITION_FIX.md`
**Game Board Positioning** - Solutions for responsive game board placement and scaling issues.

#### `STYLE_MAPPING.md`
**CSS Architecture** - Mapping of styles between components, Tailwind utilities, and custom CSS.

#### `PAGE_ROUTING_INFRASTRUCTURE.md`
**Next.js Routing Setup** - Page structure, static export configuration, and routing patterns.

### Planning Documents

#### `USER_ACCOUNTS_MIGRATION_PLAN.md`
**Future User System** - Planning document for implementing user accounts, authentication, and progress saving.

### 📁 `/docs` Directory

Additional implementation guides in the `/docs` folder:

#### `docs/ECOREGION_IMPLEMENTATION.md`
**Ecoregion Filtering** - Implementation of geographic filtering, including realm and biome-based species browsing.

#### `docs/SPECIES_UI_BREADCRUMB_AND_DROPDOWN_FIX.md`
**Navigation Improvements** - Breadcrumb navigation for species cards and fixes for dropdown selection issues.

#### `docs/SPECIES_UI_MOBILE_IMPROVEMENTS.md`
**Mobile Optimization** - Mobile-first UI improvements, screen space optimization, and touch interaction enhancements.

#### `docs/species-list-improvements.md`
**Species List Features** - Search functionality, sticky headers, and performance optimizations for large species lists.

## 🚦 Getting Started Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] Build succeeds (`npm run build`)
- [ ] Game loads at localhost:8080
- [ ] Can select a species
- [ ] Can make gem matches
- [ ] Clues appear after matches
- [ ] Map displays properly

## 💡 Pro Tips

1. **Always run typecheck** before committing
2. **Test on multiple screen sizes** - responsive design matters
3. **Use EventBus** for all React-Phaser communication
4. **Follow existing patterns** - consistency is key
5. **Check CLAUDE.md** for project conventions

---

Welcome to the team! Start by exploring the Game.ts scene and making a simple gem match to understand the flow. 🎮🌿
