# TypeScript Conversion Quick Checklist

## Pre-Conversion Setup
- [ ] Ensure `npm run dev` works without errors
- [ ] Create git branch: `git checkout -b feature/typescript-conversion`
- [ ] Add typecheck script to package.json:
  ```json
  "typecheck": "tsc --noEmit",
  "typecheck:watch": "tsc --noEmit --watch"
  ```

## Conversion Order Checklist

### Phase 1: Foundation Files
- [x] Convert `constants.js` → `constants.ts` ✅
  - Added `as const` assertions
  - Created `GemType` type
  - Added `HABITAT_GEM_MAP` with proper typing
  - Kept backward compatibility exports
- [x] Convert `MoveAction.js` → `MoveAction.ts` ✅
  - Used public readonly properties
  - Added utility methods (isHorizontal, isVertical, etc.)
  - Created `MoveDirection` type
- [x] Convert `ExplodeAndReplacePhase.js` → `ExplodeAndReplacePhase.ts` ✅
  - Created types for Coordinate, Match, ColumnReplacement
  - Added utility methods

### Phase 2: EventBus Enhancement
- [x] Update `EventBus.ts` with strong typing ✅
  - Defined `EventPayloads` interface
  - Created `TypedEventBus` class
  - Override emit/on/once/off methods
- [x] Updated imports in .tsx files ✅
  - Removed `.js` extensions from EventBus imports

### Phase 3: Core Game Logic
- [x] Convert `BackendPuzzle.js` → `BackendPuzzle.ts` ✅
  - Typed grid as `PuzzleGrid = (Gem | null)[][]`
  - Added method return types
  - Typed habitat mapping logic
  - Added placeholder methods for score/moves/game over

### Phase 4: Scene Files
- [x] Convert `scenes/Boot.js` → `scenes/Boot.ts` ✅
- [x] Convert `scenes/Preloader.js` → `scenes/Preloader.ts` ✅
  - Added types for load events
  - Fixed failed property issue
- [x] Convert `scenes/MainMenu.js` → `scenes/MainMenu.ts` ✅
- [x] Convert `scenes/GameOver.js` → `scenes/GameOver.ts` ✅
- [x] Convert `scenes/Game.js` → `scenes/Game.ts` ✅
  - Typed scene properties and state management
  - Added interfaces for BoardOffset, SpritePosition
  - Fixed type errors with BoardView method calls

### Phase 5: Complex View
- [x] Convert `BoardView.js` → `BoardView.ts` ✅
  - Added comprehensive TypeScript types
  - Typed sprite arrays and animation promises
  - Added interfaces for configurations and positions

### Phase 6: Entry Point
- [x] Convert `main.js` → `main.ts` ✅
  - Added Phaser.Types.Core.GameConfig typing
  - Typed StartGame function parameters and return
  - Updated import in PhaserGame.tsx

### Phase 7: Update React Components
- [ ] Improve types in `CesiumMap.tsx`
  - Replace `any` types with specific Cesium types
- [x] Update `PhaserGame.tsx` ✅
  - Updated import from main.js to main.ts
  - Verified proper ref typing
- [ ] Update `MainAppLayout.tsx`
  - Type phaserRef properly

### Phase 8: Shared Types
- [ ] Create `src/types/game.types.ts`
  - Define shared interfaces
  - Re-export common types

### Phase 9: Final Configuration
- [ ] Set `allowJs: false` in tsconfig.json
- [ ] Enable strict mode options
- [ ] Add type checking to build process

## Testing After Each Conversion
1. Run `npm run typecheck`
2. Fix any TypeScript errors
3. Run `npm run dev`
4. Test affected functionality in browser
5. Check browser console for runtime errors
6. Commit changes

## Common Fixes

### Import Paths
```typescript
// Change from:
import Something from './Something'
// To:
import Something from './Something'  // .ts extension not needed
```

### Phaser Types
```typescript
// Common Phaser type imports
import Phaser from 'phaser';
// Use Phaser.Scene, Phaser.GameObjects.Sprite, etc.
```

### Event Handler Binding
```typescript
// Use arrow functions to preserve 'this'
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  this.handleClick(pointer);
});
```

## Verification Commands
```bash
# Check types
npm run typecheck

# Run development server
npm run dev

# Build for production
npm run build
```

## Success Indicators
- ✅ No red squiggles in VS Code
- ✅ Autocomplete works for all Phaser APIs
- ✅ EventBus shows typed event names
- ✅ Build succeeds without warnings
- ✅ Game runs exactly as before