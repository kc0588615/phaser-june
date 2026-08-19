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
| `map-location-selected` | React to Phaser | Start or refresh board from selected map/node data. |
| `clue-revealed` | Phaser to React | Species clue is revealed from board play. |
| `new-game-started` | Phaser to React | Mystery species context is ready. |
| `game-reset` | Phaser/React | Reset run/game UI. |
| `no-species-found` | Phaser to React | Selected map point has no playable species. |
| `all-clues-revealed` | Phaser to React | Current species has all clues. |
| `all-species-completed` | Phaser to React | Location species queue is complete. |
| `show-species-list` | React to React | Switch layout to species list. |
| `game-hud-updated` | Phaser to React | Current score, moves, streak, multiplier. |
| `game-restart` | React to Phaser | Restart current board flow. |
| `expedition-data-ready` | React to React | Map click produced expedition data and briefing inputs. |
| `expedition-start` | React to React | Player started the staged expedition. |
| `node-complete` | React to Phaser/UI | Evidence choice completed; advance to the next v3 board. |
| `route-progress-updated` | React to MapLibre/UI | Route slot changed. |
| `node-objective-updated` | Phaser to React | Six-move segment progress changed. |
| `evidence-move-resolved` | Phaser to React | v3 direct-clear totals and full board checkpoint are ready to persist. |
| `evidence-progress-committed` | React to Phaser | v3 checkpoint is durable; board input may resume before move six. |
| `auth-user-ready` | React to React | Authenticated player/session IDs are available. |

## Core Payloads

### `map-location-selected`

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
  activeAffinities?: AffinityType[];
  objectiveTarget?: number;
  objectiveProgress?: number;
  nodeIndex?: number;
  nodeType?: string;
  events?: string[];
  boardSeed?: number;
  boardContext?: NodeBoardContext;
  boardConfig?: BoardSpawnConfig;
  candidateIds?: number[];
  candidateSpecies?: Species[];
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

### `node-objective-updated`

```ts
{
  progress: number;
  target: number;
}
```

Keep this page aligned with `EventPayloads`.
