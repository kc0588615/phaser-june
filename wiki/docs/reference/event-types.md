---
sidebar_position: 2
title: Event Types Reference
description: Complete EventBus event catalog with payloads and usage
tags: [reference, eventbus, typescript]
---

# Event Types Reference

Complete catalog of all EventBus events, their payloads, emitters, and listeners.

## Event Summary Table

| Event | Direction | Emitter | Listener(s) |
|-------|-----------|---------|-------------|
| `current-scene-ready` | Phaser → React | Game.ts | PhaserGame.tsx |
| `cesium-location-selected` | React → Phaser | CesiumMap.tsx | Game.ts |
| `layout-changed` | React → Phaser | MainAppLayout.tsx | Game.ts |
| `new-game-started` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `clue-revealed` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `all-clues-revealed` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `species-guess-submitted` | React → Phaser | SpeciesGuessSelector.tsx | Game.ts |
| `all-species-completed` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `game-reset` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `no-species-found` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `game-hud-updated` | Phaser → React | Game.ts | SpeciesPanel.tsx |
| `game-restart` | React → Phaser | UI Component | Game.ts |
| `show-species-list` | React → React | SpeciesPanel.tsx | MainAppLayout.tsx |

## Event Payloads

### current-scene-ready

```typescript
type Payload = Phaser.Scene;
```

Emitted when the Game scene is fully initialized and ready for interaction.

**Emitter:** `Game.ts` in `create()`
```typescript
EventBus.emit('current-scene-ready', this);
```

**Listener:** `PhaserGame.tsx`
```typescript
EventBus.on('current-scene-ready', (scene) => {
  phaserRef.current.scene = scene;
});
```

---

### cesium-location-selected

```typescript
interface Payload {
  lon: number;
  lat: number;
  habitats: string[];
  species: Species[];
  rasterHabitats: RasterHabitatResult[];
}
```

Emitted when player clicks a location on the Cesium globe.

**Emitter:** `CesiumMap.tsx`
```typescript
EventBus.emit('cesium-location-selected', {
  lon: longitude,
  lat: latitude,
  habitats: habitatList,
  species: speciesResult.species,
  rasterHabitats: rasterHabitats
});
```

**Listener:** `Game.ts`
```typescript
EventBus.on('cesium-location-selected', this.initializeBoardFromCesium, this);
```

---

### layout-changed

```typescript
interface Payload {
  mapMinimized: boolean;
}
```

Emitted when the map section is minimized or expanded.

**Emitter:** `MainAppLayout.tsx`
```typescript
useEffect(() => {
  EventBus.emit('layout-changed', { mapMinimized: cesiumMinimized });
}, [cesiumMinimized]);
```

**Listener:** `Game.ts`
```typescript
EventBus.on('layout-changed', this.handleLayoutChange, this);
```

---

### new-game-started

```typescript
interface Payload {
  speciesName: string;
  speciesId: number;
  totalSpecies: number;
  currentIndex: number;
  hiddenSpeciesName?: string;
}
```

Emitted when a new species mystery begins.

**Emitter:** `Game.ts`
```typescript
EventBus.emit('new-game-started', {
  speciesName: 'Mystery Species',
  speciesId: species.id,
  totalSpecies: this.speciesQueue.length,
  currentIndex: this.currentSpeciesIndex,
  hiddenSpeciesName: species.common_name
});
```

---

### clue-revealed

```typescript
interface Payload {
  category: GemCategory;
  heading: string;
  clue: string;
  speciesId: number;
  name: string;
  icon: string;
  color: string;
}
```

Emitted when player matches gems and reveals a clue.

**Emitter:** `Game.ts`
```typescript
EventBus.emit('clue-revealed', {
  category: clueCategory,
  heading: config.displayName,
  clue: clueText,
  speciesId: this.selectedSpecies.id,
  name: config.displayName,
  icon: config.icon,
  color: this.categoryToColor(clueCategory)
});
```

---

### all-clues-revealed

```typescript
interface Payload {
  speciesId: number;
}
```

Emitted when all 8 clue categories have been revealed for current species.

---

### species-guess-submitted

```typescript
interface Payload {
  guessedName: string;
  speciesId: number;
  isCorrect: boolean;
  actualName: string;
}
```

Emitted when player submits a species guess.

**Emitter:** `SpeciesGuessSelector.tsx`
```typescript
EventBus.emit('species-guess-submitted', {
  guessedName: selectedSpecies,
  speciesId: speciesId,
  isCorrect: correct,
  actualName: hiddenSpeciesName
});
```

---

### all-species-completed

```typescript
interface Payload {
  totalSpecies: number;
}
```

Emitted when player has identified all species at a location.

---

### game-reset

```typescript
type Payload = undefined;
```

Emitted when game state should be completely reset (new location selected).

---

### no-species-found

```typescript
type Payload = {};
```

Emitted when the selected location has no species data.

---

### game-hud-updated

```typescript
interface Payload {
  score: number;
  movesRemaining: number;
  streak: number;
}
```

Emitted when score, moves, or streak changes.

---

### game-restart

```typescript
type Payload = undefined;
```

Emitted when player requests to restart the current game.

---

### show-species-list

```typescript
interface Payload {
  scrollToSpeciesId?: number;
}
```

Emitted to toggle the species catalog view.

## TypeScript Interface

**Location:** `src/game/EventBus.ts`

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
  'new-game-started': {
    speciesName: string;
    speciesId: number;
    totalSpecies: number;
    currentIndex: number;
    hiddenSpeciesName?: string;
  };
  'clue-revealed': CluePayload;
  'all-clues-revealed': {
    speciesId: number;
  };
  'species-guess-submitted': {
    guessedName: string;
    speciesId: number;
    isCorrect: boolean;
    actualName: string;
  };
  'all-species-completed': {
    totalSpecies: number;
  };
  'game-reset': undefined;
  'no-species-found': {};
  'game-hud-updated': {
    score: number;
    movesRemaining: number;
    streak: number;
  };
  'game-restart': undefined;
  'show-species-list': {
    scrollToSpeciesId?: number;
  };
}
```

## Usage Patterns

### Emitting Events

```typescript
// Simple event
EventBus.emit('game-reset', undefined);

// Event with payload
EventBus.emit('clue-revealed', {
  category: GemCategory.HABITAT,
  heading: 'Habitat',
  clue: 'Found in tropical rainforests',
  speciesId: 42,
  name: 'Habitat',
  icon: '🌳',
  color: 'green'
});
```

### Listening in React

```typescript
useEffect(() => {
  const handleClue = (data: EventPayloads['clue-revealed']) => {
    console.log(data.clue);
  };

  EventBus.on('clue-revealed', handleClue);
  return () => EventBus.off('clue-revealed', handleClue);
}, []);
```

### Listening in Phaser

```typescript
create() {
  EventBus.on('cesium-location-selected', this.handleLocation, this);
}

shutdown() {
  EventBus.off('cesium-location-selected', this.handleLocation, this);
}
```

## Related Documentation

- [EventBus Architecture](/docs/architecture/eventbus-display)
- [React-Phaser Bridge Tutorial](/docs/tutorials/react-phaser-bridge)
