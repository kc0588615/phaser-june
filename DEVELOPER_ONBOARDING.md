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
   - Game flow orchestration and move summary tracking
   - Turn management with combo multipliers & clue bonuses
   - Pause overlay lifecycle (tweens/timeScale/input)
   - Event emission to React (score, moves used/max, multipliers)

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
EventBus.emit('game-hud-updated', {
  score,
  movesUsed,
  maxMoves,
  multiplier,        // streak-based multiplier
  moveMultiplier     // per-move combo multiplier (optional)
});

// React → Phaser
EventBus.emit('layout-changed', { mapMinimized: true });
```

### Critical Event Flows

1. **Species Selection & Game Loop**
   - User clicks location on Cesium map
   - `cesium-location-selected` event → Phaser with species array & raster data
   - Game loads first mystery species (sorted by ogc_fid) and resets move summary
   - Player matches gems to reveal clues (multi-clue bursts supported)
   - Player guesses species via SpeciesGuessSelector
   - `species-guess-submitted` event → Phaser validates guess
   - Correct guess advances to next species or prompts new location
   - `all-species-completed` event → React when a location is cleared

2. **Move Resolution & HUD Synchronisation**
   - Player performs a valid swap → `Game.ts::applyMoveAndHandleResults`
   - Move summary aggregates largest match, cascades, colours
   - Combo multiplier calculated (4-match = 2 clues, 5+ = all clues)
   - `game-hud-updated` event → React with `movesUsed/maxMoves`, streak multiplier, move multiplier

3. **Layout Changes**
   - User toggles map/panels
   - `layout-changed` event → Phaser
   - Game resizes canvas appropriately

4. **Pause & Resume**
   - Pause icon lives in `Game.ts::createPauseControls`
   - Clicking pause invokes `togglePause(true)` → freezes tweens, sets `time.timeScale = 0`, shows overlay
   - Overlay resume button emits `togglePause(false)` → restores time scale/input and replays HUD

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
│   ├── CesiumMap.tsx       # 3D habitat map
│   ├── UserMenu.tsx        # Auth state display & sign out
│   ├── SpeciesCard.tsx     # Species card with discovery badges
│   └── SpeciesList.tsx     # Species catalog with React Query
│
├── pages/                  # Next.js pages
│   ├── _app.tsx           # App wrapper with QueryClient
│   ├── index.tsx          # Main game page
│   ├── login.tsx          # Login/signup page
│   └── auth/
│       └── callback.tsx   # OAuth callback handler
│
├── hooks/                  # Custom React hooks
│   └── useSpeciesData.ts   # React Query species fetching
│
└── lib/                    # Utilities & services
    ├── supabase-browser.ts # Browser client for auth/database
    ├── auth-actions.ts     # Sign in/out/up functions
    ├── playerTracking.ts   # Player statistics tracking service
    ├── supabaseClient.ts   # Database connection (legacy)
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

**Data Fetching Architecture:**
- Uses **React Query** (`@tanstack/react-query`) for all species data fetching
- Automatic retries: 3 attempts with exponential backoff (1s, 2s, 4s delays)
- Smart caching: 5-minute stale time, 10-minute garbage collection
- Network resilience: Refetch on window focus and reconnect
- Custom hook: `src/hooks/useSpeciesData.ts` encapsulates all fetch logic
- Error recovery: Manual "Retry Now" button in SpeciesList error UI

**Database Schema Setup:**
Run these SQL files in Supabase SQL Editor (in order):
1. `supabase_create_profiles_table.sql` - User profiles with RLS
2. `supabase_create_player_stats_system.sql` - Player statistics (4 tables + materialized view)

**Required Tables:**
- `profiles` - User profile data (auto-created on signup)
- `player_game_sessions` - Individual gameplay sessions
- `player_species_discoveries` - Species discovery tracking
- `player_clue_unlocks` - Granular clue revelation tracking
- `player_stats` - Aggregate statistics (auto-updated via triggers)
- `player_leaderboard` - Materialized view for rankings

### 3. Authentication Setup

**Supabase Auth Configuration:**
- Email/password authentication enabled
- Google OAuth configured (requires Google Cloud Console setup)
- PKCE flow for secure OAuth redirects
- Static site compatible (browser-only client)

**Google OAuth Setup:**
1. Create OAuth 2.0 Client ID in Google Cloud Console
2. Configure authorized redirect URIs:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
   - `http://localhost:8080/auth/callback` (for development)
