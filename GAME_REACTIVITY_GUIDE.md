# Game Display and UI Reactivity Guide

## Executive Summary: The Hybrid Architecture

The application uses a **hybrid architecture** combining React and Phaser for maximum flexibility:

- **React (with Next.js)**: Manages the overall page structure, UI components outside the game canvas (map, clue displays), and application lifecycle. Controls macro layout (e.g., map taking top 30% of screen).
- **Phaser**: Manages everything inside the `<canvas>` element including game board rendering, real-time input handling (dragging gems), and the core game loop.
- **EventBus**: Custom event emitter (`src/game/EventBus.ts`) acts as the central nervous system, enabling React and Phaser to communicate despite being separate worlds.

**Key Principle**: React handles browser window and DOM, Phaser handles game world. Reactivity achieved through React state management, CSS for layout, Phaser's internal scaling/game loop, and EventBus for cross-communication.

---

## 1. The EventBus: Central Communication Hub

The EventBus is critical for understanding application reactivity. It's a simple publish-subscribe system allowing decoupled communication.

### How It Works:
```typescript
// Emit an event
EventBus.emit('event-name', data);

// Listen for an event
EventBus.on('event-name', (data) => { ... });
```

### Key Reactive Flows:

| Event Name | Emitted By | Listened By | Purpose |
|------------|------------|-------------|---------|
| `cesium-location-selected` | `CesiumMap.tsx` (React) | `Game.ts` (Phaser) | React→Phaser: Start new board based on map click |
| `clue-revealed` | `Game.ts` (Phaser) | `ClueDisplay.tsx` (React) | Phaser→React: Display unlocked clue |
| `new-game-started` | `Game.ts` (Phaser) | `ClueDisplay.tsx` (React) | Phaser→React: Update species display |
| `current-scene-ready` | `Game.ts` (Phaser) | `PhaserGame.tsx` (React) | Phaser→React: Scene ready notification |

### Extension Pattern:
- **React aware of game event**: Emit from `Game.ts`, add listener in React component's `useEffect`
- **Game aware of React event**: Emit from React component, add listener in `Game.ts` create method

---

## 2. Screen Layout and Responsiveness (React/CSS Layer)

Overall screen layout controlled by React components and CSS, not Phaser.

### Current Implementation:
- **Component**: `src/MainAppLayout.tsx` (or similar) defines main containers
- **Mechanism**: CSS Flexbox/Grid for screen partitioning

```css
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.map-container {
  flex: 0 0 30%; /* Fixed 30% height */
}
.game-container {
  flex: 1; /* Remaining space */
}
```

### Reactivity Flow:
1. Browser window resizes
2. CSS rules automatically adjust container sizes
3. CesiumMap and PhaserGame fill 100% of their containers
4. Components resize accordingly

---

## 3. Phaser Game World Reactivity

### A. Canvas Resizing Response

**Implementation in `Game.ts`:**

1. **Event Listener Setup**:
```typescript
// in create()
this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
```

2. **Resize Handler Chain**:
   - `handleResize()` → `calculateBoardDimensions()` → `boardView.updateVisualLayout()`

3. **Board Dimension Calculation**:
```typescript
calculateBoardDimensions() {
  const { width, height } = this.scale;
  
  // Calculate maximum gem size that fits
  const usableWidth = width * 0.95;
  const usableHeight = height * 0.90;
  
  const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
  const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
  
  this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));
  
  // Center the board
  const boardWidth = GRID_COLS * this.gemSize;
  const boardHeight = GRID_ROWS * this.gemSize;
  
  this.boardOffset = {
    x: Math.round((width - boardWidth) / 2),
    y: Math.round((height - boardHeight) / 2)
  };
}
```

4. **Visual Update**:
   - `BoardView.updateVisualLayout()` animates gems to new positions using tweens
   - Prevents jarring jumps on resize

### B. Game State Reactivity (MVC Pattern)

**Model-View-Controller Implementation:**

1. **Controller (`Game.ts`)**:
   - Listens for input: `POINTER_DOWN`, `POINTER_MOVE`, `POINTER_UP`
   - Interprets drag gestures → `MoveAction`
   - Validates moves with Model before committing

2. **Model (`BackendPuzzle.ts`)**:
   - Pure data representation (`PuzzleGrid`)
   - `getMatchesFromHypotheticalMove()`: Validates moves without state change
   - Updates state and calculates results (`ExplodeAndReplacePhase`)

