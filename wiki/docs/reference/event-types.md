---
sidebar_position: 2
title: Event Types Reference
description: Current typed EventBus catalog
tags: [reference, eventbus, typescript]
---

# Event Types Reference

Source of truth: `src/game/EventBus.ts`.

## Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `current-scene-ready` | Phaser to React | Game scene is initialized. |
| `cesium-location-selected` | React to Phaser | Start or refresh board from selected map/node data. |
| `game-score-updated` | Phaser to React | Legacy score/move update payload. |
| `game-over` | Phaser to React | Board run ended. |
| `clue-revealed` | Phaser to React | Species clue is revealed from board play. |
| `new-game-started` | Phaser to React | Mystery species context is ready. |
| `game-reset` | Phaser/React | Reset run/game UI. |
| `no-species-found` | Phaser to React | Selected map point has no playable species. |
| `all-clues-revealed` | Phaser to React | Current species has all clues. |
| `all-species-completed` | Phaser to React | Location species queue is complete. |
| `species-guess-submitted` | React to Phaser | Player submitted a species guess. |
| `show-species-list` | React to React | Switch layout to species list. |
| `game-hud-updated` | Phaser to React | Current score, moves, streak, multiplier. |
| `game-restart` | React to Phaser | Restart current board flow. |
| `expedition-data-ready` | React to React | Map click produced expedition data and briefing inputs. |
| `expedition-start` | React to React | Player started the staged expedition. |
| `node-advance-requested` | Phaser/UI to React | Current node is ready to complete or escape. |
| `node-complete` | React to Phaser/UI | Node completion was validated and persisted. |
| `route-progress-updated` | React to Cesium/UI | Route slot changed. |
| `node-objective-updated` | Phaser to React | Required-gem objective progress changed. |
| `evidence-move-resolved` | Phaser to React | V3 direct-clear totals and full board checkpoint are ready to persist. |
| `evidence-progress-committed` | React to Phaser | V3 checkpoint is durable; board input may resume before move six. |
| `auth-user-ready` | React to React | Authenticated player/session IDs are available. |

## Core Payloads

### `cesium-location-selected`

```ts
{
  lon: number;
  lat: number;
  ecoregionId?: number | null;
  habitats: string[];
  species: Species[];
  rasterHabitats: RasterHabitatResult[];
  difficulty?: number;
  moveBudget?: number;
  obstacles?: NodeObstacle[];
  obstacleFamily?: ObstacleFamily | null;
  counterGem?: ActionGemType | null;
  requiredGems?: GemType[];
  activeAffinities?: AffinityType[];
  objectiveTarget?: number;
  objectiveProgress?: number;
  bestTargetMatchLength?: number;
  nodeIndex?: number;
  nodeType?: string;
  events?: string[];
  boardContext?: NodeBoardContext;
  boardConfig?: BoardSpawnConfig;
  boardCheckpoint?: BoardCheckpointV1;
}
```

### `expedition-data-ready`

```ts
{
  lon: number;
  lat: number;
  ecoregionId?: number | null;
  expedition: ExpeditionData;
  species: Species[];
  rasterHabitats: RasterHabitatResult[];
  habitats: string[];
  featureFingerprints?: FeatureFingerprint[];
}
```

### `node-advance-requested`

```ts
{
  nodeIndex: number;
  reason: 'victory' | 'escaped';
  source: 'game' | 'panel';
}
```

### `node-objective-updated`

```ts
{
  progress: number;
  target: number;
  bestTargetMatchLength: number;
}
```

Keep this page aligned with `EventPayloads`.