3. Add Client ID and Secret to Supabase Dashboard → Authentication → Providers → Google

**Authentication Files:**
- `src/lib/supabase-browser.ts` - Browser client for auth/database
- `src/lib/auth-actions.ts` - Sign in/out/up functions
- `src/pages/login.tsx` - Login/signup page UI
- `src/pages/auth/callback.tsx` - OAuth callback handler (PKCE exchange)
- `src/components/UserMenu.tsx` - Auth state display component

**Auth Flow:**
1. User clicks "Sign in with Google" or submits email/password
2. Supabase initiates auth flow (redirects for OAuth, direct for email)
3. OAuth redirects to `/auth/callback` with PKCE code
4. Callback page exchanges code for session via `exchangeCodeForSession()`
5. UserMenu component listens to `onAuthStateChange()` and updates UI
6. Profile automatically created via database trigger

### 4. Development Workflow
```bash
# Type checking (always run before commits)
npm run typecheck

# Development server
npm run dev        # http://localhost:8080

# Production build (static export)
npm run build      # outputs to ./dist
npm run serve      # serves ./dist on http://localhost:8080
```

## 📊 Player Statistics & Tracking System

### Architecture Overview

The game implements a comprehensive player statistics system tracking all gameplay metrics with offline support and automatic aggregation.

**Key Files:**
- `src/lib/playerTracking.ts` - Main tracking service
- `src/types/database.ts` - TypeScript interfaces for all tables
- `supabase_create_player_stats_system.sql` - Database schema and triggers

### Database Schema

#### 1. player_game_sessions
Tracks individual gameplay sessions with start/end times and session totals.

```typescript
interface PlayerGameSession {
  id: string;
  player_id: string;
  started_at: string;
  ended_at?: string;
  total_moves: number;
  total_score: number;
  species_discovered_in_session: number;
  clues_unlocked_in_session: number;
}
```

#### 2. player_species_discoveries
Records each species discovery with detailed metrics.

```typescript
interface PlayerSpeciesDiscovery {
  id: string;
  player_id: string;
  species_id: number;
  session_id?: string;
  discovered_at: string;
  time_to_discover_seconds?: number;
  clues_unlocked_before_guess: number;
  incorrect_guesses_count: number;
  score_earned: number;
}
```

#### 3. player_clue_unlocks
Granular tracking of individual clue revelations (single source of truth).

```typescript
interface PlayerClueUnlock {
  id: string;
  player_id: string;
  species_id: number;
  discovery_id: string;
  clue_category: string; // 'classification', 'habitat', etc.
  clue_field: string;    // 'phylum', 'realm', etc.
  clue_value?: string;
  unlocked_at: string;
}
```

#### 4. player_stats
Aggregate statistics auto-updated via database triggers.

```typescript
interface PlayerStats {
  player_id: string; // Primary key
  total_species_discovered: number;
  total_clues_unlocked: number;
  total_score: number;
  total_moves_made: number;
  total_games_played: number;
  total_play_time_seconds: number;
  average_clues_per_discovery: number;
  fastest_discovery_clues?: number;
  slowest_discovery_clues?: number;
  average_time_per_discovery_seconds?: number;

  // Taxonomic coverage (JSONB)
  species_by_order: Record<string, number>;
  species_by_family: Record<string, number>;
  species_by_genus: Record<string, number>;

  // Geographic coverage (JSONB)
  species_by_realm: Record<string, number>;
  species_by_biome: Record<string, number>;
  species_by_bioregion: Record<string, number>;

  // Habitat distribution
  marine_species_count: number;
  terrestrial_species_count: number;
  freshwater_species_count: number;
  aquatic_species_count: number;

  // Conservation awareness
  species_by_iucn_status: Record<string, number>;

  // Clue category mastery (JSONB)
  clues_by_category: Record<string, number>;
  favorite_clue_category?: string;

  // Timestamps
  first_discovery_at?: string;
  last_discovery_at?: string;
}
```

#### 5. player_leaderboard (Materialized View)
Fast queries for rankings and comparisons.

```typescript
interface PlayerLeaderboard {
  user_id: string;
  username?: string;
  total_species_discovered: number;
  total_score: number;
  average_clues_per_discovery: number;
  total_play_time_seconds: number;
  rank_by_discoveries: number;
  rank_by_score: number;
  rank_by_efficiency: number;
}
```

