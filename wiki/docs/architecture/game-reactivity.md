---
sidebar_position: 2
title: Game Reactivity Guide
description: MVC pattern, resize handling, and reactive patterns in Phaser
tags: [architecture, mvc, phaser, reactivity]
---

# Game Display and UI Reactivity Guide

This guide explains how the application achieves reactivity across React (DOM layer) and Phaser (canvas layer) through careful architecture.

## The Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React + Next.js                          │
│     Window size, DOM layout, UI state, application flow     │
├─────────────────────────────────────────────────────────────┤
│                       EventBus                              │
│              Typed pub/sub communication                    │
├─────────────────────────────────────────────────────────────┤
│                    Phaser Canvas                            │
│     Game loop, sprites, input handling, animations          │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle:** React handles browser window and DOM. Phaser handles game world. EventBus bridges communication.

## MVC-Inspired Pattern in Phaser

The game implements an **MVC-inspired** pattern for clean separation of concerns.

:::note State Ownership
- **Phaser Scenes** own game state (board, score, current species)
- **React Components** own UI state (clues displayed, panel visibility)
- **EventBus** bridges the two—it carries data, not state
:::

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE OWNERSHIP                          │
├─────────────────────────────────────────────────────────────┤
│ Game.ts (Controller)                                        │
│   └── backendPuzzle (Model) ← board state, matches          │
│   └── boardView (View) ← sprite positions                   │
│   └── score, currentSpecies ← game progress                 │
├─────────────────────────────────────────────────────────────┤
│                    EventBus (Bridge)                        │
├─────────────────────────────────────────────────────────────┤
│ React Components                                            │
│   └── SpeciesPanel ← clues[], UI visibility                 │
│   └── CesiumMap ← selectedLocation                          │
└─────────────────────────────────────────────────────────────┘
```

### Controller: `Game.ts`

The scene acts as the controller, orchestrating input and game flow:

```typescript
// src/game/scenes/Game.ts
class Game extends Phaser.Scene {
  private backendPuzzle: BackendPuzzle;  // Model
  private boardView: BoardView;          // View

  create() {
    // Set up input handlers
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // Listen for external events
    EventBus.on('cesium-location-selected', this.initializeBoardFromCesium, this);
  }

  private handleMove(fromX, fromY, toX, toY) {
    // 1. Validate with Model
    const matches = this.backendPuzzle.getMatchesFromHypotheticalMove(fromX, fromY, toX, toY);

    if (matches.length > 0) {
      // 2. Update Model
      this.backendPuzzle.applyMove(fromX, fromY, toX, toY);

      // 3. Command View to animate
      this.boardView.animateSwap(fromX, fromY, toX, toY);
      this.boardView.animateExplosions(matches);
    }
  }
}
```

### Model: `BackendPuzzle.ts`

Pure data and logic, no rendering:

```typescript
// src/game/BackendPuzzle.ts
class BackendPuzzle {
  private grid: PuzzleGrid;

  // Validates move without changing state
  getMatchesFromHypotheticalMove(fromX, fromY, toX, toY): Match[] {
    const hypotheticalGrid = this.cloneGrid();
    this.swapGems(hypotheticalGrid, fromX, fromY, toX, toY);
    return this.findMatches(hypotheticalGrid);
  }

  // Actually applies the move
  applyMove(fromX, fromY, toX, toY): MoveResult {
    this.swapGems(this.grid, fromX, fromY, toX, toY);
    const matches = this.findMatches(this.grid);
    this.removeMatches(matches);
    this.cascadeGems();
    return { matches, cascades: this.cascadeCount };
  }
}
```

### View: `BoardView.ts`

Pure rendering, no game logic:

```typescript
// src/game/BoardView.ts
class BoardView {
  private gemsSprites: Phaser.GameObjects.Sprite[][];

  // Calculate pixel position from grid coordinates
  private getSpritePosition(gridX: number, gridY: number) {
    return {
      x: this.boardOffset.x + gridX * this.gemSize + this.gemSize / 2,
      y: this.boardOffset.y + gridY * this.gemSize + this.gemSize / 2
    };
  }

  // Animate gems to new positions
  animateSwap(fromX, fromY, toX, toY) {
    const gem1 = this.gemsSprites[fromY][fromX];
    const gem2 = this.gemsSprites[toY][toX];

    this.scene.tweens.add({
      targets: gem1,
      x: this.getSpritePosition(toX, toY).x,
      y: this.getSpritePosition(toX, toY).y,
      duration: 150,
      ease: 'Sine.easeInOut'
    });
    // ... similar for gem2
  }

