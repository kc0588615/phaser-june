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
| `game-reset` | Phaser/React | Reset run/game UI. |
| `game-hud-updated` | Phaser to React | Current score, moves, streak, multiplier. |
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
  difficulty?: number;
  moveBudget?: number;
  obstacles?: NodeObstacle[];
  objectiveProgress?: number;
  nodeIndex?: number;
  boardSeed?: number;
  boardContext?: NodeBoardContext;
  boardConfig?: BoardSpawnConfig;
  boardCheckpoint?: BoardCheckpointV1;
  terrain?: TerrainSnapshot;
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
