# UI Display System Reference Guide

## Overview
This document provides a comprehensive reference for the reactive UI display system, including all functions, variables, configuration values, and interaction patterns needed to understand and modify the display behavior.

---

## Architecture Components

### 1. React Layout Layer (`src/MainAppLayout.tsx`)

#### State Variables
```typescript
const [cesiumMinimized, setCesiumMinimized] = useState(false);
const phaserRef = useRef<IRefPhaserGame | null>(null);
```

#### Key Style Objects
```typescript
const appStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden'
};

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

#### Reactive Functions
```typescript
// Emits layout change event when state changes
useEffect(() => {
    EventBus.emit('layout-changed', { mapMinimized: cesiumMinimized });
}, [cesiumMinimized]);

// Handles Phaser scene ready callback
const handlePhaserSceneReady = (scene: Phaser.Scene) => {
    console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
    if (phaserRef.current) {
        phaserRef.current.scene = scene;
    }
};
```

### 2. Phaser Game Layer (`src/game/scenes/Game.ts`)

#### Core Layout Variables
```typescript
private gemSize: number = 64;                    // Size of each gem in pixels
private boardOffset: BoardOffset = { x: 0, y: 0 }; // Top-left position of board
private isMapMinimized: boolean = false;         // Layout state
```

#### UI Text Elements
```typescript
private statusText: Phaser.GameObjects.Text | null = null;  // Center status messages
private scoreText: Phaser.GameObjects.Text | null = null;   // Top-left score display
private movesText: Phaser.GameObjects.Text | null = null;   // Top-right moves display
```

#### Layout Constants
```typescript
const TOP_UI_OFFSET = 60;  // Space reserved at top for score/moves (pixels)
const GRID_COLS = 7;       // Number of columns in gem grid
const GRID_ROWS = 8;       // Number of rows in gem grid
```

#### Key Calculation Functions

##### `calculateBoardDimensions()`
**Purpose**: Calculates gem size and board position based on current screen size and layout state.

```typescript
private calculateBoardDimensions(): void {
    const { width, height } = this.scale;
    if (width <= 0 || height <= 0) {
        console.warn("Invalid scale dimensions.");
        return;
    }
    
    // Define constants for UI space
    const TOP_UI_OFFSET = 60; // Space for score/moves text at top
    
    const usableWidth = width * 0.95;
    
    // When map is minimized, use more vertical space but leave room at top for UI
    const usableHeight = this.isMapMinimized 
        ? height - TOP_UI_OFFSET - 20  // Almost full height minus top UI
        : height * 0.90;               // Original logic
    
    const sizeFromWidth = Math.floor(usableWidth / GRID_COLS);
    const sizeFromHeight = Math.floor(usableHeight / GRID_ROWS);
    this.gemSize = Math.max(24, Math.min(sizeFromWidth, sizeFromHeight));
    const boardWidth = GRID_COLS * this.gemSize;
    const boardHeight = GRID_ROWS * this.gemSize;
    
    // X offset is still centered
    const boardOffsetX = Math.round((width - boardWidth) / 2);
    
    // Y offset changes based on map minimized state
    const boardOffsetY = this.isMapMinimized
        ? TOP_UI_OFFSET  // Position right below top UI when map minimized
        : Math.round((height - boardHeight) / 2); // Center vertically normally
    
    this.boardOffset = {
        x: boardOffsetX,
        y: boardOffsetY
    };
}
```

##### `handleLayoutChange()`
**Purpose**: Responds to layout state changes from React layer.

```typescript
private handleLayoutChange(data: { mapMinimized: boolean }): void {
    console.log(`Game Scene: Layout changed - Map minimized = ${data.mapMinimized}`);
    this.isMapMinimized = data.mapMinimized;
    
    // Trigger a resize/recalculation to update board position
    this.handleResize();
}
```

##### `handleResize()`
**Purpose**: Handles window/canvas resize events and updates all UI elements.

```typescript
private handleResize(): void {
    console.log("Game Scene: Resize detected.");
    const { width, height } = this.scale;
    this.calculateBoardDimensions();
    
    if (this.statusText && this.statusText.active) {
        this.statusText.setPosition(width / 2, height / 2);
        const textStyle = this.statusText.style;
        if (textStyle && typeof textStyle.setWordWrapWidth === 'function') {
            textStyle.setWordWrapWidth(width * 0.8);
        }
    }
    
    // Update UI positions
    if (this.movesText) {
        this.movesText.setPosition(width - 20, 20);
    }
    
    if (this.boardView) {
        this.boardView.updateVisualLayout(this.gemSize, this.boardOffset);
    }
}
```

#### Event Listener Setup
```typescript
// In create() method
this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
EventBus.on('cesium-location-selected', this.initializeBoardFromCesium, this);
EventBus.on('layout-changed', this.handleLayoutChange, this);
```

#### Event Cleanup
```typescript
// In shutdown() method
EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
EventBus.off('layout-changed', this.handleLayoutChange, this);
this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
```

### 3. Board View Layer (`src/game/BoardView.ts`)

#### Core Properties
```typescript
private scene: Phaser.Scene;
private gridCols: number;                        // Number of columns
private gridRows: number;                        // Number of rows  
private gemSize: number;                         // Size of each gem
private boardOffset: { x: number; y: number };  // Board position
private gemsSprites: (Phaser.GameObjects.Sprite | null)[][]; // 2D sprite array
private gemGroup: Phaser.GameObjects.Group;     // Sprite group for management
```

#### Position Calculation Functions

##### `getSpritePosition()`
**Purpose**: Calculates the exact pixel position for a gem at given grid coordinates.

```typescript
private getSpritePosition(gridX: number, gridY: number): { x: number; y: number } {
    return {
        x: this.boardOffset.x + gridX * this.gemSize + this.gemSize / 2,
        y: this.boardOffset.y + gridY * this.gemSize + this.gemSize / 2
    };
}
```

##### `calculateSpriteScale()`
**Purpose**: Determines the scale factor for gem sprites (90% of gem size for spacing).

```typescript
private calculateSpriteScale(sprite: Phaser.GameObjects.Sprite): number {
    if (!sprite.texture || !sprite.frame) {
        console.warn("BoardView: Sprite missing texture or frame for scale calculation.");
        return 0.9; // Fallback
    }
    const frameWidth = sprite.frame.width;
    const frameHeight = sprite.frame.height;
    const maxFrameDimension = Math.max(frameWidth, frameHeight);
    return (this.gemSize * 0.9) / maxFrameDimension; // 90% to create spacing
}
```

#### Animation Functions

##### `updateVisualLayout()`
**Purpose**: Smoothly animates existing sprites to new positions/scales.

```typescript
updateVisualLayout(newGemSize: number, newBoardOffset: { x: number; y: number }): void {
    console.log("BoardView: Updating visual layout.");
    this.gemSize = newGemSize;
    this.boardOffset = newBoardOffset;

    this.iterateSprites((sprite, x, y) => {
        const targetPos = this.getSpritePosition(x, y);
        const newScale = this.calculateSpriteScale(sprite);

        this.scene.tweens.killTweensOf(sprite); // Stop existing movement
        this.scene.tweens.add({
            targets: sprite,
            x: targetPos.x,
            y: targetPos.y,
            scale: newScale,
            duration: TWEEN_DURATION_LAYOUT_UPDATE,
            ease: 'Sine.easeInOut'
        });
    });
}
```

##### `updateDimensions()`
**Purpose**: Updates internal dimensions without animation (for board recreation scenarios).

```typescript
updateDimensions(newGemSize: number, newBoardOffset: { x: number; y: number }): void {
    console.log("BoardView: Updating dimensions (no animation).");
    this.gemSize = newGemSize;
    this.boardOffset = newBoardOffset;
}
```

### 4. EventBus Communication (`src/game/EventBus.ts`)

#### Event Definitions
```typescript
export interface EventPayloads {
    'current-scene-ready': Phaser.Scene;
    'cesium-location-selected': {
        lon: number;
        lat: number;
        habitats: string[];
        species: Species[];
        rasterHabitats: RasterHabitatResult[];
    };
    'layout-changed': {
        mapMinimized: boolean;
    };
    'clue-revealed': {
        category: number;
        heading: string;
        clue: string;
        speciesId: number;
    };
    // ... other events
}
```

#### Communication Patterns
```typescript
// React → Phaser
EventBus.emit('layout-changed', { mapMinimized: cesiumMinimized });

