# Board Position Fix: Map Minimize Issue

## Problem Description
When minimizing the Cesium map, the game board would briefly move to the correct position at the top of the screen, but then immediately jump back down to the centered position. This happened specifically when a new location was selected from the map.

## Root Cause Analysis
The issue was in the `initializeBoardFromCesium` method in `Game.ts`:

1. **Line 222**: `this.boardView.updateVisualLayout(this.gemSize, this.boardOffset)` - This started animating existing sprites to their new positions
2. **Line 226**: `this.boardView.destroyBoard()` - This immediately destroyed all sprites mid-animation  
3. **Line 227**: `this.boardView.createBoard(...)` - This created new sprites at calculated positions

The result was:
- Sprites started animating to the top position (when map was minimized)
- Animation was interrupted by sprite destruction
- New sprites were created, making it appear the board "jumped back"

## Solution Implemented

### 1. Replaced `updateVisualLayout` with `updateDimensions`
```typescript
// OLD - caused animation that got interrupted
this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);

// NEW - just updates internal dimensions
this.boardView.updateDimensions(this.gemSize, this.boardOffset);
```

### 2. Added `updateDimensions` method to BoardView
```typescript
/** Updates dimensions without animation (for use before board recreation). */
updateDimensions(newGemSize: number, newBoardOffset: { x: number; y: number }): void {
    console.log("BoardView: Updating dimensions (no animation).");
    this.gemSize = newGemSize;
    this.boardOffset = newBoardOffset;
}
```

## Why This Works

1. **No conflicting animations**: We no longer start animations that get immediately interrupted
2. **Correct positioning**: The BoardView has the updated dimensions before creating new sprites
3. **Clean separation**: 
   - `updateDimensions()` - for updating internal state before recreation
   - `updateVisualLayout()` - for animating existing sprites (used in resize scenarios)

## Testing the Fix

To verify the fix works:

1. Load the game
2. Click on a location on the Cesium map to initialize the board
3. Minimize the Cesium map - the board should move to the top and stay there
4. Select a new location on the map - the board should remain at the top
5. Expand the map again - the board should move back to center and stay there

## Files Modified

1. **`src/game/scenes/Game.ts`**: 
   - Changed `updateVisualLayout` to `updateDimensions` in `initializeBoardFromCesium`
   
2. **`src/game/BoardView.ts`**: 
   - Added `updateDimensions` method for non-animated dimension updates

The fix maintains all existing functionality while eliminating the visual jump when the board is recreated after map minimize/expand actions.

---

# Owl Sprite Implementation & Board Layout Changes

## Overview
Added an animated owl sprite to the game UI, positioned at the top-left of the screen for future dialogue/hint functionality. This required adjusting the game board layout from centered to left-aligned to create visual cohesion.

## Implementation Details

### 1. Owl Sprite Asset Integration
- **Asset**: `public/assets/Owl_spritesheet.png` - 48x32 pixel spritesheet
- **Loading**: Added to `Preloader.ts` with frame dimensions
```typescript
this.load.spritesheet('owl', `${assetsFullPath}Owl_spritesheet.png`, {
    frameWidth: 48,
    frameHeight: 32
});
```

### 2. OwlSprite Class (`src/game/ui/OwlSprite.ts`)
Created a reusable sprite class with:
- **Animations**: idle, blink, flying, landing, walking, sleeping, alerted, hurted, wakingup
- **Intro Sequence**: Owl flies in from right, lands, walks to position
- **Positioning**: Uses origin (0, 1) for left-bottom alignment
- **Key Methods**:
  - `setupAnimations()`: Static method to create all animations
  - `createAndRunIntro()`: Handles the entrance animation
  - `setBoardOffsetX()`: Updates position when board moves
  - `playAnimation()`: Triggers specific animations

### 3. Board Layout Changes

#### Grid Size Reduction
- Changed from 8x8 to 7x7 grid to make room for owl
- Modified `src/game/constants.ts`:
```typescript
export const GRID_ROWS = 7 as const; // Reduced from 8 to 7 to make room for owl
```