3. **View (`BoardView.ts`)**:
   - Pure rendering, no game logic
   - Executes animation commands: `animateExplosions()`, `animateFalls()`
   - Manages sprites and visual effects

**Reactive Game Loop:**
1. User input → 2. Controller interprets → 3. Controller consults Model
4. If valid, Controller updates Model → 5. Model returns results
6. Controller commands View → 7. View updates display → 8. Wait for next input

---

## 4. Gem Positioning System

**Coordinate System:**
- Grid: 8 rows × 7 columns (`GRID_ROWS` × `GRID_COLS`)
- Gem spacing: 10% margin (gems scaled to 90% of `gemSize`)

**Position Calculation (`BoardView.getSpritePosition()`)**:
```typescript
// Center of gem at (gridX, gridY)
x = boardOffset.x + gridX * gemSize + gemSize / 2
y = boardOffset.y + gridY * gemSize + gemSize / 2
```

**Space Between Gems**: `gemSize * 0.1` (due to 90% scaling)

---

## 5. Dynamic Layout Modification Example

### Implementing Map Minimize Feature:

**Step 1: Add State to React Parent**
```typescript
// MainAppLayout.tsx
const [isMapMinimized, setIsMapMinimized] = useState(false);

useEffect(() => {
  EventBus.emit('layout-changed', { mapMinimized: isMapMinimized });
}, [isMapMinimized]);
```

**Step 2: Conditional CSS**
```css
.app-container.map-minimized .map-container {
  flex-basis: 50px; /* Shrink map */
}

.app-container.map-minimized .clue-container {
  flex-basis: 40%; /* Expand clues */
}
```

**Step 3: Phaser Response**
```typescript
// Game.ts
private isMapMinimized: boolean = false;

create() {
  EventBus.on('layout-changed', this.handleLayoutChange, this);
}

private handleLayoutChange(data: { mapMinimized: boolean }) {
  this.isMapMinimized = data.mapMinimized;
  this.handleResize(); // Trigger recalculation
}
```

---

## 6. Extension Points

### Adding New UI Elements:
1. **React Component**: Create in `src/components/`
2. **Add to Layout**: Include in `MainAppLayout.tsx`
3. **EventBus Integration**: Add listeners/emitters as needed

### Modifying Game Rules:
- Edit `BackendPuzzle.ts` for logic changes
- Update `BoardView.ts` for visual changes
- Modify `Game.ts` for input handling

### Changing Animations:
- Tween properties in `BoardView.updateVisualLayout()`
- Explosion effects in `BoardView.animateExplosions()`
- Fall animations in `BoardView.animateFalls()`

### Layout Adjustments:
- CSS in layout component for macro changes
- `calculateBoardDimensions()` for board positioning
- `getSpritePosition()` for gem spacing

---

## 7. Important Configuration Variables

### CesiumMap.tsx:
- `TITILER_BASE_URL`, `COG_URL`: Backend service endpoints
- `HABITAT_RADIUS_METERS`, `SPECIES_RADIUS_METERS`: Query radii
- `viewerRef`: Resium Viewer reference

### Game.ts:
- `GRID_COLS`, `GRID_ROWS`: Board dimensions (7×8)
- `gemSize`: Dynamic pixel size per gem
- `boardOffset`: Board position offset
- `backendPuzzle`: Game logic instance
- `boardView`: Visual representation instance

### BoardView.ts:
- `gemsSprites`: 2D array of Phaser sprites
- Animation durations and easing functions

---

## 8. Performance Considerations

- **Batch Updates**: Group EventBus emissions when possible
- **Tween Optimization**: Limit concurrent animations
- **React Re-renders**: Use `React.memo` for heavy components
- **Phaser Updates**: Only update changed sprites

---

## 9. Debugging Tips

1. **EventBus Debugging**:
```typescript
EventBus.on('*', (event, data) => console.log('Event:', event, data));
```

2. **Layout Debugging**: Add colored borders to CSS containers

3. **Phaser Debugging**: Enable debug mode in game config

4. **State Tracking**: Use React DevTools and Redux DevTools (if applicable)

---

## 10. Common Pitfalls

1. **Forgetting EventBus Cleanup**: Always remove listeners in cleanup
2. **Direct DOM Manipulation**: Never modify Phaser's canvas container directly
3. **State Synchronization**: Ensure React and Phaser states stay aligned
4. **Resize Throttling**: Consider debouncing resize handlers for performance

This guide should provide a comprehensive understanding of the reactive system. The key is understanding the separation of concerns between React (DOM/layout) and Phaser (game world), with EventBus as the bridge between them.