### Player Tracking Service API

**Session Management:**
```typescript
// Start or resume a game session (handles React Strict Mode duplicates)
startGameSession(playerId: string): Promise<string | null>

// End current session
endGameSession(sessionId: string, finalMoves: number, finalScore: number): Promise<void>

// Update session progress (DEBOUNCED - 10 seconds)
updateSessionProgress(
  sessionId: string,
  moves: number,
  score: number,
  speciesDiscovered: number,
  cluesUnlocked: number
): Promise<void>

// Force immediate update (for critical events)
forceSessionUpdate(...): Promise<void>

// Get current session ID
getCurrentSessionId(): string | null
```

**Discovery Tracking:**
```typescript
// Track a clue unlock
// Returns: true (new), false (duplicate), null (error)
trackClueUnlock(
  playerId: string,
  speciesId: number,
  clueCategory: string,
  clueField: string,
  clueValue?: string,
  discoveryId?: string
): Promise<boolean | null>

// Track species discovery (links pending clues)
trackSpeciesDiscovery(
  playerId: string,
  speciesId: number,
  options: {
    sessionId?: string;
    timeToDiscoverSeconds?: number;
    cluesUnlockedBeforeGuess: number;
    incorrectGuessesCount: number;
    scoreEarned: number;
  }
): Promise<string | null> // Returns discovery_id

// Calculate time to discover current species
calculateTimeToDiscover(): number | null

// Get clue count for specific species
getClueCountForSpecies(playerId: string, speciesId: number): Promise<number>
```

**Offline Support:**
```typescript
// Process queued writes (called on reconnect)
processOfflineQueue(playerId: string): Promise<void>
```

### Key Features

**1. Offline Queue:**
- Failed writes stored in localStorage
- Automatic retry on visibility change (tab focus)
- Queue persists across page reloads
- SSR-safe (guards all window/localStorage access)

**2. Session Management:**
- Prevents duplicate sessions (React Strict Mode safe)
- Resumes existing open session on page reload
- Tracks per-species timing (reset after each discovery)
- Debounced HUD updates (10s) to reduce database load
- Force flush option for critical events

**3. Discovery ID Linking:**
- Clues tracked before discovery stored as "pending"
- Bulk updated with discovery_id after species discovered
- Maintains referential integrity

**4. Automatic Aggregation:**
- Database triggers auto-update player_stats
- UPSERT pattern ensures stats row always exists
- Materialized view for fast leaderboard queries
- CONCURRENT refresh supported via unique index

**5. Row Level Security:**
- Users can only read/write their own data
- Leaderboard publicly viewable
- All policies enforce auth.uid() checks

### Integration Example

```typescript
// In Game.ts scene
import {
  startGameSession,
  trackClueUnlock,
  trackSpeciesDiscovery,
  updateSessionProgress,
  getCurrentSessionId,
  calculateTimeToDiscover
} from '@/lib/playerTracking';

// On game start
async create() {
  const user = await supabase.auth.getUser();
  if (user.data.user) {
    const sessionId = await startGameSession(user.data.user.id);
  }
}

// On clue revealed
EventBus.on('clue-revealed', async (data) => {
  const user = await supabase.auth.getUser();
  if (user.data.user) {
    await trackClueUnlock(
      user.data.user.id,
      this.currentSpeciesId,
      data.category,
      data.field,
      data.value
    );
  }
});

// On species discovered
EventBus.on('species-guess-submitted', async (data) => {
  if (data.isCorrect) {
    const user = await supabase.auth.getUser();
    if (user.data.user) {
      const discoveryId = await trackSpeciesDiscovery(
        user.data.user.id,
        data.speciesId,
        {
          sessionId: getCurrentSessionId(),
          timeToDiscoverSeconds: calculateTimeToDiscover(),
          cluesUnlockedBeforeGuess: this.clueCount,
          incorrectGuessesCount: this.incorrectGuesses,
          scoreEarned: this.currentScore
        }
      );
    }
  }
});

// On HUD update (debounced automatically)
EventBus.on('game-hud-updated', async (data) => {
  const sessionId = getCurrentSessionId();
  if (sessionId) {
    await updateSessionProgress(
      sessionId,
      data.movesUsed,
      data.score,
      this.speciesDiscovered,
      this.cluesUnlocked
    );
  }
});
```

