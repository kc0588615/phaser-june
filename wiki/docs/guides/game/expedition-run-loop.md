---
sidebar_position: 4
title: Expedition Run Loop
description: How expeditions, nodes, encounters, and souvenirs work
tags: [guide, game, expedition, encounters, souvenirs]
---

# Expedition Run Loop

The expedition run loop is the core gameplay progression. A map click generates a 6-node expedition with GIS-driven node types, gem objectives, mid-node encounters, and souvenir drops.

## Run Phases

```
idle → briefing → in-run → complete
```

| Phase | UI State | Trigger |
|-------|----------|---------|
| `idle` | Map interactive, waiting for click | App start / run reset |
| `briefing` | ExpeditionBriefing shown, nodes previewed | `expedition-data-ready` event |
| `in-run` | Puzzle active, nodes advance sequentially | `expedition-start` event |
| `complete` | Summary with score + gems + souvenirs | Last node completed |

**State:** `RunState` in `src/types/expedition.ts`, managed by `MainAppLayout.tsx`.

## Data Flow

```
Map click
  → /api/protected-areas/at-point (GIS scoring + node gen)
  → CesiumMap emits expedition-data-ready
  → MainAppLayout stores payload, shows briefing
  → Player starts → cesium-location-selected emitted per node
  → Game.ts runs puzzle with node config
  → Objective met → node-complete → next node or run complete
```

## Node Generation

**Source:** `src/lib/nodeScoring.ts` — `generateRunNodes()`

Six nodes per expedition:

1. **Primary** — highest-scoring GIS layer → node type
2. **Modifiers (2-3)** — secondary layers above threshold
3. **Fillers** — varied types ensuring unique gem pairs per run
4. **Analysis** — always slot 6, no gem objective

### Node Templates

| Node Type | Gems | Events |
|-----------|------|--------|
| `riverbank_sweep` | blue + green | amphibian_signal, river_crossing |
| `dense_canopy` | green + black | trail_markings, rare_track |
| `urban_fringe` | red + orange | human_disturbance, corridor_crossing |
| `elevation_ridge` | white + blue | vantage_scan |
| `storm_window` | red + purple | urgent_tracking_window, migration_shift |
| `custom` | purple + yellow | discovery_event |
| `analysis` | (none) | wager_guess |

Each template has a **unique gem pair**. Filler logic avoids repeating pairs already in the run.

### Gem Objective

- Gem-objective nodes get `objectiveTarget: 6`
- Player matches required-color gems to fill progress
- Match-4+ of required gems → instant node complete
- Progress shown in ActiveEncounterPanel

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

| Item | Emoji | Drop Chance |
|------|-------|-------------|
| Frog Charm | 🐸 | 60% |
| River Stone | 🪨 | 50% |
| Trail Marker | 🪵 | 50% |
| Pawprint Fossil | 🐾 | 35% |
| Urban Artifact | 🏗 | 40% |
| Flight Feather | 🪶 | 30% |
| Spyglass Lens | 🔭 | 30% |
| Storm Crystal | ⚡ | 15% |
| Compass Shard | 🧭 | 20% |
| Mystery Seed | 🌱 | 40% |
| Lucky Coin | 🪙 | 20% |

Collected souvenirs shown in **SouvenirPouch** (bottom-left, next to GemWallet). Persisted to `eco_run_nodes.rewardProfile` jsonb on node complete.

## Gem Wallet

Clue reveals award a random gem type (`nature_gem`, `water_gem`, `knowledge_gem`, `craft_gem`) weighted by `resourceBias` from the expedition's GIS context.

**Component:** `src/components/GemWallet.tsx`

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
| `/api/runs/[runId]` | PATCH | Persist gem wallet on run complete |

## Key Files

| File | Role |
|------|------|
| `src/types/expedition.ts` | Types, catalogs, RunState |
| `src/lib/nodeScoring.ts` | Node generation + scoring |
| `src/game/scenes/Game.ts` | Objective tracking + encounter triggers |
| `src/MainAppLayout.tsx` | Phase state machine, event wiring |
| `src/components/ActiveEncounterPanel.tsx` | Node panel + encounter flash |
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
| `node-complete` | Phaser → React | Node done, advance |
| `encounter-triggered` | Phaser → React | Show encounter flash |
| `souvenir-dropped` | Phaser → React | Collect souvenir |

## Related Documentation

- [Action Run Schema & GIS Sources](/docs/guides/data/database-guide) — GIS layer scoring
- [Event Types Reference](/docs/reference/event-types) — Full event catalog
- [Database Schema](/docs/reference/database-schema) — eco_run_sessions/nodes tables
- [Game Constants](/docs/reference/game-constants) — Scoring multipliers
