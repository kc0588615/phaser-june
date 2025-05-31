# TypeScript Conversion Plan for Phaser Game Logic

## Overview
This plan details the step-by-step conversion of JavaScript files in `src/game/` to TypeScript, building on the existing Next.js + TypeScript foundation.

## Current State
- ✅ EventBus.ts - Already TypeScript
- ❌ All other game files - JavaScript
- ✅ React components - TypeScript (.tsx)
- ✅ tsconfig.json - `allowJs: true` enabled

## Conversion Order & Phases

### Phase 1: Foundation Files (No Dependencies)
These files have no external dependencies and provide the foundation for other conversions.

#### 1.1 Convert `constants.js` → `constants.ts`

**Current Structure:**
```javascript
// constants.js
export const GRID_COLS = 8;
export const GRID_ROWS = 8;
export const GEM_TYPES = ['red', 'blue', 'green', 'orange', 'black', 'white'];
```

**TypeScript Conversion:**
```typescript
// constants.ts
export const GRID_COLS = 8 as const;
export const GRID_ROWS = 8 as const;

export const GEM_TYPES = ['red', 'blue', 'green', 'orange', 'black', 'white'] as const;
export type GemType = typeof GEM_TYPES[number];

export const ANIMATION_DURATIONS = {
  SWAP: 200,
  EXPLODE: 300,
  FALL: 100,
} as const;

// Habitat to gem mapping with proper typing
export const HABITAT_GEM_MAP: Record<number, GemType> = {
  // Forests (100-109) → Green
  100: 'green', 101: 'green', 102: 'green',
  // Wetlands (500-518) → Blue  
  500: 'blue', 501: 'blue',
  // Urban (1400-1406) → Red
  1400: 'red', 1401: 'red',
  // Add all mappings...
} as const;
```

#### 1.2 Convert `MoveAction.js` → `MoveAction.ts`

**Current Structure:**
```javascript
// MoveAction.js
export default class MoveAction {
  constructor(row1, col1, row2, col2) {
    this.row1 = row1;
    this.col1 = col1;
    this.row2 = row2;
    this.col2 = col2;
  }
}
```

**TypeScript Conversion:**
```typescript
// MoveAction.ts
export default class MoveAction {
  constructor(
    public readonly row1: number,
    public readonly col1: number,
    public readonly row2: number,
    public readonly col2: number
  ) {}
  
  // Optional: Add utility methods
  isAdjacent(): boolean {
    const rowDiff = Math.abs(this.row2 - this.row1);
    const colDiff = Math.abs(this.col2 - this.col1);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }
}
```

#### 1.3 Convert `ExplodeAndReplacePhase.js` → `ExplodeAndReplacePhase.ts`

**TypeScript Conversion:**
```typescript
// ExplodeAndReplacePhase.ts
import { GemType } from './constants';

export interface ExplodedGem {
  row: number;
  col: number;
  gemType: GemType;
}

export interface NewGem {
  row: number;
  col: number;
  gemType: GemType;
}

export default class ExplodeAndReplacePhase {
  constructor(
    public readonly explodedGems: ExplodedGem[],
    public readonly newGems: NewGem[]
  ) {}
}
```

### Phase 2: Enhance EventBus Types

#### 2.1 Update `EventBus.ts` with Strong Typing

**Current (Basic TypeScript):**
```typescript
// EventBus.ts
import Phaser from 'phaser';
export const EventBus = new Phaser.Events.EventEmitter();
```

**Enhanced TypeScript:**
```typescript
// EventBus.ts
import Phaser from 'phaser';

// Define all event types and their payloads
export interface EventPayloads {
  'current-scene-ready': Phaser.Scene;
  'cesium-location-selected': {
    lon: number;
    lat: number;
    habitats: number[];
    species: string[];
  };
  'game-score-updated': {
    score: number;
    movesRemaining: number;
  };
  'game-over': {
    finalScore: number;
    habitats: number[];
  };
}

// Type-safe EventBus class
class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends keyof EventPayloads>(event: K, ...args: [EventPayloads[K]]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof EventPayloads>(
    event: K,
    fn: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.on(event, fn, context);
  }

  once<K extends keyof EventPayloads>(
    event: K,
    fn: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.once(event, fn, context);
  }

  off<K extends keyof EventPayloads>(
    event: K,
    fn?: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.off(event, fn, context);
  }
}

export const EventBus = new TypedEventBus();
```

