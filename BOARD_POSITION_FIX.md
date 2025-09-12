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

#### Board Positioning Changes
- **Previous**: Board centered horizontally and vertically
- **New**: Board left-aligned with 12px margin
- **Gem Size Preservation**: Adjusted `usableHeight` to 0.7875 (7/8 * 0.90) to maintain original gem dimensions

```typescript
// calculateBoardDimensions() in Game.ts
const leftMargin = 12;
this.boardOffset = {
    x: leftMargin,  // Flush with left edge (with small margin)
    y: Math.round((height - boardHeight) / 2)  // Vertically centered
};
```

### 4. Integration in Game Scene
- Owl created with scale 2.5 (reduced from initial 4)
- Positioned to align with board's left edge
- Responsive to window resize events
```typescript
this.owl = new OwlSprite(this, { 
    scale: 2.5,
    boardOffsetX: this.boardOffset.x
});
```

## Visual Alignment Strategy

### Origin Point Fix
Initial implementation used center origin (0.5, 1) which created a gap between owl and board. Fixed by:
1. Changed owl origin to (0, 1) for left-bottom alignment
2. Removed centering math calculations
3. Directly use boardOffset.x for flush alignment

### Consistent Margins
Both owl and board use the same 12px left margin for visual consistency:
- Board: `x: leftMargin` in calculateBoardDimensions
- Owl: `x: this.boardOffsetX || 12` in topLeftAnchor

## Files Modified

1. **`src/game/constants.ts`**: Reduced GRID_ROWS from 8 to 7
2. **`src/game/scenes/Preloader.ts`**: Added owl spritesheet loading
3. **`src/game/scenes/Game.ts`**: 
   - Modified calculateBoardDimensions for left alignment
   - Integrated OwlSprite with board positioning
   - Added owl to resize handler
4. **`src/game/ui/OwlSprite.ts`**: New file implementing owl sprite class

## Future Enhancements
The owl sprite is positioned for future dialogue/hint system integration. Potential uses:
- Display hints when player is stuck
- Show tutorial messages
- Celebrate successful matches with animations
- Guide players through species discovery