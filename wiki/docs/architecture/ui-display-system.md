---
sidebar_position: 3
title: UI Display System Reference
description: Layout variables, gem sizing, and responsive behavior
tags: [architecture, layout, css, responsive]
---

# UI Display System Reference

Comprehensive reference for the reactive UI display system, including layout variables, CSS transitions, and responsive patterns.

## Layout Architecture

### Container Structure

```css
/* 3-section vertical layout */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.cesium-container {
  height: 30%;        /* Map section */
  transition: height 0.3s ease-in-out;
}

.phaser-container {
  flex: 1;            /* Game fills remaining */
}

.game-ui-panel {
  height: 150px;      /* Clue panel */
}
```

### Layout States

| State | Map Height | Game Height | Clue Panel |
|-------|------------|-------------|------------|
| Normal | 30% | calc(100% - 150px) | 150px |
| Map Minimized | 0% | 60% | 40% |

### CSS Variables (MainAppLayout.tsx)

```typescript
const cesiumContainerStyle: React.CSSProperties = {
  width: '100%',
  height: cesiumMinimized ? '0%' : '30%',
  minHeight: '0px',
  borderBottom: cesiumMinimized ? 'none' : '2px solid #555',
  position: 'relative',
  transition: 'height 0.3s ease-in-out',
  overflow: 'hidden'
};

const phaserGameWrapperStyle: React.CSSProperties = {
  width: '100%',
  height: cesiumMinimized ? '60%' : 'calc(100% - 150px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const gameUiPanelStyle: React.CSSProperties = {
  width: '100%',
  height: cesiumMinimized ? '40%' : '150px',
  padding: '10px',
  boxSizing: 'border-box',
  borderTop: '2px solid #555',
  overflowY: 'auto',
  backgroundColor: '#282c34',
  color: 'white',
  transition: 'height 0.3s ease-in-out'
};
```

## Phaser Layout Variables

### Core Dimensions (Game.ts)

```typescript
// Grid configuration
const GRID_COLS = 7;        // Board width
const GRID_ROWS = 8;        // Board height
const TOP_UI_OFFSET = 60;   // Space for score/moves text

// Dynamic (calculated at runtime)
private gemSize: number = 64;
private boardOffset: BoardOffset = { x: 0, y: 0 };
private isMapMinimized: boolean = false;
```

### Dimension Calculation

```typescript
private calculateBoardDimensions(): void {
  const { width, height } = this.scale;

  const usableWidth = width * 0.95;           // 5% margin each side
  const usableHeight = this.isMapMinimized
    ? height - TOP_UI_OFFSET - 20
    : height * 0.90;                          // 10% margin top/bottom

  // Constrain to fit
  const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
  const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
  this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));

  // Center board
  const boardWidth = GRID_COLS * this.gemSize;
  const boardHeight = GRID_ROWS * this.gemSize;

  this.boardOffset = {
    x: Math.round((width - boardWidth) / 2),
    y: this.isMapMinimized
      ? TOP_UI_OFFSET
      : Math.round((height - boardHeight) / 2)
  };
}
```

## BoardView Layout Functions

### Position Calculation

```typescript
// Convert grid coords to pixel position
private getSpritePosition(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: this.boardOffset.x + gridX * this.gemSize + this.gemSize / 2,
    y: this.boardOffset.y + gridY * this.gemSize + this.gemSize / 2
  };
}
```

### Scale Calculation

```typescript
// 90% of cell size for visual spacing
private calculateSpriteScale(sprite: Phaser.GameObjects.Sprite): number {
  const maxFrameDimension = Math.max(sprite.frame.width, sprite.frame.height);
  return (this.gemSize * 0.9) / maxFrameDimension;
}
```

## Animation Timings

### CSS Transitions

```css
.cesium-container {
  transition: height 0.3s ease-in-out;
}

.game-ui-panel {
  transition: height 0.3s ease-in-out;
}
```

### Phaser Tweens

| Animation | Duration | Easing |
|-----------|----------|--------|
| Layout update | 300ms | Sine.easeInOut |
| Gem explosion | 200ms | Power2.easeOut |
| Gem fall | 150ms base | Bounce.easeOut |
| Swap snap | 100ms | Sine.easeInOut |

```typescript
// From constants.ts (conceptual)
const TWEEN_DURATION_LAYOUT_UPDATE = 300;
const TWEEN_DURATION_EXPLODE = 200;
const TWEEN_DURATION_FALL_BASE = 150;
const TWEEN_DURATION_SNAP = 100;
```

## Responsive Patterns

### Window Resize Flow

```
Browser resize
    ↓
Phaser.Scale.Events.RESIZE
    ↓
handleResize()
    ↓
calculateBoardDimensions()
    ↓
Update UI text positions
    ↓
boardView.updateVisualLayout()
    ↓
Gems animate to new positions
```

### Map Minimize Flow

```
User clicks minimize
    ↓
setCesiumMinimized(!cesiumMinimized)
    ↓
CSS transitions start
    ↓
useEffect triggers EventBus.emit('layout-changed')
    ↓
Game.handleLayoutChange()
    ↓
handleResize() recalculates
    ↓
Gems animate to new positions
```

### Board Recreation Flow

```
New location selected
    ↓
initializeBoardFromCesium()
    ↓
calculateBoardDimensions()
    ↓
updateDimensions() (no animation)
    ↓
destroyBoard()
    ↓
createBoard() at correct positions
```

## UI Element Positioning

### Score/Moves Display

```typescript
// Score: top-left
this.scoreText.setPosition(20, 20);

// Moves: top-right
this.movesText.setPosition(width - 20, 20);

// Status: centered
this.statusText.setPosition(width / 2, height / 2);
```

### Text Word Wrap

```typescript
if (this.statusText?.style?.setWordWrapWidth) {
  this.statusText.style.setWordWrapWidth(width * 0.8);
}
```

## Debug Utilities

### Visual Container Borders

```css
/* Add to see layout */
.cesium-container { border: 2px solid blue; }
.phaser-container { border: 2px solid green; }
.game-ui-panel { border: 2px solid yellow; }
```

### Console Logs

```typescript
// Key log points
"Game Scene: Layout changed - Map minimized = true/false"
"Game Scene: Resize detected."
"BoardView: Updating visual layout."
"BoardView: Updating dimensions (no animation)."
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Board jumps after recreation | Using animated update | Use `updateDimensions()` before recreation |
| Animations conflict | Multiple tweens on same target | Call `killTweensOf(sprite)` first |
| Layout doesn't update | Event listener not set up | Check EventBus subscription in create() |
| Performance issues | Too many concurrent tweens | Pool sprites, debounce resize |

## Extension Points

### Adding New Layout States

1. Add React state variable
2. Create CSS styles for new state
3. Add event type to `EventPayloads`
4. Handle event in `Game.ts`
5. Update `calculateBoardDimensions()` logic

### Mobile Breakpoints

```typescript
const isMobile = width < 768;
const boardMargin = isMobile ? 0.02 : 0.05;
```

## Related Documentation

- [EventBus Architecture](/docs/architecture/eventbus-display) - Communication patterns
- [Game Reactivity](/docs/architecture/game-reactivity) - MVC and resize handling