### Phase 3: Core Game Logic

#### 3.1 Convert `BackendPuzzle.js` → `BackendPuzzle.ts`

**Key Typing Considerations:**
```typescript
// BackendPuzzle.ts
import { GemType, GRID_COLS, GRID_ROWS, HABITAT_GEM_MAP } from './constants';
import ExplodeAndReplacePhase from './ExplodeAndReplacePhase';

export default class BackendPuzzle {
  private grid: (GemType | null)[][];
  private score: number;
  private movesRemaining: number;

  constructor() {
    this.grid = [];
    this.score = 0;
    this.movesRemaining = 30;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = Array(GRID_ROWS).fill(null).map(() => 
      Array(GRID_COLS).fill(null)
    );
  }

  generateBoardFromHabitats(habitats: number[]): void {
    // Convert habitats to gem distribution
    const gemDistribution = this.calculateGemDistribution(habitats);
    this.populateGrid(gemDistribution);
  }

  private calculateGemDistribution(habitats: number[]): Map<GemType, number> {
    const distribution = new Map<GemType, number>();
    
    habitats.forEach(habitat => {
      const gemType = HABITAT_GEM_MAP[habitat];
      if (gemType) {
        distribution.set(gemType, (distribution.get(gemType) || 0) + 1);
      }
    });
    
    return distribution;
  }

  getMatches(): Array<{row: number, col: number}[]> {
    // Implementation with proper typing
    const matches: Array<{row: number, col: number}[]> = [];
    // ... matching logic
    return matches;
  }

  // Add other methods with proper types
}
```

### Phase 4: Scene Conversions

#### 4.1 Convert Simple Scenes First

**Boot.ts Example:**
```typescript
// scenes/Boot.ts
import Phaser from 'phaser';

export default class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Set load path
    this.load.setPath('assets');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
```

**Preloader.ts with Asset Loading:**
```typescript
// scenes/Preloader.ts
import Phaser from 'phaser';
import { GEM_TYPES } from '../constants';

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  init(): void {
    // Add loading bar
    const width = this.scale.width;
    const height = this.scale.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
  }

  preload(): void {
    this.load.setPath('assets');
    
    // Load gem sprites
    GEM_TYPES.forEach(gemType => {
      for (let i = 0; i < 8; i++) {
        this.load.image(`${gemType}_gem_${i}`, `${gemType}_gem_${i}.png`);
      }
    });
    
    // Load other assets
    this.load.image('background', 'bg.png');
    this.load.image('logo', 'logo.png');
  }

  create(): void {
    this.scene.start('MainMenu');
  }
}
```

#### 4.2 Convert Complex Scene - `Game.ts`

