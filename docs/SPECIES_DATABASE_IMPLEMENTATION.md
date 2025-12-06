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
- Groups species by taxonomic categories (Turtles and Frogs)
- Displays biodiversity statistics in development mode
- Responsive grid layout with accordion UI
- Loading and error states
- Full-page styling with dark theme
- Discovered/Unknown species separation

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

### 3. Species Categorization System

**Purpose**: Organize species into taxonomic categories for better browsing experience

**Implementation** (`src/utils/ecoregion.ts`):
- `groupSpeciesByCategory()` - Groups species by order (Testudines → Turtles, Anura → Frogs)
- `getAllCategories()` - Returns all possible categories regardless of filtered data
- Categories are hard-coded to ensure consistent UI display

**Current Categories**:
1. **Turtles** - All species with order = 'Testudines'
2. **Frogs** - All species with order = 'Anura'

### 4. Biodiversity Statistics Display

**Purpose**: Show ecological diversity metrics in development mode

**Statistics Tracked**:
- **Categories**: Total number of taxonomic groups (currently 2: Turtles, Frogs)
- **Ecoregions**: Unique ecological regions from `bioregio_1` field
- **Realms**: Biogeographic realms (e.g., Nearctic, Neotropical)
- **Biomes**: Major ecological communities (e.g., tropical rainforest, desert)

**Implementation Details**:
- Statistics extracted via utility functions in `src/utils/ecoregion.ts`
- `getEcoregions()`, `getRealms()`, `getBiomes()` - Extract unique values from species data
- Displayed in development mode only (process.env.NODE_ENV === 'development')
- Categories count uses `getAllCategories().length` for accuracy

### 5. MainAppLayout Updates (`src/MainAppLayout.tsx`)

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

### Species Discovery System
- **Discovered Species**: Shown with green header (🏆) and sorted first
- **Unknown Species**: Shown with gray header (🔍) below discovered ones
- Discovery status tracked in localStorage
- Visual distinction helps players track progress

### Accordion Interface
- Species grouped by category (Turtles/Frogs) then by genus
- Collapsible sections for better navigation
- Sticky headers when scrolling up for context
- Shows species count per category and genus
- Separate accordion states for discovered vs unknown species sections

### Species Separation Logic
The species list intelligently separates discovered and unknown species:

**How It Works**:
1. Discovered species IDs stored in localStorage (`discoveredSpecies` key)
2. Each species checked against discovered list during filtering
3. Species appear in only one section - never duplicated
4. Accordion sections use unique IDs to prevent state conflicts:
   - Discovered: `known-${category}` (e.g., "known-Frogs")
   - Unknown: `unknown-${category}` (e.g., "unknown-Frogs")

**Technical Implementation**:
```typescript
// Separation logic
filteredSpecies.forEach(sp => {
  if (discoveredSpecies[sp.ogc_fid]) {
    known.push(sp);
  } else {
    unknown.push(sp);
  }
});
```

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

## Search and Filter System

### Category Search
The species list includes a powerful search system that allows filtering by multiple criteria:

**Search Types Supported**:
- **Category**: Search "Frogs", "Frog", "Turtles", or "Turtle" (singular/plural)
- **Genus**: Direct genus name search (e.g., "Dyscophus", "Chelonia")
- **Order**: Taxonomic order search (e.g., "Anura", "Testudines")
- **Species**: Individual species by common or scientific name
- **Geographic**: Ecoregion, Realm, or Biome
- **Taxonomic**: Class or Order filters via the tree view

**Implementation Details**:
- Category searches map to taxonomic orders (Frogs → Anura, Turtles → Testudines)
- All unique genus and order values are dynamically extracted from the database
- Filter badges display appropriate labels:
  - "Category: Frogs" when using category search
  - "Order: Anura" when searching by order directly
  - "Genus: Dyscophus" when searching by genus
- Search is case-insensitive and shows results in a dropdown
- Search options are automatically updated as new species are added to the database

