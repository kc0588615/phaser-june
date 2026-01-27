# Clue Board Implementation Guide

## Overview

This document provides a comprehensive review of the new clue board implementation, detailing all changes made, the architecture, business logic integration, event bus communication, and UI components.

## Architecture Overview

The clue board system follows a clean separation of concerns:
- **Game Logic** (Phaser): Handles gem matching and clue generation
- **Event Bus**: Facilitates communication between Phaser and React
- **UI Components** (React): Displays clues and species information
- **Toast Notifications** (Sonner): Provides real-time feedback for discoveries

## Key Changes Made

### 1. Removed Menubar Component
- **Old**: Complex shadcn/ui menubar with Species, View, Navigate, and Help menus
- **New**: Clean, minimalist interface with just a legend button
- **Files Modified**: `src/components/SpeciesPanel.tsx`

### 2. Added Toast Notifications
- **Package Added**: `sonner` for modern toast notifications
- **Integration**: Added `<Toaster>` component to `MainAppLayout.tsx`
- **Behavior**: Clues appear as toast notifications when gems are matched

### 3. New Component Architecture
Created three new components to replace the old clue display:
- `SpeciesHeaderCard.tsx` - Compact header with species info and colored dot indicators
- `DenseClueGrid.tsx` - Space-efficient grid display of discovered clues
- `ClueSheet.tsx` - Detailed slide-out panel for reviewing all clues

### 4. Colored Dot Indicators
- Replaced emoji icons with small colored dots (2.5px diameter)
- Dots represent discovered clue categories using gem colors
- Hover tooltips show category names
- Inline display to maximize vertical space

## File Structure and Dependencies

### Core Components

#### `/src/components/SpeciesPanel.tsx`
Main container component that orchestrates the clue display system.

**Key Features:**
- Manages clue state and species information
- Listens to EventBus for game events
- Shows toast notifications for new clues
- Coordinates child components

**Event Listeners:**
```typescript
- 'clue-revealed': Adds new clue and shows toast
- 'new-game-started': Resets state for new species
- 'game-reset': Clears all clue data
- 'no-species-found': Shows empty state message
- 'all-clues-revealed': Shows completion toast
- 'all-species-completed': Shows final success message
```

#### `/src/components/SpeciesHeaderCard.tsx`
Displays species information and discovered clue indicators.

**Props:**
```typescript
interface SpeciesHeaderCardProps {
  speciesName: string;
  currentSpeciesIndex: number;
  totalSpecies: number;
  revealedClueCount: number;
  discoveredClues: Array<{
    name: string;
    color: string;
    icon: string;
  }>;
  onShowLegend: () => void;
}
```

**Features:**
- Shows current species name and progress
- Displays colored dots for discovered clues
- Legend button for viewing gem categories

#### `/src/components/DenseClueGrid.tsx`
Displays discovered clues in a compact, scrollable grid.

**Props:**
```typescript
interface DenseClueGridProps {
  clues: CluePayload[];
  hasSelectedSpecies: boolean;
}
```

**Features:**
- Space-efficient layout
- Color-coded left borders matching gem colors
- Responsive hover states
- Empty states for guidance

#### `/src/components/ClueSheet.tsx`
Provides detailed view of all discovered clues in a slide-out panel.

**Props:**
```typescript
interface ClueSheetProps {
  clues: CluePayload[];
  speciesName: string;
  hasSelectedSpecies: boolean;
}
```

**Features:**
- Full-screen slide-out sheet
- Scrollable clue list
- Detailed clue text display
- Accessible via "Field Notes" button

### Supporting UI Components

#### `/src/components/ui/sheet.tsx`
Radix UI-based slide-out panel component for the detailed clue view.

#### `/src/components/ui/scroll-area.tsx`
Custom scrollable area component for long clue lists.

#### `/src/components/ui/button.tsx`
Existing button component used for legend and field notes buttons.

### Modified Files

#### `/src/MainAppLayout.tsx`
**Changes:**
- Added `import { Toaster } from 'sonner'`
- Added Toaster component with dark theme configuration

#### `/src/components/GemLegendDialog.tsx`
No changes - maintains gem category legend functionality

## Business Logic Integration

### Event Bus Communication

The system uses the EventBus pattern to communicate between Phaser (game) and React (UI):

```typescript
// Game emits clue when gems match
EventBus.emit('clue-revealed', {
  category: GemCategory,
  heading: string,
  clue: string,
  speciesId: number,
  name: string,
  icon: string,
  color: string
});
```

### Data Flow

1. **Gem Match Detection** (Phaser)
   - Player matches 3+ gems
   - Game identifies gem color/type
   - Maps to clue category