**Detailed Game.ts Conversion:**
```typescript
// scenes/Game.ts
import Phaser from 'phaser';
import BackendPuzzle from '../BackendPuzzle';
import BoardView from '../BoardView';
import MoveAction from '../MoveAction';
import { EventBus, EventPayloads } from '../EventBus';
import { GRID_COLS, GRID_ROWS } from '../constants';

interface GameData {
  habitats?: number[];
  species?: string[];
}

export default class Game extends Phaser.Scene {
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private backendPuzzle!: BackendPuzzle;
  private boardView!: BoardView;
  private scoreText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private selectedGem: { row: number; col: number } | null = null;
  private isProcessing: boolean = false;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.backendPuzzle = new BackendPuzzle();
    
    // Generate board from habitats if provided
    if (data.habitats && data.habitats.length > 0) {
      this.backendPuzzle.generateBoardFromHabitats(data.habitats);
    } else {
      this.backendPuzzle.generateRandomBoard();
    }
  }

  create(): void {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x000000);

    // Create background
    const bg = this.add.image(512, 384, 'background');
    bg.setAlpha(0.5);

    // Create board view
    this.boardView = new BoardView(this, 100, 100);
    this.boardView.displayBoard(this.backendPuzzle.getGrid());

    // Create UI
    this.createUI();

    // Setup input handlers
    this.setupInputHandlers();

    // Listen for Cesium events
    EventBus.on('cesium-location-selected', this.handleLocationSelected, this);

    // Emit scene ready
    EventBus.emit('current-scene-ready', this);
  }

  private createUI(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
    };

    this.scoreText = this.add.text(10, 10, 'Score: 0', style);
    this.movesText = this.add.text(10, 50, 'Moves: 30', style);
  }

  private setupInputHandlers(): void {
    this.input.on('gameobjectdown', this.handleGemClick, this);
  }

  private handleGemClick(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject
  ): void {
    if (this.isProcessing) return;

    const sprite = gameObject as Phaser.GameObjects.Sprite;
    const row = sprite.getData('row') as number;
    const col = sprite.getData('col') as number;

    if (!this.selectedGem) {
      this.selectedGem = { row, col };
      this.boardView.highlightGem(row, col);
    } else {
      // Try to swap
      const move = new MoveAction(
        this.selectedGem.row,
        this.selectedGem.col,
        row,
        col
      );

      if (move.isAdjacent()) {
        this.processMove(move);
      }

      this.boardView.clearHighlight();
      this.selectedGem = null;
    }
  }

  private async processMove(move: MoveAction): Promise<void> {
    this.isProcessing = true;

    // Perform swap animation
    await this.boardView.animateSwap(move);

    // Check if valid move
    const isValid = this.backendPuzzle.tryMove(move);

    if (isValid) {
      // Process matches
      await this.processMatches();
      this.updateUI();
    } else {
      // Swap back
      await this.boardView.animateSwap(
        new MoveAction(move.row2, move.col2, move.row1, move.col1)
      );
    }

    this.isProcessing = false;
  }

  private async processMatches(): Promise<void> {
    let hasMatches = true;

    while (hasMatches) {
      const phase = this.backendPuzzle.processMatches();
      
      if (phase.explodedGems.length > 0) {
        await this.boardView.animateExplodeAndReplace(phase);
      } else {
        hasMatches = false;
      }
    }
  }

  private updateUI(): void {
    this.scoreText.setText(`Score: ${this.backendPuzzle.getScore()}`);
    this.movesText.setText(`Moves: ${this.backendPuzzle.getMovesRemaining()}`);

    if (this.backendPuzzle.isGameOver()) {
      this.scene.start('GameOver', { 
        score: this.backendPuzzle.getScore() 
      });
    }
  }

  private handleLocationSelected(data: EventPayloads['cesium-location-selected']): void {
    console.log('New location selected:', data);
    
    // Regenerate board with new habitat data
    this.backendPuzzle.generateBoardFromHabitats(data.habitats);
    this.boardView.displayBoard(this.backendPuzzle.getGrid());
    this.updateUI();
  }

  destroy(): void {
    EventBus.off('cesium-location-selected', this.handleLocationSelected, this);
    super.destroy();
  }
}
```

### Phase 5: BoardView Conversion (Heavy Phaser Usage)

#### 5.1 Convert `BoardView.js` → `BoardView.ts`

