# TypeScript Conversion Updates Based on Prior Work

## Already Completed Work

### ✅ React/TypeScript Infrastructure
- React 18.2.0 with matching @types/react@18
- Cesium integration with Resium
- Global type declarations (`global.d.ts`)
- Dynamic imports with SSR disabled

### ✅ Key TypeScript Files
- `_document.tsx` - Cesium CSS integration
- `global.d.ts` - CESIUM_BASE_URL declaration
- `MainAppLayout.tsx` - Main layout component
- `CesiumMap.tsx` - Cesium/Resium integration
- `PhaserGame.tsx` - Phaser wrapper component

### ⚠️ Import Path Considerations
The imports were updated to include `.js` extensions:
```typescript
// Current imports in .tsx files
import StartGame from './game/main.js';
import { EventBus } from './game/EventBus.js';
```

**Important**: When converting to TypeScript, these will change back to:
```typescript
// After TS conversion
import StartGame from './game/main';
import { EventBus } from './game/EventBus';
```

## Updated Conversion Priorities

### 1. EventBus First (Critical Path)
Since EventBus is already imported by both `CesiumMap.tsx` and `PhaserGame.tsx`, it should be converted first:

```typescript
// EventBus.ts (already exists, needs enhancement)
import { EventEmitter } from 'phaser';

export interface EventPayloads {
  'current-scene-ready': Phaser.Scene;
  'cesium-location-selected': {
    lon: number;
    lat: number;
    habitats: number[];
    species: string[];
  };
}

class TypedEventBus extends EventEmitter {
  emit<K extends keyof EventPayloads>(event: K, ...args: [EventPayloads[K]]): boolean {
    return super.emit(event, ...args);
  }
  
  on<K extends keyof EventPayloads>(
    event: K, 
    fn: (data: EventPayloads[K]) => void, 
    context?: any
  ): this {
    return super.on(event, fn, context);
  }
}

export const EventBus = new TypedEventBus();
```

### 2. Update Import Paths in .tsx Files
After converting EventBus.js to EventBus.ts:

```typescript
// In CesiumMap.tsx and PhaserGame.tsx
import { EventBus } from '../game/EventBus'; // Remove .js extension
```

### 3. Typing Improvements for Existing .tsx Files

#### CesiumMap.tsx Refinements
```typescript
// Better typing for viewerRef
import { Viewer } from 'cesium';
const viewerRef = useRef<Viewer | null>(null);

// Type the movement parameter
interface CesiumClickEvent {
  position: Cesium.Cartesian2;
}

const handleMapClick = useCallback((movement: CesiumClickEvent) => {
  // ...
}, []);

// Interface for infoBoxData
interface InfoBoxData {
  habitats: number[];
  species: string[];
}
const [infoBoxData, setInfoBoxData] = useState<InfoBoxData | null>(null);
```

#### MainAppLayout.tsx Refinements
```typescript
// Type the phaserRef
import { IRefPhaserGame } from './PhaserGame';
const phaserRef = useRef<IRefPhaserGame>(null);
```

### 4. Cesium/Resium Specific Considerations

Since Cesium is already integrated:
- CESIUM_BASE_URL is globally defined ✅
- Cesium CSS is loaded ✅
- Symlink for assets is set up ✅
- React 18 compatibility maintained ✅

### 5. Updated File Conversion Order

Given the existing infrastructure:

**Phase 1: Critical Dependencies**
1. `EventBus.js` → `EventBus.ts` (enhance existing)
2. Update imports in all .tsx files

**Phase 2: Foundation**
3. `constants.js` → `constants.ts`
4. `MoveAction.js` → `MoveAction.ts`
5. `ExplodeAndReplacePhase.js` → `ExplodeAndReplacePhase.ts`

**Phase 3: Game Logic**
6. `BackendPuzzle.js` → `BackendPuzzle.ts`

**Phase 4: Scenes**
7. Simple scenes first (Boot, Preloader, MainMenu, GameOver)
8. `Game.js` → `Game.ts` (complex scene)

**Phase 5: Views**
9. `BoardView.js` → `BoardView.ts`

**Phase 6: Entry Point**
10. `main.js` → `main.ts`
11. Update import in PhaserGame.tsx

## Key Differences from Original Plan

1. **EventBus Priority**: Must be converted first due to existing imports
2. **Import Paths**: Need to remove `.js` extensions after conversion
3. **Cesium Types**: Already partially implemented, just need refinement
4. **React Version**: Locked to 18.2.0 for Resium compatibility
5. **Global Types**: CESIUM_BASE_URL already declared

## Testing Approach

After each conversion:
1. Update the import path (remove .js)
2. Run `npm run typecheck`
3. Test with `npm run dev`
4. Verify Cesium-Phaser communication still works

## Environment Variables

Ensure `.env.local` exists with:
```
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_token_here
```

## Next Immediate Steps

1. Convert EventBus.js to EventBus.ts with strong typing
2. Update imports in CesiumMap.tsx and PhaserGame.tsx
3. Test that event communication still works
4. Proceed with constants.js conversion