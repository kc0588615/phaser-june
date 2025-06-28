# Map Minimize Feature Implementation

## Overview
This implementation adds the ability to minimize the Cesium map, which triggers the following layout changes:
- The game board moves up to near the top of the screen (leaving just space for score/moves)
- The clue display expands from 150px to 40% of the screen height
- All transitions are smooth and animated

## Changes Made

### 1. MainAppLayout.tsx
- Added `useEffect` to emit 'layout-changed' event when `cesiumMinimized` state changes
- Modified `phaserGameWrapperStyle` to use 60% height when map is minimized (leaving 40% for clues)
- Modified `gameUiPanelStyle` to expand to 40% height when map is minimized
- Added smooth CSS transitions for height changes

### 2. Game.ts (Phaser Scene)
- Added `isMapMinimized` property to track layout state
- Added event listener for 'layout-changed' event in `create()` method
- Added `handleLayoutChange()` method to process layout changes
- Modified `calculateBoardDimensions()` to position board differently when map is minimized:
  - When minimized: Board positioned at TOP_UI_OFFSET (60px from top)
  - When normal: Board centered vertically as before
- Added cleanup for 'layout-changed' event in `shutdown()` method

### 3. EventBus.ts
- Added 'layout-changed' event type to `EventPayloads` interface with `mapMinimized: boolean` payload

## How It Works

1. **User clicks minimize button** in MainAppLayout.tsx
2. **React state updates** (`cesiumMinimized` toggles)
3. **useEffect fires** and emits 'layout-changed' event via EventBus
4. **CSS transitions trigger**:
   - Map container shrinks to 0% height
   - Game wrapper adjusts to 60% height
   - Clue panel expands to 40% height
5. **Phaser Game scene receives event** and:
   - Updates internal `isMapMinimized` flag
   - Calls `handleResize()` which recalculates board dimensions
   - Board animates to new position near top of canvas
6. **BoardView animates** all gems to their new positions smoothly

## Key Configuration Values

- **TOP_UI_OFFSET**: 60px - Space reserved at top for score/moves display
- **Map minimized height**: 0% (completely hidden)
- **Game area height when minimized**: 60% of container
- **Clue panel height when minimized**: 40% of container
- **Transition duration**: 0.3s ease-in-out

## Future Enhancements

1. **Persist minimize state**: Could save to localStorage
2. **Keyboard shortcut**: Add hotkey to toggle map (e.g., 'M' key)
3. **Different minimize modes**: 
   - Partial minimize (e.g., to 10% height showing mini-map)
   - Slide-out drawer animation
4. **Responsive breakpoints**: Different behavior on mobile vs desktop