### Filter Architecture
Filters work through the `order` field for categories to support future expansion:
```typescript
// Category to Order mapping
'Frogs'/'Frog' → 'Anura'
'Turtles'/'Turtle' → 'Testudines'
```

## Future Enhancements

1. ~~**Species Filtering**: Add search/filter functionality~~ ✓ Implemented
2. **Additional Categories**: Support more taxonomic orders beyond turtles and frogs
3. **Image Support**: Add species photos when available
4. **Unlocked Only**: Option to show only unlocked species
5. **Integration**: Link unlocked clues to species cards
6. **Animations**: Smooth transitions between views
7. **Caching**: Cache species data to reduce API calls

## Adding New Taxonomic Categories

To add a new category (e.g., Birds):

1. **Update Category List** (`src/utils/ecoregion.ts`):
```typescript
export function getAllCategories(): string[] {
  return ['Turtles', 'Frogs', 'Birds'];
}
```

2. **Update Category Mappings** (`getCategoryOrderMapping`):
```typescript
export function getCategoryOrderMapping(): Record<string, string> {
  return {
    'Turtles': 'Testudines',
    'Turtle': 'Testudines',
    'Frogs': 'Anura',
    'Frog': 'Anura',
    'Birds': 'Aves',      // Add singular
    'Bird': 'Aves'        // Add plural
  };
}
```

3. **Update Order to Category** (`getCategoryFromOrder`):
```typescript
export function getCategoryFromOrder(order: string): string {
  if (order === 'Testudines') return 'Turtles';
  if (order === 'Anura') return 'Frogs';
  if (order === 'Aves') return 'Birds';  // Add new mapping
  return 'Unknown';
}
```

4. **Update Grouping Logic** (`groupSpeciesByCategory`):
```typescript
if (sp.order_ === 'Testudines') {
  category = 'Turtles';
} else if (sp.order_ === 'Anura') {
  category = 'Frogs';
} else if (sp.order_ === 'Aves') {
  category = 'Birds';
}
```

5. **Update Display Names** (optional):
```typescript
const orderMap: Record<string, string> = {
  'Testudines': 'Turtle - Testudines',
  'Anura': 'Frog - Anura',
  'Aves': 'Bird - Aves'
};
```

## Key Utility Functions

### Species Data Extraction (`src/utils/ecoregion.ts`)

**Dynamic Value Extraction**:
```typescript
// Extract all unique genus values
getUniqueGenera(species: Species[]): string[]

// Extract all unique order values  
getUniqueOrders(species: Species[]): string[]

// Extract unique ecoregions, realms, and biomes
getEcoregions(species: Species[]): string[]
getRealms(species: Species[]): string[]
getBiomes(species: Species[]): string[]
```

**Category Mapping**:
```typescript
// Map user-friendly names to taxonomic orders
getCategoryOrderMapping(): Record<string, string>
// Returns: { 'Frogs': 'Anura', 'Frog': 'Anura', ... }

// Convert category to order (case-insensitive)
getOrderFromCategory(category: string): string | null

// Convert order to display category
getCategoryFromOrder(order: string): string
```

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

5. **Category Search Not Working**
   - Check that both singular and plural forms are in `getCategoryOrderMapping()`
   - Ensure the order value exists in the database
   - Verify `order_` field (note underscore) is populated for species

6. **Filter Shows Wrong Label**
   - Update `getCategoryFromOrder()` to include new order mappings
   - Check filter badge display logic in both SpeciesList and SpeciesSearchInput

7. **Discovered Species Appearing in Both Sections**
   - Check localStorage `discoveredSpecies` format
   - Ensure accordion values are unique (using `known-` and `unknown-` prefixes)
   - Verify species IDs match between discovery and display

8. **Search Not Finding Genus/Order Values**
   - Ensure `getUniqueGenera()` and `getUniqueOrders()` are imported
   - Check that species data has non-null genus and order_ fields
   - Verify the search component receives the full species array

## Usage

1. Click "Species List" button in game view
2. Browse all species with full details
3. Click "← Back to Game" to return
4. Game state fully preserved throughout