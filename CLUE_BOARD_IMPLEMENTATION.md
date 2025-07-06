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
  'white': '#e5e7eb',   // Behavior
  'black': '#1f2937',   // Life Cycle
  'yellow': '#eab308',  // Conservation
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

## Summary

The new clue board implementation provides a cleaner, more efficient interface while maintaining full functionality. The colored dot system maximizes space for clue content, toast notifications provide immediate feedback, and the modular component architecture ensures maintainability. The event-driven design maintains clean separation between game logic and UI, making the system extensible and testable.