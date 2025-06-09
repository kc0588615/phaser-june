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
- **8 Gem Categories** mapped to species data:
  - 🧬 Classification (Red gems) - Taxonomic info
  - 🌳 Habitat (Green gems) - Environment data
  - 🗺️ Geographic (Blue gems) - Range information
  - 🎨 Color & Pattern (Yellow gems) - Appearance
  - 📏 Size & Shape (Orange gems) - Physical dimensions
  - 🌿 Diet (Pink gems) - Feeding behavior
  - 💨 Behavior (White gems) - Behavioral traits
  - ⏳ Life Cycle (Black gems) - Reproduction & lifespan

### 4. Game Integration (`src/game/scenes/Game.ts`)
- **Species Selection**: Stores species data from map clicks
- **Match Processing**: Converts gem matches to clue reveals
- **Progress Tracking**: Manages clue count and species transitions
- **UI Updates**: Updates species name display and clue system

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
   - First species: reveals clues until all 8 categories shown
   - Subsequent species: cycles through automatically
   - Reset button returns to map selection

## Database Setup

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
- Yellow (3) → Color/Pattern clues
- Orange (4) → Size/Shape clues
- Pink (5) → Diet clues
- White (6) → Behavior clues
- Black (7) → Life Cycle clues

## Current State (MVP)

### ✅ Completed Features:
- Supabase integration with species table
- Gem category mapping system
- Clue reveal mechanics
- Species name display
- Interactive gem legend
- Loading states for database queries
- Species range visualization (circles)
- Exit/reset functionality

### 🔄 For Future Enhancement:
- Actual polygon rendering from PostGIS geometry
- Sound effects for clue reveals
- Species completion tracking/progress
- Visual feedback for matched gem categories
- Species collection system
- Achievement system

## Testing

### Manual Testing Flow:
1. Start application: `npm run dev`
2. Click on Cesium map to select location
3. Verify species data loads and displays
4. Match gems of different colors
5. Verify clues appear in bottom panel
6. Test exit button functionality
7. Verify gem legend display

### Type Checking:
```bash
npm run typecheck
```

## Performance Considerations

- Species queries limited to 10 results for MVP
- Client-side clue processing (instant)
- Lazy loading of species polygons
- Efficient EventBus communication
- Minimal re-renders in React components

## File Structure

```
src/
├── lib/
│   └── speciesService.ts        # Database queries
├── types/
│   └── database.ts              # TypeScript types
├── game/
│   ├── gemCategoryMapping.ts    # Clue logic
│   ├── scenes/Game.ts           # Game integration
│   └── EventBus.ts             # Event system
├── components/
│   ├── CesiumMap.tsx           # Map integration
│   ├── ClueDisplay.tsx         # Clue UI
│   └── GemLegend.tsx          # Legend component
└── MainAppLayout.tsx           # Main layout
```

This implementation provides a solid foundation for the species-based educational game mechanics while maintaining clean code architecture and extensibility for future features.