### localStorage Migration

**Current State:**
- Guest users still use localStorage for discoveries
- `discoveredSpecies` key stores local discoveries
- Custom DOM events for cross-component sync

**TODO - Migration Service:**
Create `src/services/discoveryMigrationService.ts` to:
1. Detect first login after guest play
2. Migrate localStorage discoveries to database
3. Preserve timestamps if available
4. Mark migration complete to prevent duplicates

See `USER_ACCOUNTS_MIGRATION_PLAN.md` for full migration strategy.

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
- `Game.ts::applyMoveAndHandleResults()` - Aggregates move summary, applies combo multipliers
- `Game.ts::revealCluesForCategory()` / `revealAllCluesForCategory()` - Implements 4-match (2 clues) and 5-match (all clues) bonuses
- `Game.ts::togglePause()` - Controls pause overlay and input freezing
- `BackendPuzzle::registerMove()` - Increments moves used (counts up to `MAX_MOVES`)
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

### Integrating Player Tracking
1. Import functions from `src/lib/playerTracking.ts`
2. Get authenticated user via `supabase.auth.getUser()`
3. Call tracking functions on game events:
   - `startGameSession()` on game start
   - `trackClueUnlock()` on clue revealed
   - `trackSpeciesDiscovery()` on correct guess
   - `updateSessionProgress()` on HUD update
4. Handle offline queue on reconnect
5. Test with both authenticated and guest users

### Adding Statistics to Dashboard
1. Query `player_stats` table for user data
2. Use JSONB operators for category breakdowns:
   ```typescript
   const { data } = await supabase
     .from('player_stats')
     .select('species_by_order, total_species_discovered')
     .eq('player_id', userId)
     .single();
   ```
3. Create UI components with shadcn/ui charts
4. Consider caching with React Query
5. Refresh materialized view periodically:
   ```sql
   SELECT public.refresh_player_leaderboard();
   ```

## 🐛 Debugging Tips

### Phaser Inspector
- Press F12 → Console → `game.scene.scenes[0]`
- Inspect board state: `game.board`
- Check gem positions: `game.boardView.gems`

### React DevTools
- Monitor EventBus events in console
- Check species state in SpeciesPanel
- Verify clue updates in ClueSheet

- **Move Resolution & Multipliers**
  - Move summary captures largest match size, unique gem categories, cascades
  - Combo multiplier rules (config in `constants.ts`):
    - 4-match ⇒ `MULTIPLIER_LARGE_MATCH` + two clues for that category
    - 5-match or greater ⇒ `MULTIPLIER_HUGE_MATCH` + all remaining clues
    - Multi-colour matches ⇒ `MULTIPLIER_MULTI_CATEGORY`
    - Consecutive same-colour matches ⇒ `MULTIPLIER_REPEAT_CATEGORY` + full clue burst
  - `game-hud-updated` now publishes `movesUsed`, `maxMoves`, and `moveMultiplier`

- **Pause Overlay**
  - Pause button rendered in `createPauseControls()`
  - Overlay freezes tweens (`this.tweens.pauseAll()`), timers (`timeScale = 0`), and hides board input
  - Resume restores prior `canMove` state and removes overlay

### Common Issues
1. **Gems not swapping**: Check `MoveAction.ts` validation
2. **Clues not updating**: Verify EventBus connection
3. **Layout issues**: Check z-index in components
4. **Species not loading**:
   - Check browser console for React Query retry attempts
   - Verify Supabase connection and env vars
   - Use "Retry Now" button in SpeciesList error UI
   - React Query will auto-retry 3 times with exponential backoff

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

### 5. React Query Data Fetching
- Replaces manual useState/useEffect patterns
- Automatic retry logic with exponential backoff
- Built-in caching and stale-while-revalidate
- Request deduplication across components
- See `src/hooks/useSpeciesData.ts` for implementation example

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

### Authentication & User System

#### `USER_ACCOUNTS_MIGRATION_PLAN.md`
**User Accounts Architecture** - Comprehensive plan for user authentication, database storage, and localStorage migration strategy. Includes detailed RLS policies, migration service design, and real-time sync patterns.

**Status:** Partially implemented
- ✅ Supabase Auth with email + Google OAuth
- ✅ User profiles table with RLS
- ✅ Player statistics system (4 tables + materialized view)
- ✅ Player tracking service with offline support
- ⏳ TODO: localStorage migration service
- ⏳ TODO: Player stats dashboard UI
- ⏳ TODO: EventBus integration in Game.ts