#### Board Positioning Changes - Responsive Scaling Update (2025)
- **Previous**: Board was always left-aligned with 12px margin
- **New**: Responsive positioning based on screen width
  - **Mobile (<768px)**: Left-aligned with 12px margin for maximum screen usage
  - **Desktop (≥768px)**: Horizontally centered with black bars for classic game appearance
- **Gem Size Constraints**: 
  - Minimum: 24px (very small screens)
  - Maximum: 80px (prevents oversized gems on large displays)
- **Gem Size Preservation**: Adjusted `usableHeight` to 0.7875 (7/8 * 0.90) to maintain original gem dimensions

```typescript
// calculateBoardDimensions() in Game.ts - Responsive implementation
const MOBILE_BREAKPOINT = 768;
const MAX_GEM_SIZE = 80;
const MIN_GEM_SIZE = 24;

const isMobile = width < MOBILE_BREAKPOINT;

// Different usable space calculation for mobile vs desktop
const usableWidth = isMobile ? width * 0.95 : width * 0.85;
const usableHeight = height * 0.7875;

// Calculate gem size with constraints
const calculatedSize = Math.min(sizeFromWidth, sizeFromHeight);
this.gemSize = Math.max(MIN_GEM_SIZE, Math.min(calculatedSize, MAX_GEM_SIZE));

// Position based on screen size
if (isMobile) {
    // Mobile: Left-aligned
    this.boardOffset = {
        x: 12,  // Small margin
        y: Math.round((height - boardHeight) / 2)
    };
} else {
    // Desktop: Centered
    this.boardOffset = {
        x: Math.round((width - boardWidth) / 2),
        y: Math.round((height - boardHeight) / 2)
    };
}
```

### 4. Integration in Game Scene
- Owl created with scale 2.5 (reduced from initial 4)
- Positioned to align flush with board's left edge
- Responsive to window resize events
- Updates position after board initialization from Cesium
```typescript
// Initial creation
this.owl = new OwlSprite(this, { 
    scale: 2.5,
    boardOffsetX: this.boardOffset.x,
    boardOffsetY: this.boardOffset.y
});

// Update after board initialization
if (this.owl) {
    this.owl.setBoardOffsets(this.boardOffset.x, this.boardOffset.y);
}
```

## Visual Alignment Strategy - Final Implementation

### Origin Point Fix
Changed owl origin to (0, 0) for top-left alignment to ensure proper positioning calculations.

### Flush Alignment Solution
To achieve perfect flush alignment with the board edge:
1. **Horizontal**: Owl X position set to `boardOffsetX - 30` (results in x=-18 when board is at x=12)
2. **Vertical**: Positioned above board with proper clearance to avoid overlap
3. **Final positioning formula**:
```typescript
// In OwlSprite.ts topLeftAnchor()
const x = this.boardOffsetX - 30;  // Flush with board edge
const y = this.boardOffsetY - clearance - owlHeight + 12;  // Above board
```

### Responsive Updates
- Owl position updates on window resize
- Position recalculated after board initialization from Cesium map
- Maintains flush alignment across all screen sizes

## Files Modified

1. **`src/game/constants.ts`**: Reduced GRID_ROWS from 8 to 7
2. **`src/game/scenes/Preloader.ts`**: Added owl spritesheet loading
3. **`src/game/scenes/Game.ts`**: 
   - Modified `calculateBoardDimensions` for responsive mobile/desktop positioning
   - Added breakpoint detection and gem size constraints
   - Integrated OwlSprite with board positioning
   - Added owl position updates in resize handler and after board initialization
4. **`src/game/ui/OwlSprite.ts`**: 
   - New file implementing owl sprite class
   - Updated to use (0,0) origin for proper alignment
   - Fine-tuned positioning to be flush with board edge
   - Added `setBoardOffsets` method for dynamic updates
5. **`src/game/BoardView.ts`**: Added `updateDimensions` method for non-animated updates

## Future Enhancements
The owl sprite is positioned for future dialogue/hint system integration. Potential uses:
- Display hints when player is stuck
- Show tutorial messages
- Celebrate successful matches with animations
- Guide players through species discovery