2. **Clue Generation** (Game Logic)
   - Uses `clueConfig.ts` to generate clue
   - Creates CluePayload object
   - Emits via EventBus

3. **UI Update** (React)
   - SpeciesPanel receives event
   - Updates state arrays
   - Shows toast notification
   - Updates UI components

4. **Visual Feedback**
   - Toast appears with colored border
   - Colored dot added to header
   - Clue added to grid and sheet

## Color System

Consistent color mapping across all components:

```typescript
const colorMap: Record<string, string> = {
  'red': '#ef4444',     // Classification
  'green': '#22c55e',   // Habitat
  'blue': '#3b82f6',    // Geographic
  'orange': '#f97316',  // Morphology
  'yellow': '#eab308',   // Behavior
  'black': '#1f2937',   // Life Cycle
  'white': '#e5e7eb',  // Conservation
  'purple': '#a855f7'   // Key Facts
};
```

## State Management

### SpeciesPanel State
```typescript
const [clues, setClues] = useState<CluePayload[]>([]);
const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>('');
const [selectedSpeciesId, setSelectedSpeciesId] = useState<number>(0);
const [totalSpecies, setTotalSpecies] = useState<number>(0);
const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState<number>(0);
const [legendOpen, setLegendOpen] = useState<boolean>(false);
const [allCluesRevealed, setAllCluesRevealed] = useState<boolean>(false);
const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<boolean>(false);
const [discoveredClues, setDiscoveredClues] = useState<Array<{
  name: string;
  color: string;
  icon: string;
}>>([]);
```

## User Experience Flow

1. **Initial State**
   - Empty clue grid with instructions
   - No species selected message

2. **Species Selection**
   - User clicks location on Cesium map
   - Species info appears in header
   - Clue grid becomes active

3. **Gem Matching**
   - Player matches gems in Phaser game
   - Toast notification appears
   - Colored dot added to header
   - Clue appears in grid

4. **Progress Tracking**
   - Header shows X/8 clues discovered
   - Colored dots indicate categories found
   - Field Notes button shows count

5. **Completion**
   - All clues revealed message
   - Auto-advance to next species
   - Final completion celebration

## Performance Optimizations

1. **Space Efficiency**
   - Removed menubar to maximize content area
   - Inline colored dots save vertical space
   - Compact padding throughout

2. **Visual Hierarchy**
   - Colored borders for quick category identification
   - Toast notifications for immediate feedback
   - Progressive disclosure with sheet component

3. **State Management**
   - Duplicate prevention in clue arrays
   - Efficient event listener cleanup
   - Memoized color mappings

## Styling and Theme

- **Color Scheme**: Dark theme with slate backgrounds
- **Accent Colors**: Cyan for highlights and active states
- **Typography**: System fonts with clear hierarchy
- **Spacing**: 6px gap between major sections
- **Borders**: Colored left borders for visual association

## Future Considerations

1. **Persistence**: Could add local storage for clue history
2. **Animations**: Smooth transitions for dot appearances
3. **Accessibility**: Enhanced keyboard navigation
4. **Mobile**: Responsive design for smaller screens
5. **Customization**: User preferences for toast duration/position

## Dependencies

- `sonner`: ^1.5.0 - Toast notifications
- `@radix-ui/react-dialog`: Existing - Dialog components
- `@radix-ui/react-scroll-area`: ^1.0.0 - Scroll areas
- `lucide-react`: Existing - Icon components
- `class-variance-authority`: Existing - Component variants

## Progressive Classification System (Updated Implementation)

### Overview
The Classification category (red gems 🧬) now uses a progressive revelation system where successive matches reveal taxonomic information from broad to specific, rather than returning the most specific available information on the first match.

### Sequence Design
**Revelation Order** (skipping kingdom as requested):
1. **1st Red Match**: `Taxonomic comment` (full sentence if present)
2. **2nd Red Match**: `Phylum: [value]` (e.g., "Phylum: CHORDATA")
3. **3rd Red Match**: `Class: [value]` (e.g., "Class: REPTILIA") 
4. **4th Red Match**: `Order: [value]` (e.g., "Order: TESTUDINES")
5. **5th Red Match**: `Family: [value]` (e.g., "Family: EMYDIDAE")
6. **6th Red Match**: `Genus: [value]` (e.g., "Genus: Emydoidea")
7. **7th Red Match**: `Scientific name: [value]` (e.g., "Scientific name: Emydoidea blandingii")
8. **8th+ Red Matches**: No output (sequence complete)

### Technical Implementation

