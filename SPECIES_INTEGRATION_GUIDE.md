# Species Integration Implementation Guide

## Overview

This document describes the implementation of species data integration with the match-3 puzzle game, connecting Supabase database species information to gameplay mechanics through clue reveals.

## Architecture

### 1. Database Layer (`src/lib/speciesService.ts`)
- **Purpose**: Handles all species data queries from Supabase
- **Key Features**:
  - Spatial query support with PostGIS fallback
  - RPC function integration for proper spatial queries
  - Error handling and fallback mechanisms

### 2. Data Types (`src/types/database.ts`)
- **Species Interface**: Complete schema for 'icaa' table
- **Database Types**: TypeScript types for Supabase integration
- Includes all clue-related fields (50+ species attributes)

### 3. Gem Category Mapping (`src/game/gemCategoryMapping.ts`)
- **9 Gem Categories** mapped to species data:
  - 🧬 Classification (Red gems) - Taxonomic info
  - 🌳 Habitat (Green gems) - Environment data
  - 🗺️ Geographic (Blue gems) - Range information
  - 🎨📏 Morphology (Orange gems) - Color, pattern, size & shape
  - 🌿 Diet (Pink gems) - Feeding behavior
  - 💨 Behavior (White gems) - Behavioral traits
  - ⏳ Life Cycle (Black gems) - Reproduction & lifespan
  - 🔒 Conservation (Yellow gems) - Conservation status & threats
  - ⭐ Key Facts (Purple gems) - Notable characteristics

### 4. Game Integration (`src/game/scenes/Game.ts`)
- **Species Selection**: Stores species data from map clicks
- **Match Processing**: Converts gem matches to clue reveals
- **Progress Tracking**: Manages clue count and species transitions
- **UI Updates**: Updates species name display and clue system
- **Auto-Progression**: Automatically advances to next species after all clues revealed
- **Multi-Species Support**: Handles multiple species from a single location

### 5. Map Integration (`src/components/CesiumMap.tsx`)
- **Species Query**: Queries Supabase on map clicks
- **Visual Feedback**: Renders species range circles (MVP)
- **Data Passing**: Sends species data to game via EventBus

### 6. UI Components

#### ClueDisplay (`src/components/ClueDisplay.tsx`)
- **Clue Management**: Displays revealed clues with categories
- **Loading States**: Shows processing feedback
- **Legend Integration**: Toggleable gem category legend

#### GemLegend (`src/components/GemLegend.tsx`)
- **Visual Guide**: Shows gem colors and their meanings
- **Category Icons**: Emoji icons for each clue category
- **Descriptions**: Brief explanations of each category

### 7. High Scores System (`src/pages/highscores.tsx`)
- **Score Tracking**: Records player scores in Supabase
- **Leaderboard**: Displays top scores with player names
- **Real-time Updates**: Uses Supabase subscriptions for live updates

## Workflow

1. **Location Selection**:
   - User clicks on Cesium map
   - Map queries species at location via Supabase
   - Species data passed to game

2. **Game Initialization**:
   - Game stores species data
   - Species name displayed in top UI
   - Random gem board generated

3. **Clue Revealing**:
   - User matches gems of specific colors
   - Game processes matches by gem type
   - Clues revealed based on gem category mapping
   - Clues displayed in bottom UI panel

4. **Species Progression**:
   - First species: reveals clues until all 9 categories shown
   - Auto-advances to next species after 2-second delay
   - Subsequent species: cycles through automatically
   - Species sorted by ogc_fid (lowest first)
   - Reset button returns to map selection

## Database Setup

### Tables Required:

1. **icaa** - Species data table with PostGIS geometry
2. **high_scores** - Player scores and rankings
   ```sql
   CREATE TABLE high_scores (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     player_name TEXT NOT NULL,
     score INTEGER NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE VIEW top_scores AS
   SELECT * FROM high_scores
   ORDER BY score DESC
   LIMIT 100;
   ```

### Required SQL Function (run in Supabase SQL Editor):

```sql
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM icaa
  WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
  ORDER BY ogc_fid ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_species_at_point TO anon;
GRANT EXECUTE ON FUNCTION get_species_at_point TO authenticated;
```