  // Handle explosions with scale animation
  animateExplosions(matches: Match[]) {
    matches.forEach(match => {
      const sprite = this.gemsSprites[match.y][match.x];
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        duration: 200,
        onComplete: () => sprite.destroy()
      });
    });
  }
}
```

## Resize Handling

### The Resize Chain

```
Browser resize → Phaser.Scale.Events.RESIZE → handleResize()
                                                    ↓
                                    calculateBoardDimensions()
                                                    ↓
                                    boardView.updateVisualLayout()
```

### Board Dimension Calculation

```typescript
// src/game/scenes/Game.ts
private calculateBoardDimensions(): void {
  const { width, height } = this.scale;

  const TOP_UI_OFFSET = 60;  // Space for score/moves
  const GRID_COLS = 7;
  const GRID_ROWS = 8;

  // Calculate available space
  const usableWidth = width * 0.95;
  const usableHeight = this.isMapMinimized
    ? height - TOP_UI_OFFSET - 20
    : height * 0.90;

  // Find gem size that fits
  const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
  const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
  this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));

  // Calculate board position
  const boardWidth = GRID_COLS * this.gemSize;
  const boardHeight = GRID_ROWS * this.gemSize;

  this.boardOffset = {
    x: Math.round((width - boardWidth) / 2),  // Center horizontally
    y: this.isMapMinimized
      ? TOP_UI_OFFSET                          // Below UI when map hidden
      : Math.round((height - boardHeight) / 2) // Center vertically normally
  };
}
```

### Visual Layout Update with Animation

```typescript
// src/game/BoardView.ts
updateVisualLayout(newGemSize: number, newBoardOffset: { x: number; y: number }): void {
  this.gemSize = newGemSize;
  this.boardOffset = newBoardOffset;

  // Animate all gems to new positions
  this.iterateSprites((sprite, x, y) => {
    const targetPos = this.getSpritePosition(x, y);
    const newScale = this.calculateSpriteScale(sprite);

    this.scene.tweens.killTweensOf(sprite);  // Cancel existing animations
    this.scene.tweens.add({
      targets: sprite,
      x: targetPos.x,
      y: targetPos.y,
      scale: newScale,
      duration: 300,
      ease: 'Sine.easeInOut'
    });
  });
}
```

## Layout State Synchronization

When React layout changes (e.g., map minimized), Phaser must respond:

### React Side (MainAppLayout.tsx)

```typescript
const [cesiumMinimized, setCesiumMinimized] = useState(false);

useEffect(() => {
  EventBus.emit('layout-changed', { mapMinimized: cesiumMinimized });
}, [cesiumMinimized]);
```

### Phaser Side (Game.ts)

```typescript
create() {
  EventBus.on('layout-changed', this.handleLayoutChange, this);
}

private handleLayoutChange(data: { mapMinimized: boolean }): void {
  this.isMapMinimized = data.mapMinimized;
  this.handleResize();  // Trigger full recalculation
}
```

## Gem Spacing System

Gems use a 90% scale factor to create visual spacing:

```typescript
private calculateSpriteScale(sprite: Phaser.GameObjects.Sprite): number {
  const frameWidth = sprite.frame.width;
  const maxFrameDimension = Math.max(frameWidth, sprite.frame.height);
  return (this.gemSize * 0.9) / maxFrameDimension;  // 10% gap
}
```

Visual result:
```
┌─────┬─────┬─────┐
│ gem │     │ gem │  ← 10% gap between gems
├─────┼─────┼─────┤
│     │ gem │     │
└─────┴─────┴─────┘
```

## Key Configuration Variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `GRID_COLS` | Game.ts | Board width (7) |
| `GRID_ROWS` | Game.ts | Board height (8) |
| `TOP_UI_OFFSET` | Game.ts | Space for score text (60px) |
| `gemSize` | Game.ts | Dynamic pixel size per gem |
| `boardOffset` | Game.ts | Board position (x, y) |

## Performance Tips

1. **Debounce resize handlers** for smooth animations
2. **Kill existing tweens** before starting new ones
3. **Pool sprites** if frequently creating/destroying
4. **Batch EventBus emissions** when possible

## Related Documentation

- [EventBus Architecture](/docs/architecture/eventbus-display) - Communication patterns
- [UI Display System](/docs/architecture/ui-display-system) - CSS layout reference