### Game Design & User Experience

#### `gamification.md`
**Kid-Friendly Enhancement Plan** - Comprehensive gamification proposal to transform the educational quiz into an engaging discovery adventure. Includes visual species reveal systems, guide characters (Dr. Discovery owl), collections & achievements, celebration systems, and mini-games. Detailed implementation phases with priority rankings.

#### `gameTime.md`
**Match Flow & Move Economy** - Documents the move-based scoring loop with upward counting moves (toward 50-move budget), combo multipliers (4-match → 2 clues, 5-match → all clues), and pause overlay mechanics. Explains the complete move resolution pipeline from pointer events through clue rewards and HUD updates.

### Critical Fixes & Production Issues

#### `P0_FIXES_PROPOSAL.md`
**Security & Stability Review** - Initial proposal for two P0 blockers: race condition in map clicks during cascades (queue guard implementation) and server-side score validation (PostgreSQL function with multi-layer validation and rate limiting). Includes detailed SQL migrations and TypeScript integration.

#### `P0_FIXES_REVISED.md`
**Post-Codex Review Fixes** - Revised implementation addressing critical issues found in initial proposal: queue draining bugs, rate limit race conditions, production data loss risks, and O(n) rank calculations. Includes advisory locks, idempotent migrations, and optimized leaderboard views.

### Player Statistics & Tracking

#### `PLAYER_TRACKING_INTEGRATION_PLAN.md`
**Revised Tracking Integration** - Complete guide to integrating player statistics tracking into Game.ts. Addresses Codex-identified bugs: wrong property references, memory leaks, performance issues, and session cleanup. Includes event handlers, discovery tracking, localStorage migration service, and testing checklist.

#### `PLAYER_TRACKING_IMPLEMENTATION_SUMMARY.md`
**Implementation Complete Summary** - Status document confirming all tracking integration changes. Details 8 sections modified in Game.ts, migration service creation, OAuth callback trigger, and comprehensive fixes for memory leaks, performance optimization, and data loss prevention.

#### `PLAYER_STATS_DASHBOARD_FIX_PLAN.md`
**Dashboard Complete Fix Plan** - Addresses all crash bugs, null handling issues, and performance problems in PlayerStatsDashboard component. Includes safe helper functions, computed values with useMemo, conditional rendering strategies, empty state detection, and progress bar safety guards.

#### `PLAYER_STATS_DASHBOARD_FINAL_REVIEW.md`
**Production Ready Review** - Final Codex review confirming production readiness. Documents fixes for NaN/Infinity in averages, incomplete IUCN status colors, whitespace-only player names, and clue collection empty states. Includes comprehensive testing checklist and performance characteristics.

#### `PLAYER_STATS_DASHBOARD_INTEGRATION.md`
**Dashboard Integration Complete** - Documents complete integration of PlayerStatsDashboard including routing (`/stats`), authentication guards, data fetching service layer, UserMenu navigation button, and all created/modified files. Includes user flow diagrams, testing scenarios, troubleshooting guide, and deployment checklist.

### UI & Layout Refinements

#### `RESPONSIVE_BOARD_SCALING_FIX.md`
**Board Scaling and Centering** - Fixes for game board positioning and scaling issues. Implements responsive breakpoint system (mobile < 768px: left-aligned, desktop ≥ 768px: centered), maximum gem size constraints (80px), and dynamic scaling calculations. Improves both mobile space usage and desktop visual balance.

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
- [ ] Database schema deployed (profiles + player stats)
- [ ] Google OAuth configured (if using social auth)
- [ ] Build succeeds (`npm run build`)
- [ ] Game loads at localhost:8080
- [ ] Authentication works (login/signup)
- [ ] Can select a species
- [ ] Can make gem matches
- [ ] Clues appear after matches
- [ ] Map displays properly
- [ ] UserMenu shows auth state

## 💡 Pro Tips

1. **Always run typecheck** before committing
2. **Test on multiple screen sizes** - responsive design matters
3. **Use EventBus** for all React-Phaser communication
4. **Follow existing patterns** - consistency is key
5. **Check CLAUDE.md** for project conventions

---

Welcome to the team! Start by exploring the Game.ts scene and making a simple gem match to understand the flow. 🎮🌿