// Phaser → React  
EventBus.emit('clue-revealed', clueData);

// Listening for events
EventBus.on('layout-changed', this.handleLayoutChange, this);
```

---

## Configuration Values

### Layout Breakpoints
```typescript
// Default layout (map visible)
MAP_HEIGHT = '30%'
GAME_HEIGHT = 'calc(100% - 150px)'
CLUE_HEIGHT = '150px'

// Minimized layout (map hidden)
MAP_HEIGHT = '0%'
GAME_HEIGHT = '60%'
CLUE_HEIGHT = '40%'
```

### Animation Timings
```typescript
// CSS transitions
LAYOUT_TRANSITION = '0.3s ease-in-out'

// Phaser tweens (from constants.ts)
TWEEN_DURATION_LAYOUT_UPDATE = 300  // milliseconds
TWEEN_DURATION_EXPLODE = 200
TWEEN_DURATION_FALL_BASE = 150
TWEEN_DURATION_SNAP = 100
```

### Board Spacing
```typescript
GEM_SCALE_FACTOR = 0.9          // Gems are 90% of cell size
GEM_SPACING = gemSize * 0.1     // 10% margin around each gem
BOARD_MARGIN_X = width * 0.05   // 5% margin on sides
BOARD_MARGIN_Y = height * 0.10  // 10% margin top/bottom (normal mode)
```

### UI Positioning
```typescript
TOP_UI_OFFSET = 60              // Space for score/moves at top
SCORE_POSITION = { x: 20, y: 20 }
MOVES_POSITION = { x: width - 20, y: 20 }
STATUS_POSITION = { x: width / 2, y: height / 2 }
```

---

## Responsive Behavior Patterns

### 1. Window Resize
**Trigger**: Browser window size change
**Flow**:
1. Phaser detects resize → `Phaser.Scale.Events.RESIZE`
2. `handleResize()` called
3. `calculateBoardDimensions()` recalculates layout
4. `updateVisualLayout()` animates gems to new positions

### 2. Map Minimize/Expand
**Trigger**: User clicks minimize button
**Flow**:
1. React state change → `setCesiumMinimized(!cesiumMinimized)`
2. CSS transitions start for container heights
3. `useEffect` triggers → `EventBus.emit('layout-changed')`
4. Phaser receives event → `handleLayoutChange()`
5. `handleResize()` recalculates board position
6. Gems animate to new positions

### 3. Board Recreation
**Trigger**: New location selected from map
**Flow**:
1. `initializeBoardFromCesium()` called
2. `calculateBoardDimensions()` updates layout
3. `updateDimensions()` updates BoardView (no animation)
4. Old board destroyed → `destroyBoard()`
5. New board created → `createBoard()` at correct positions

---

## Debugging Reference

### Console Logs to Monitor
```typescript
"Game Scene: Layout changed - Map minimized = true/false"
"Game Scene: Resize detected."
"BoardView: Updating visual layout."
"BoardView: Updating dimensions (no animation)."
"Game Scene: Board initialized with random gems."
```

### CSS Debug Classes
```css
/* Add colored borders to visualize containers */
.app-container { border: 2px solid red; }
.cesium-container { border: 2px solid blue; }
.phaser-container { border: 2px solid green; }
.game-ui-panel { border: 2px solid yellow; }
```

### EventBus Debug
```typescript
// Monitor all events
EventBus.on('*', (event, data) => console.log('Event:', event, data));
```

---

## Extension Points

### Adding New Layout States
1. Add state to `MainAppLayout.tsx`
2. Create CSS styles for new state
3. Add event type to `EventPayloads`
4. Handle event in `Game.ts`
5. Update `calculateBoardDimensions()` logic

### Modifying Animations
- **Layout transitions**: Modify CSS `transition` properties
- **Gem movements**: Adjust `TWEEN_DURATION_*` constants
- **Easing functions**: Change `ease` property in tween configs

### Responsive Breakpoints
```typescript
// Add mobile-specific behavior
const isMobile = width < 768;
const boardMargin = isMobile ? 0.02 : 0.05;
```

### Performance Optimization
- Use `React.memo` for heavy components
- Debounce resize handlers
- Pool Phaser sprites for frequent creation/destruction
- Batch EventBus emissions

---

## Common Issues and Solutions

### Issue: Board jumps after recreation
**Solution**: Use `updateDimensions()` instead of `updateVisualLayout()` before board recreation

### Issue: Animations conflict
**Solution**: Always call `this.scene.tweens.killTweensOf(sprite)` before new animations

### Issue: Layout doesn't update
**Solution**: Ensure EventBus listeners are properly set up and cleaned up

### Issue: Performance problems
**Solution**: Limit concurrent tweens, use sprite pooling, debounce resize events

This reference should provide everything needed to understand, debug, and extend the UI display system.

---

## Additional UI Components

### Gem Legend Display

The gem legend display shows users which gem colors correspond to which clue categories. This feature can be re-added to the UI in several ways:

#### Implementation Components

1. **GemLegendDialog Component** (`src/components/GemLegendDialog.tsx`)
   - A modal dialog that displays all 8 gem types with their corresponding categories
   - Shows gem images from `/assets/[color]_gem_0.png`
   - Displays category icon and name from `CLUE_CONFIG`

2. **GemLegend Component** (`src/components/GemLegend.tsx`)
   - Can be used as an inline component instead of a dialog
   - Same display logic but embedded directly in the UI

#### Adding the Gem Legend to Your UI

**Option 1: As a Modal Dialog with Info Button**
```typescript
// In your component that needs the legend (e.g., SpeciesPanel.tsx)
import { GemLegendDialog } from './GemLegendDialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