```typescript
// BoardView.ts
import Phaser from 'phaser';
import { GemType, GRID_COLS, GRID_ROWS, ANIMATION_DURATIONS } from './constants';
import MoveAction from './MoveAction';
import ExplodeAndReplacePhase from './ExplodeAndReplacePhase';

export default class BoardView {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private gemSize: number = 64;
  private gemSprites: (Phaser.GameObjects.Sprite | null)[][];
  private highlightRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.gemSprites = Array(GRID_ROWS).fill(null).map(() => 
      Array(GRID_COLS).fill(null)
    );
  }

  displayBoard(grid: (GemType | null)[][]): void {
    // Clear existing sprites
    this.clearBoard();

    // Create new sprites
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gemType = grid[row][col];
        if (gemType) {
          this.createGemSprite(row, col, gemType);
        }
      }
    }
  }

  private createGemSprite(row: number, col: number, gemType: GemType): void {
    const x = this.x + col * this.gemSize;
    const y = this.y + row * this.gemSize;
    
    // Random gem variant (0-7)
    const variant = Phaser.Math.Between(0, 7);
    const sprite = this.scene.add.sprite(x, y, `${gemType}_gem_${variant}`);
    
    sprite.setOrigin(0.5);
    sprite.setInteractive();
    sprite.setData('row', row);
    sprite.setData('col', col);
    sprite.setData('gemType', gemType);
    
    this.gemSprites[row][col] = sprite;
  }

  highlightGem(row: number, col: number): void {
    const sprite = this.gemSprites[row][col];
    if (!sprite) return;

    if (this.highlightRect) {
      this.highlightRect.destroy();
    }

    this.highlightRect = this.scene.add.rectangle(
      sprite.x,
      sprite.y,
      this.gemSize,
      this.gemSize,
      0xffff00,
      0.3
    );
  }

  clearHighlight(): void {
    if (this.highlightRect) {
      this.highlightRect.destroy();
      this.highlightRect = null;
    }
  }

  async animateSwap(move: MoveAction): Promise<void> {
    const sprite1 = this.gemSprites[move.row1][move.col1];
    const sprite2 = this.gemSprites[move.row2][move.col2];

    if (!sprite1 || !sprite2) return;

    // Swap in the array
    this.gemSprites[move.row1][move.col1] = sprite2;
    this.gemSprites[move.row2][move.col2] = sprite1;

    // Update data
    sprite1.setData('row', move.row2);
    sprite1.setData('col', move.col2);
    sprite2.setData('row', move.row1);
    sprite2.setData('col', move.col1);

    // Animate
    return new Promise<void>((resolve) => {
      const timeline = this.scene.tweens.createTimeline();

      timeline.add({
        targets: sprite1,
        x: sprite2.x,
        y: sprite2.y,
        duration: ANIMATION_DURATIONS.SWAP,
        ease: 'Power2'
      });

      timeline.add({
        targets: sprite2,
        x: sprite1.x,
        y: sprite1.y,
        duration: ANIMATION_DURATIONS.SWAP,
        ease: 'Power2',
        offset: `-=${ANIMATION_DURATIONS.SWAP}` // Run simultaneously
      });

      timeline.on('complete', () => resolve());
      timeline.play();
    });
  }

  async animateExplodeAndReplace(phase: ExplodeAndReplacePhase): Promise<void> {
    // Explode gems
    const explodePromises = phase.explodedGems.map(gem => 
      this.explodeGem(gem.row, gem.col)
    );
    
    await Promise.all(explodePromises);

    // Drop and create new gems
    await this.dropGems();
    
    // Create new gems at top
    phase.newGems.forEach(gem => {
      this.createGemSprite(-1, gem.col, gem.gemType);
      // Animate fall to final position
      const sprite = this.gemSprites[-1][gem.col];
      if (sprite) {
        this.animateGemFall(sprite, gem.row, gem.col);
      }
    });
  }

  private explodeGem(row: number, col: number): Promise<void> {
    const sprite = this.gemSprites[row][col];
    if (!sprite) return Promise.resolve();

    this.gemSprites[row][col] = null;

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: sprite,
        scale: { from: 1, to: 0 },
        alpha: { from: 1, to: 0 },
        duration: ANIMATION_DURATIONS.EXPLODE,
        ease: 'Back.easeIn',
        onComplete: () => {
          sprite.destroy();
          resolve();
        }
      });
    });
  }

  private async dropGems(): Promise<void> {
    // Implementation for dropping gems after explosions
    // This would scan columns and drop gems to fill gaps
  }

  private animateGemFall(
    sprite: Phaser.GameObjects.Sprite, 
    targetRow: number, 
    targetCol: number
  ): void {
    const targetY = this.y + targetRow * this.gemSize;
    
    this.scene.tweens.add({
      targets: sprite,
      y: targetY,
      duration: ANIMATION_DURATIONS.FALL * (targetRow + 1),
      ease: 'Bounce.easeOut'
    });

    this.gemSprites[targetRow][targetCol] = sprite;
    sprite.setData('row', targetRow);
    sprite.setData('col', targetCol);
  }

  private clearBoard(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const sprite = this.gemSprites[row][col];
        if (sprite) {
          sprite.destroy();
          this.gemSprites[row][col] = null;
        }
      }
    }
  }
}
```