#### Backend Logic (`src/game/clueConfig.ts`)
```typescript
// Classification sequence array
const CLASSIFICATION_SEQUENCE: Array<keyof Species> = [
  'taxonomic_comment',
  'phylum',
  'class',
  'taxon_order',
  'family',
  'genus',
  'scientific_name'
];

// Progress tracking using WeakMap for memory efficiency
const classificationProgress = new WeakMap<Species, number>();

function getNextClassificationClue(species: Species): string {
  let progress = classificationProgress.get(species) ?? 0;
  
  while (progress < CLASSIFICATION_SEQUENCE.length) {
    const field = CLASSIFICATION_SEQUENCE[progress];
    const value = species[field] as unknown as string | undefined;
    progress++;
    classificationProgress.set(species, progress);
    
    if (value) {
      switch (field) {
        case 'taxonomic_comment': return value;
        case 'phylum': return `Phylum: ${value}`;
        case 'class': return `Class: ${value}`;
        case 'taxon_order': return `Order: ${value}`;
        case 'family': return `Family: ${value}`;
        case 'genus': return `Genus: ${value}`;
        case 'scientific_name': return `Scientific name: ${value}`;
        default: return value;
      }
    }
    // Skip missing fields but still count progress
  }
  
  return ''; // No more clues
}
```

#### Game Logic Integration (`src/game/scenes/Game.ts`)
The game scene treats Classification differently from other categories:
- **Normal Categories**: Mark as revealed immediately, ignore subsequent matches
- **Classification**: Allow multiple clues, only mark complete when sequence finishes

```typescript
// Special handling for progressive classification
if (category === GemCategory.CLASSIFICATION) {
  const clueText = config.getClue(this.selectedSpecies);
  if (clueText) {
    // Emit clue (do NOT add to revealedClues yet)
    EventBus.emit('clue-revealed', clueData);
    
    // Only mark complete when sequence exhausted
    if (isClassificationComplete(this.selectedSpecies)) {
      this.revealedClues.add(GemCategory.CLASSIFICATION);
    }
  }
}
```

#### UI Component Fix (`src/components/SpeciesPanel.tsx`)
**Problem**: React component was filtering duplicate categories, blocking successive classification clues.

**Solution**: Modified duplicate detection to allow multiple clues from Classification category:
```typescript
// Before: Filtered all duplicate categories
if (prev.some(c => c.category === clueData.category)) return prev;

// After: Special handling for Classification (category = 0)
const isDuplicate = clueData.category === 0 ? 
  prev.some(c => c.category === clueData.category && c.clue === clueData.clue) :
  prev.some(c => c.category === clueData.category);
```

### State Management & Memory
- **WeakMap Usage**: Progress tracking automatically garbage-collected when species objects are removed
- **Species Reset**: Progress reset when advancing to new species via `resetClassificationProgress()`
- **Data Resilience**: Gracefully handles missing database fields by skipping to next step

### User Experience Benefits
1. **Educational Value**: Builds understanding of taxonomic hierarchy 
2. **Progressive Discovery**: Creates anticipation for more specific information
3. **Replay Value**: Different species reveal classification information at different paces
4. **Natural Flow**: Aligns with scientific classification from general to specific

### Edge Cases Handled
1. **Missing Data**: If any classification field is null/empty, system skips to next field while maintaining progress count
2. **Species Changes**: Progress automatically resets when advancing to new species
3. **UI Deduplication**: Prevents duplicate toast notifications for same clue text
4. **Memory Management**: WeakMap ensures no memory leaks for species objects

### Database Requirements
**No SQL Changes Required** - System uses `icaa_view` fields (compatibility view):
- `taxonomic_comment`, `phylum`, `class`, `taxon_order`, `family`, `genus`, `scientific_name`
- All data already present in database

### Future Developer Guidance
To modify the classification sequence:
1. **Change Order**: Update `CLASSIFICATION_SEQUENCE` array in `clueConfig.ts`
2. **Add Fields**: Include new database fields in sequence and switch statement
3. **Skip Categories**: Remove unwanted fields from sequence array
4. **Reset Logic**: Ensure `resetClassificationProgress()` is called on species changes

**Important**: The WeakMap approach ensures memory efficiency but requires species object identity to remain consistent throughout the game session.

## Summary

The new clue board implementation provides a cleaner, more efficient interface while maintaining full functionality. The colored dot system maximizes space for clue content, toast notifications provide immediate feedback, and the modular component architecture ensures maintainability. The event-driven design maintains clean separation between game logic and UI, making the system extensible and testable.

The progressive classification system enhances educational value by revealing taxonomic information in a scientifically logical sequence, from broad to specific, while maintaining robust state management and graceful error handling.