## Event System

### EventBus Events (`src/game/EventBus.ts`):
- `cesium-location-selected`: Map → Game species data
- `new-game-started`: Game → UI species name
- `clue-revealed`: Game → UI clue data
- `game-reset`: UI → Game reset state
- `all-clues-revealed`: Game → UI all categories complete
- `all-species-completed`: Game → UI all species at location done
- `no-species-found`: Map → UI no species at clicked location

## Configuration

### Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Gem Color Mapping:
- Red (0) → Classification clues
- Green (1) → Habitat clues  
- Blue (2) → Geographic clues
- Orange (3) → Morphology clues (color, pattern, size, shape)
- Pink (4) → Diet clues
- White (5) → Behavior clues
- Black (6) → Life Cycle clues
- Yellow (7) → Conservation clues
- Purple (8) → Key Facts clues

## Current State (MVP)

### ✅ Completed Features:
- Supabase integration with species table
- Gem category mapping system (9 categories)
- Clue reveal mechanics
- Species name display
- Interactive gem legend
- Loading states for database queries
- Species range visualization (circles)
- Exit/reset functionality
- High scores system with leaderboard
- Automatic species progression
- Multi-species location support
- TypeScript conversion of game files

### 🔄 For Future Enhancement:
- Actual polygon rendering from PostGIS geometry
- Sound effects for clue reveals
- Species completion tracking/progress per player
- Visual feedback for matched gem categories
- Species collection system
- Achievement system
- User profiles and authentication
- Difficulty levels based on species rarity

## Testing

### Manual Testing Flow:
1. Start application: `npm run dev`
2. Click on Cesium map to select location
3. Verify species data loads and displays
4. Match gems of different colors
5. Verify clues appear in bottom panel (9 categories)
6. Confirm auto-progression to next species after all clues
7. Test exit button functionality
8. Verify gem legend displays all 9 categories
9. Check high scores page at `/highscores`
10. Complete a game and verify score submission

### Type Checking:
```bash
npm run typecheck
```

## Performance Considerations

- Species queries limited to 10 results for MVP
- 9 gem categories require 9 different matches minimum
- Client-side clue processing (instant)
- Lazy loading of species polygons
- Efficient EventBus communication
- Minimal re-renders in React components

## File Structure

```
src/
├── lib/
│   ├── speciesService.ts        # Database queries
│   └── supabaseClient.ts        # Supabase client config
├── types/
│   └── database.ts              # TypeScript types
├── game/
│   ├── gemCategoryMapping.ts    # Clue logic (9 categories)
│   ├── scenes/
│   │   ├── Boot.ts              # Initial setup
│   │   ├── Preloader.ts         # Asset loading
│   │   ├── MainMenu.ts          # Title screen
│   │   ├── Game.ts              # Game integration
│   │   └── GameOver.ts          # End screen
│   ├── BackendPuzzle.ts         # Game logic
│   ├── BoardView.ts             # Board rendering
│   ├── MoveAction.ts            # Gem swapping
│   ├── ExplodeAndReplacePhase.ts # Match animations
│   ├── constants.ts             # Game config
│   └── EventBus.ts              # Event system
├── pages/
│   ├── index.tsx                # Main app page
│   └── highscores.tsx           # Leaderboard page
├── components/
│   ├── CesiumMap.tsx            # Map integration
│   ├── ClueDisplay.tsx          # Clue UI
│   └── GemLegend.tsx            # Legend component
└── MainAppLayout.tsx            # Main layout
```

## TypeScript Migration Status

The project has successfully migrated most JavaScript files to TypeScript:
- ✅ All React components (.tsx files)
- ✅ All game scenes (Boot.ts, Game.ts, etc.)
- ✅ Core game logic (BackendPuzzle.ts, MoveAction.ts, etc.)
- ✅ Event system (EventBus.ts)
- ✅ Constants and configurations
- 🔄 BoardView.ts (partial conversion with .js.new backup)

This implementation provides a solid foundation for the species-based educational game mechanics while maintaining clean code architecture and extensibility for future features.