### Phase 6: Main Entry Point

#### 6.1 Convert `main.js` → `main.ts`

```typescript
// main.ts
import Phaser from 'phaser';
import Boot from './scenes/Boot';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';
import GameOver from './scenes/GameOver';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Boot, Preloader, MainMenu, Game, GameOver]
};

const StartGame = (parent: string): Phaser.Game => {
  const modifiedConfig = { ...config, parent };
  return new Phaser.Game(modifiedConfig);
};

export default StartGame;
```

## Phase 7: Update Existing TypeScript Components

### 7.1 Improve `CesiumMap.tsx`

```typescript
// CesiumMap.tsx improvements
import { Viewer, Entity, Cartesian3, Cartographic, ScreenSpaceEventHandler } from 'cesium';
import { EventBus } from '@/game/EventBus';

interface CesiumMapProps {
  onLocationSelected?: (data: {
    lon: number;
    lat: number;
    habitats: number[];
    species: string[];
  }) => void;
}

const CesiumMap: React.FC<CesiumMapProps> = ({ onLocationSelected }) => {
  const viewerRef = useRef<Viewer | null>(null);
  const [infoBoxData, setInfoBoxData] = useState<{
    lon: number;
    lat: number;
    habitats: number[];
    species: string[];
  } | null>(null);

  const handleMapClick = useCallback((movement: { position: Cartesian2 }) => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;
    const cartesian = viewer.camera.pickEllipsoid(
      movement.position,
      viewer.scene.globe.ellipsoid
    );

    if (cartesian) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const longitude = CesiumMath.toDegrees(cartographic.longitude);
      const latitude = CesiumMath.toDegrees(cartographic.latitude);

      // Query backend API
      queryLocationInfo(longitude, latitude);
    }
  }, []);

  // Rest of component...
};
```

### 7.2 Update `PhaserGame.tsx`

```typescript
// PhaserGame.tsx improvements
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from '@/game/main';
import { EventBus } from '@/game/EventBus';
import Phaser from 'phaser';

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface PhaserGameProps {
  currentActiveScene?: (scene: Phaser.Scene) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, PhaserGameProps>(
  ({ currentActiveScene }, ref) => {
    const game = useRef<Phaser.Game | null>(null);

    useLayoutEffect(() => {
      if (game.current === null) {
        game.current = StartGame('game-container');

        if (typeof ref === 'function') {
          ref({ game: game.current, scene: null });
        } else if (ref) {
          ref.current = { game: game.current, scene: null };
        }
      }

      return () => {
        if (game.current) {
          game.current.destroy(true);
          game.current = null;
        }
      };
    }, [ref]);

    useEffect(() => {
      EventBus.on('current-scene-ready', (scene: Phaser.Scene) => {
        if (currentActiveScene) {
          currentActiveScene(scene);
        }

        if (typeof ref === 'function') {
          ref({ game: game.current, scene });
        } else if (ref) {
          ref.current = { game: game.current, scene };
        }
      });

      return () => {
        EventBus.removeListener('current-scene-ready');
      };
    }, [currentActiveScene, ref]);

    return <div id="game-container" className="game-container" />;
  }
);

PhaserGame.displayName = 'PhaserGame';
```

## Phase 8: Shared Type Definitions

Create a central types file:

```typescript
// src/types/game.types.ts
export interface GameState {
  score: number;
  movesRemaining: number;
  level: number;
  habitats: number[];
}

export interface LocationData {
  lon: number;
  lat: number;
  habitats: number[];
  species: string[];
}

export interface GameConfig {
  gridCols: number;
  gridRows: number;
  gemTypes: readonly string[];
  animationDurations: {
    swap: number;
    explode: number;
    fall: number;
  };
}

// Re-export commonly used types
export { GemType } from '@/game/constants';
export { EventPayloads } from '@/game/EventBus';
```

## Phase 9: Testing & Verification Strategy

### 9.1 Iterative Conversion Process

1. **For each file conversion:**
   ```bash
   # 1. Rename file
   mv src/game/constants.js src/game/constants.ts
   
   # 2. Run type check
   npm run typecheck
   
   # 3. Fix TypeScript errors
   # Edit the file to add types
   
   # 4. Test functionality
   npm run dev
   # Manually test the affected functionality
   
   # 5. Commit the change
   git add .
   git commit -m "Convert constants.js to TypeScript"
   ```

2. **Create a typecheck script in package.json:**
   ```json
   {
     "scripts": {
       "typecheck": "tsc --noEmit",
       "typecheck:watch": "tsc --noEmit --watch"
     }
   }
   ```

3. **Run continuous type checking during conversion:**
   ```bash
   npm run typecheck:watch
   ```

### 9.2 Verification Checklist

For each converted file, verify:
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Game still runs (`npm run dev`)
- [ ] Phaser types show in IDE autocomplete
- [ ] Event types are properly inferred
- [ ] No runtime errors in browser console
- [ ] Game mechanics work as before

## Phase 10: Final TypeScript Configuration

Once all files are converted:

1. **Update tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "allowJs": false,  // Disable JS files
       "strict": true,    // Enable all strict checks
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictPropertyInitialization": true
     }
   }
   ```

2. **Add type checking to build process:**
   ```json
   {
     "scripts": {
       "build": "npm run typecheck && next build"
     }
   }
   ```

## Common Challenges & Solutions

### Challenge 1: Dynamic Phaser Properties
```typescript
// Problem: Phaser adds properties dynamically
// Solution: Use declaration merging
declare module 'phaser' {
  namespace GameObjects {
    interface Sprite {
      gemType?: GemType;
      gridRow?: number;
      gridCol?: number;
    }
  }
}
```

### Challenge 2: Event Typing
```typescript
// Problem: Complex event payloads
// Solution: Use EventPayloads interface with mapped types
```

### Challenge 3: Async Animations
```typescript
// Problem: Phaser tweens aren't Promise-based
// Solution: Wrap in Promises
function tweenPromise(tween: Phaser.Tweens.Tween): Promise<void> {
  return new Promise(resolve => {
    tween.on('complete', resolve);
  });
}
```

### Challenge 4: This Context in Scenes
```typescript
// Problem: 'this' context in callbacks
// Solution: Use arrow functions or bind
this.input.on('gameobjectdown', this.handleClick, this);
// or
this.input.on('gameobjectdown', (pointer, gameObject) => {
  this.handleClick(pointer, gameObject);
});
```

## Success Criteria

The TypeScript conversion is complete when:
1. ✅ All `.js` files in `src/game/` are converted to `.ts`
2. ✅ `allowJs: false` in tsconfig.json
3. ✅ No TypeScript errors with strict mode
4. ✅ Full IDE IntelliSense support
5. ✅ Type-safe event communication
6. ✅ All game functionality preserved
7. ✅ Build process includes type checking

## Estimated Timeline

- Phase 1 (Foundation): 2-3 hours
- Phase 2 (EventBus): 1 hour
- Phase 3 (Game Logic): 3-4 hours
- Phase 4 (Scenes): 4-5 hours
- Phase 5 (BoardView): 3-4 hours
- Phase 6-7 (Main & Components): 2 hours
- Phase 8-10 (Types & Config): 2 hours
- Testing & Debugging: 3-4 hours

**Total: 20-28 hours of focused work**

This plan provides a systematic approach to converting your Phaser game logic to TypeScript while maintaining functionality and adding strong type safety throughout the codebase.