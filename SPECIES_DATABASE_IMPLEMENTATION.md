# Species Database Implementation Guide

## Overview

This document describes the implementation of the species database feature, which displays comprehensive information about all species in the game. The feature was designed to preserve game state while providing a full-page browsing experience.

## Architecture Decision

### Initial Problem
- Originally implemented as a separate page (`/species`)
- Navigation to the page caused complete game reload
- Lost all game state (unlocked clues, gem positions, current score)

### Solution
- Converted to an integrated component within the main game layout
- Uses view mode toggling similar to Map/Clues
- Game components remain mounted but positioned off-screen
- Preserves all game state while providing full-page experience

## Component Structure

### 1. SpeciesList Component (`src/components/SpeciesList.tsx`)
**Purpose**: Displays a grid of all species from the database

**Key Features**:
- Fetches data from Supabase `icaa` table
- Groups species by type (currently all "Turtles")
- Responsive grid layout
- Loading and error states
- Full-page styling with dark theme

**Data Fetching**:
```typescript
const { data, error } = await supabase
  .from('icaa')
  .select(`
    ogc_fid, sci_name, comm_name, http_iucn,
    kingdom, phylum, class, order_, family, genus,
    category, cons_code, cons_text,
    marine, terrestria, freshwater, hab_tags, hab_desc,
    geo_desc,
    color_prim, color_sec, pattern, size_min, size_max, weight_kg, shape_desc,
    diet_type, diet_prey, diet_flora, behav_1, behav_2,
    lifespan, maturity, repro_type, clutch_sz, life_desc1, life_desc2,
    threats,
    key_fact1, key_fact2, key_fact3
  `)
  .order('comm_name', { ascending: true });
```

### 2. SpeciesCard Component (`src/components/SpeciesCard.tsx`)
**Purpose**: Displays detailed information for a single species

**Design**:
- Uses inline styles for guaranteed styling (avoids CSS loading issues)
- Dark themed card with borders and shadows
- Organized into sections matching gem color categories
- Icons for each section using lucide-react

**Sections** (with corresponding gem colors):
- **Taxonomy** (Purple gem) - Kingdom through Genus
- **Conservation Status** (Purple gem) - IUCN status with color coding
- **Habitat** (Green gem) - Environment types and descriptions
- **Geographic Distribution** (Blue gem) - Range information
- **Physical Characteristics** (Red gem) - Colors, patterns, size, weight
- **Behavior & Diet** (Orange gem) - Feeding habits and behaviors
- **Life Cycle** (Pink gem) - Lifespan, reproduction details
- **Threats** (Black/White gem) - Conservation threats
- **Key Facts** (Yellow gem) - Three notable facts

**Conservation Status Colors**:
- CR (Critically Endangered): #dc2626 (red)
- EN (Endangered): #ea580c (orange)
- VU (Vulnerable): #f97316 (orange)
- NT (Near Threatened): #ca8a04 (yellow)
- LC (Least Concern): #16a34a (green)
- DD (Data Deficient): #6b7280 (gray)

### 3. MainAppLayout Updates (`src/MainAppLayout.tsx`)

**View Mode System**:
```typescript
const [viewMode, setViewMode] = useState<'map' | 'clues' | 'species'>('map');
```

**Layout Strategy**:
- When `viewMode === 'species'`:
  - Game layout positioned off-screen (`left: -9999px`)
  - Species database shown full-screen with absolute positioning
  - Prevents Phaser black screen issue by keeping canvas rendered
- When returning to game:
  - Game layout restored to normal position
  - Species view hidden

**Button Configuration**:
- Two buttons in the game view:
  1. "Species List" - Opens full-page species database
  2. Toggle button - Switches between "Show Map" and "Show Clues"
- One button in species view:
  - "← Back to Game" - Returns to map view

## UI/UX Decisions

### Full-Page Experience
- Species database takes entire viewport
- Dark background (#0f172a) matches game theme
- Prominent back button in top-right corner
- Maintains scroll position when returning

### Responsive Design
- Grid layout: `repeat(auto-fill, minmax(min(100%, 500px), 1fr))`
- Cards adapt to screen size
- Prevents horizontal scrolling
- Maximum container width of 1400px on large screens

### Visual Hierarchy
- Large title (48px) for page header
- Section headers (18px) with colored icons
- Clear separation between sections
- Conditional rendering (only shows sections with data)

## Database Schema

The implementation uses the existing `icaa` table with 40+ fields covering:
- Taxonomic classification
- Conservation status
- Habitat preferences
- Geographic distribution
- Physical characteristics
- Behavioral traits
- Life cycle information
- Conservation threats
- Key facts

## State Preservation

### How It Works
1. All game components remain mounted
2. Species view overlays the game with high z-index (2000)
3. Game positioned off-screen to prevent rendering issues
4. No page navigation occurs - everything within single page

### Benefits
- Instant switching between views
- Game continues running in background
- All unlocked clues preserved
- Current game progress maintained
- Cesium map state preserved

## Dependencies Added

### NPM Packages
- `lucide-react` - Icon library for section headers

### Supabase Integration
- Uses existing `@/lib/supabaseClient` configuration
- Real-time subscriptions commented out but available
- Error handling for database connection issues

## Removed Components

### Deleted Files
- `src/pages/species.tsx` - Original page implementation

### Updated Components
- Removed `Link` component usage
- Removed `SimpleLayout` dependency for species view

## Performance Considerations

1. **Lazy Loading**: Species data fetched on first view
2. **Component Mounting**: All views stay mounted to preserve state
3. **Rendering**: Off-screen positioning prevents unnecessary renders
4. **Grid Optimization**: CSS Grid with `auto-fill` for efficient layout

## Future Enhancements

1. **Species Filtering**: Add search/filter functionality
2. **Species Types**: Support multiple species types beyond turtles
3. **Image Support**: Add species photos when available
4. **Unlocked Only**: Option to show only unlocked species
5. **Integration**: Link unlocked clues to species cards
6. **Animations**: Smooth transitions between views
7. **Caching**: Cache species data to reduce API calls

## Troubleshooting

### Common Issues

1. **Horizontal Scrollbar**
   - Solution: Set `overflowX: 'hidden'` on container
   - Use responsive grid units

2. **Black Screen on Return**
   - Solution: Position game off-screen instead of hiding
   - Maintains WebGL context

3. **Styling Not Applied**
   - Solution: Use inline styles instead of CSS classes
   - Ensures styles work in all environments

4. **State Loss**
   - Solution: Keep all components mounted
   - Use view toggling instead of navigation

## Usage

1. Click "Species List" button in game view
2. Browse all species with full details
3. Click "← Back to Game" to return
4. Game state fully preserved throughout