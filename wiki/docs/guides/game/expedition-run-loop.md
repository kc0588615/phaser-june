---
sidebar_position: 4
title: Expedition Run Loop
description: Standard expedition nodes, spook pressure, encounters, and deduction handoff
tags: [guide, game, expedition, encounters, souvenirs]
---

# Expedition Run Loop

This page documents the standard GIS expedition loop. It remains useful for node generation, spook/objective mechanics, clue fragments, and Deduction Camp.

For the active combat route, see [Match Battle](/docs/guides/game/match-battle).

Standard loop: map click -> briefing -> 6-node route -> deduction -> completion summary.

Match Battle loop: map click -> briefing -> branching combat route -> rewards/upgrades/route choices -> leader win or Stamina-loss summary.

## Run Phases

```
idle -> briefing -> in-run -> deduction -> complete
```

| Phase | UI State | Trigger |
|-------|----------|---------|
| `idle` | Map interactive, waiting for click | App start / run reset |
| `briefing` | ExpeditionBriefing shown, nodes previewed | `expedition-data-ready` event |
| `in-run` | Puzzle active, nodes advance sequentially | `expedition-start` event |
| `deduction` | Deduction Camp clue buying + species guess | Standard route ends or escape |
| `complete` | Summary with score + outcome | Deduction finish or Match Battle end |

Match Battle additionally uses `reward` and `route` phases between combats.

**State:** `RunState` in `src/types/expedition.ts`, managed by `src/contexts/ExpeditionContext.tsx`.

## Data Flow

```
Map click
  -> /api/protected-areas/at-point (GIS scoring + node gen)
  -> CesiumMap emits expedition-data-ready
  -> ExpeditionContext stores payload, shows briefing
  -> Player starts -> cesium-location-selected emitted per node
  -> Game.ts runs puzzle with node config + seeded obstacle state
  -> Objective met or escape -> node-advance-requested
  -> ExpeditionContext validates -> node-complete -> next node, deduction, or complete
```

## Node Generation

**Source:** `src/lib/nodeScoring.ts` — `generateRunNodes()`

Six nodes per expedition:

1. **Primary** - highest-scoring GIS layer -> node type
2. **Modifiers (2-3)** - secondary layers above threshold
3. **Fillers** - varied types ensuring unique gem pairs per run
4. **Analysis** - always slot 6, no gem objective

### Node Templates

| Node Type | Required Gems | Events |
|-----------|------|--------|
| `riverbank_sweep` | shield + power | amphibian_signal, river_crossing |
| `dense_canopy` | sword + crate | trail_markings, rare_track |
| `urban_fringe` | key + thought | human_disturbance, corridor_crossing |
| `elevation_ridge` | staff + shield | vantage_scan |
| `storm_window` | power + multiplier | urgent_tracking_window, migration_shift |
| `custom` | crate + thought | discovery_event |
| `analysis` | (none) | wager_guess |

Each template has a **unique gem pair**. Filler logic avoids repeating pairs already in the run.

### Gem Objective

- Gem-objective nodes get `objectiveTarget: 6`
- Player matches required action gems to fill progress
- Match-4+ of required gems instantly completes the node
- Progress shown in ActiveEncounterPanel
- Objective counting reads from `phaseResult.matchGridState` (snapshot before explode-and-replace)
- Objective progress is independent of species/clue state — nodes with no species still track gem objectives

### Obstacle Seeding

Obstacles are typed in `src/game/nodeObstacles.ts`. Some obstacles seed deterministic per-cell board state via `boardContext` (generated once, shared by runtime and persistence). Static seeded obstacles: `mud_tiles`, `overgrowth`, `junk_blockers`, `steep_terrain`, `signal_dropout`, `noise_interference`, `unknown_terrain`, `limited_signal`. Dynamic-only placeholders (no cell mechanic yet): `flow_shift`, `low_visibility`, `time_pressure`.

### Node Advancement

- Phaser owns objective tracking; React owns expedition advancement
- Game/UI emits `node-advance-requested` when ready to advance
- `MainAppLayout` validates the request, persists node completion, emits `node-complete`
- `node-complete` is a fact emitted once by React, not a request signal

## Spook Meter

The standard loop uses a tracking pressure meter with three tiers.

| Tier | Range | Effect |
|------|-------|--------|
| `stabilized` | `> 60%` | Best rewards, continue |
| `spooked` | `20-60%` | Reduced rewards, continue |
| `escaped` | `<= 20%` | Skip remaining nodes, enter Deduction Camp |