// Add state
const [legendOpen, setLegendOpen] = useState<boolean>(false);

// In your JSX
<Button
  variant="ghost"
  size="sm"
  onClick={() => setLegendOpen(true)}
  className="text-slate-400 hover:text-cyan-300"
>
  <Info className="h-4 w-4" />
</Button>

<GemLegendDialog open={legendOpen} onOpenChange={setLegendOpen} />
```

**Option 2: As a Standalone Button in Game UI**
```typescript
// Add to MainAppLayout.tsx or create a new overlay component
<div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
  <Button onClick={() => setLegendOpen(true)}>
    <Info className="mr-2 h-4 w-4" /> Gem Guide
  </Button>
</div>
```

**Option 3: As an Inline Component**
```typescript
// Use GemLegend component directly in a sidebar or panel
import { GemLegend } from './GemLegend';

<div className="gem-legend-container">
  <h3>Gem Categories</h3>
  <GemLegend />
</div>
```

**Option 4: In the Main Menu or Settings**
```typescript
// Add to game settings or help menu
<MenuItem onClick={() => setShowLegend(true)}>
  View Gem Categories
</MenuItem>
```

**Option 5: As a Collapsible Panel**
```typescript
// Using shadcn/ui Collapsible component
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

<Collapsible>
  <CollapsibleTrigger>
    <Button variant="ghost" size="sm">
      <Info className="mr-2 h-4 w-4" /> Gem Guide
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <GemLegend />
  </CollapsibleContent>
</Collapsible>
```

#### Styling Considerations
- The dialog uses dark theme styling matching the game's aesthetic
- Gem images use `imageRendering: 'pixelated'` for crisp pixel art
- Each gem is displayed at 32x32 pixels with category information
- The dialog is scrollable for mobile devices

#### EventBus Integration
If you want to trigger the legend from game events:
```typescript
// Emit from Phaser
EventBus.emit('show-gem-legend');

// Listen in React
useEffect(() => {
  const handleShowLegend = () => setLegendOpen(true);
  EventBus.on('show-gem-legend', handleShowLegend);
  return () => EventBus.off('show-gem-legend', handleShowLegend);
}, []);