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