When the meter escapes or moves run out, `Game.ts` emits `node-advance-requested` with `reason: 'escaped'`. React skips remaining nodes and moves to `phase: 'deduction'`.

## Encounters

Mid-node events fire after every **3rd cumulative match group**.

**Source:** `Game.ts` — `applyEncounter()`

### Trigger Logic

```
nodeMatchGroupTotal += moveSummary.matchGroups  (per move)
expected = floor(nodeMatchGroupTotal / 3)
if expected > nodeEncounterIndex → fire encounter
```

Events cycle through the node's `events[]` array.

### Effect Types

| Effect | Action |
|--------|--------|
| `bonus_gems` | Queue required-color gems into next cascade |
| `score_boost` | +50 flat score |
| `objective_boost` | +2 objective progress (can trigger auto-complete) |

**Catalog:** `ENCOUNTER_CATALOG` in `src/types/expedition.ts` (11 event types)

### Encounter Flash

ActiveEncounterPanel shows a brief overlay with the effect label + souvenir emoji (if dropped). Auto-dismisses after 2s.

## Souvenir Drops

Each encounter rolls against a per-item `dropChance` (0.15–0.6).

**Catalog:** `SOUVENIR_CATALOG` in `src/types/expedition.ts` (11 items)

| Item | Drop Chance |
|------|-------------|
| Frog Charm | 60% |
| River Stone | 50% |
| Trail Marker | 50% |
| Pawprint Fossil | 35% |
| Urban Artifact | 40% |
| Flight Feather | 30% |
| Spyglass Lens | 30% |
| Storm Crystal | 15% |
| Compass Shard | 20% |
| Mystery Seed | 40% |
| Lucky Coin | 20% |

Collected souvenirs shown in **SouvenirPouch** (bottom-left, next to GemWallet). Persisted to `eco_run_nodes.rewardProfile` jsonb on node complete.

## Run Economy

Action gems drive standard node objectives. Loot gems award clue fragments for Deduction Camp instead of directly revealing clues during board play.

Wallet currencies are Supplies, Focus, Insight, and Samples. `GemWallet` remains the shared display for run resources.

## Route Trail

CesiumMap draws a synthetic trail on the globe:
- Positions fanned NE from click center (~300m spacing)
- Dashed cyan polyline (reactive via `CallbackProperty`)
- Point markers: gray = future, yellow = current, cyan = completed
- Cleanup on `game-reset`

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/runs` | POST | Create run session + nodes |
| `/api/runs/[runId]/nodes/[nodeIndex]/complete` | POST | Mark node complete, persist score/moves/souvenirs |
| `/api/runs/[runId]` | PATCH | Persist checkpoints, deduction state, final score, Match Battle metadata |

## Key Files

| File | Role |
|------|------|
| `src/types/expedition.ts` | Types, catalogs, RunState |
| `src/lib/nodeScoring.ts` | Node generation + scoring |
| `src/game/scenes/Game.ts` | Objective tracking, encounter triggers, advancement requests |
| `src/game/nodeObstacles.ts` | Obstacle typing, labels, deterministic board-state seeding |
| `src/contexts/ExpeditionContext.tsx` | Phase state machine, request validation, persistence, node advancement |
| `src/MainAppLayout.tsx` | Mounted layout for Cesium, Phaser, and overlays |
| `src/components/ActiveEncounterPanel.tsx` | Node panel, progress bar, analysis-node advance button, encounter flash |
| `src/components/RunTrack.tsx` | Progress track bar |
| `src/components/GemWallet.tsx` | Gem inventory |
| `src/components/SouvenirPouch.tsx` | Souvenir display |
| `src/components/ExpeditionBriefing.tsx` | Briefing card |
| `src/components/CesiumMap.tsx` | Route trail |

## EventBus Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `expedition-data-ready` | React → React | Expedition generated, show briefing |
| `expedition-start` | React → React | Player starts run |
| `cesium-location-selected` | React → Phaser | Init puzzle with node params |
| `node-objective-updated` | Phaser → React | Progress bar update |
| `node-advance-requested` | Phaser/UI → React | Node ready to advance (request) |
| `node-complete` | React → Phaser/Cesium/UI | Node done (fact), advance |
| `encounter-triggered` | Phaser → React | Show encounter flash |
| `souvenir-dropped` | Phaser → React | Collect souvenir |

## Related Documentation

- [Match Battle](/docs/guides/game/match-battle) - active combat route
- [Event Types Reference](/docs/reference/event-types) - full event catalog
- [Database Schema](/docs/reference/database-schema) - `eco_run_sessions` / `eco_run_nodes`
- [Game Constants](/docs/reference/game-constants) - board sizing and gem constants
