# Expedition Run Loop

Current runtime doc. For cross-system ownership rules, read [GAME_SYSTEM_ARCHITECTURE.md](./GAME_SYSTEM_ARCHITECTURE.md) first.

Core gameplay loop: map click → expedition briefing → 6-node run → completion summary.

## Run Phases

`RunPhase`: `idle` → `briefing` → `in-run` → `complete`

- **idle**: waiting for map click
- **briefing**: ExpeditionBriefing shown; player reviews nodes before starting
- **in-run**: puzzle active, nodes advance sequentially
- **complete**: all nodes done, summary shown

State tracked in `RunState` (`src/types/expedition.ts`), managed by `MainAppLayout.tsx`.

## Data Flow

1. Map click → `/api/protected-areas/at-point` → GIS scoring + node generation
2. CesiumMap emits `expedition-data-ready` with `ExpeditionData` payload
3. MainAppLayout stores payload, shows briefing, sets `phase: 'briefing'`
4. Player clicks Start → `expedition-start` event → `phase: 'in-run'`
5. MainAppLayout emits `cesium-location-selected` with first node's params
6. Game.ts `initializeBoardFromCesium` receives node config (requiredGems, objectiveTarget, events, etc.)
7. Player matches gems → objective progress → `node-objective-updated`
8. When a node is ready to advance, game/UI emits `node-advance-requested`
9. MainAppLayout validates request, persists node completion, advances run state, emits `node-complete`

## Node Generation

**File:** `src/lib/nodeScoring.ts` — `generateRunNodes()`

6 nodes per expedition:
- **Node 1**: Primary from highest-scoring GIS layer
- **Nodes 2-4**: Modifiers from secondary layers + habitat signals
- **Node 5**: Filler (varied type avoiding duplicate gem pairs) or storm_window
- **Node 6**: Always `analysis` (no gem objective)

### Node Templates

| Node Type | Required Gems | Obstacles | Events |
|-----------|---------------|-----------|--------|
| `riverbank_sweep` | blue, green | flow_shift, mud_tiles | amphibian_signal, river_crossing |
| `dense_canopy` | green, black | overgrowth, low_visibility | trail_markings, rare_track |
| `urban_fringe` | red, orange | junk_blockers, noise_interference | human_disturbance, corridor_crossing |
| `elevation_ridge` | white, blue | steep_terrain | vantage_scan |
| `storm_window` | red, purple | time_pressure, signal_dropout | urgent_tracking_window, migration_shift |
| `custom` | purple, yellow | unknown_terrain | discovery_event |
| `analysis` | (none) | limited_signal | wager_guess |

Each template has a unique gem pair to ensure variety within an expedition. Filler logic cycles through unused gem pairs.

### Obstacle Seeding

- Obstacles are typed in `src/game/nodeObstacles.ts`.
- Some obstacles now seed deterministic per-cell board state during node initialization.
- `boardContext` is generated once from node index + obstacle list and reused by runtime/persistence.
- Current static seeded footprints:
  - `mud_tiles`
  - `overgrowth`
  - `junk_blockers`
  - `steep_terrain`
  - `signal_dropout`
  - `noise_interference`
  - `unknown_terrain`
  - `limited_signal`
- Current dynamic-only placeholders with no per-cell mechanic yet:
  - `flow_shift`
  - `low_visibility`
  - `time_pressure`

The seeded state is visual/system scaffolding only right now; it does not yet change match resolution.

### Gem Objective

Nodes with `requiredGems.length > 0` get `objectiveTarget: 6`. Player matches gems of the required colors. Match-4+ of required gems instantly completes the node.

## Node Objective Tracking (Game.ts)

- `nodeRequiredGems: Set<GemType>` — colors that count toward objective
- `nodeObjectiveProgress: number` — incremented per matched required gem
- `nodeObjectiveTarget: number` — target count (6 for gem nodes, 0 for analysis)
- `nodeObjectiveCompleted: boolean` — prevents double-fire

Objective counting reads gem types from `phaseResult.matchGridState` (snapshot taken after swap, before explode-and-replace). This is independent of species/clue state — nodes with no species still track gem objectives. Progress is emitted via `node-objective-updated`. `ActiveEncounterPanel` is display-only for gem-objective nodes.

## Node Advancement Ownership

- Phaser owns objective tracking.
- React owns expedition advancement and persistence.
- `node-complete` is a completion fact emitted once by `MainAppLayout`, not a request signal.
- Analysis nodes use a panel button that emits `node-advance-requested`.

## Encounters

Every 3rd cumulative match group within a node triggers an encounter from the node's `events[]` array.

- `nodeMatchGroupTotal` accumulates across all moves + cascades
- Events cycle if more encounters fire than events available
- Each encounter applies an effect + rolls a souvenir

### Encounter Effects (`ENCOUNTER_CATALOG`)

| Effect | Behavior |
|--------|----------|
| `bonus_gems` | Queues required-color gems into next cascade |
| `score_boost` | +50 flat score |
| `objective_boost` | +2 objective progress (can trigger auto-complete) |

### Souvenir Drops (`SOUVENIR_CATALOG`)

Each encounter rolls against `dropChance` (0.15–0.6). Drops collected in `RunState.souvenirs`, displayed in SouvenirPouch, persisted to `rewardProfile` jsonb on `eco_run_nodes`.

## Gem Wallet

Clue reveals award a random gem (nature/water/knowledge/craft) weighted by `resourceBias` from the expedition's GIS context. Wallet shown in GemWallet component.

## Route Trail (CesiumMap)

Synthetic positions fanned NE from click center (~300m spacing). Dashed cyan polyline + point markers (gray=future, yellow=current, cyan=completed). Uses `CallbackProperty` for reactive updates.

## API Routes

- `POST /api/runs` — create run session + nodes
- `POST /api/runs/[runId]/nodes/[nodeIndex]/complete` — mark node done, persist score/moves/souvenirs
- `PATCH /api/runs/[runId]` — persist gem wallet on run complete

Initial node persistence now stores generated board context alongside rationale/difficulty.

## Key Files

| File | Role |
|------|------|
| `src/types/expedition.ts` | RunState, RunNode, ExpeditionData, encounter/souvenir catalogs |
| `src/lib/nodeScoring.ts` | Node generation, scoring, templates |
| `src/game/scenes/Game.ts` | Objective tracking, encounter triggers, advancement requests |
| `src/game/nodeObstacles.ts` | Obstacle typing, labels, deterministic board-state seeding |
| `src/MainAppLayout.tsx` | Run phase state machine, request validation, persistence, node advancement |
| `src/components/ActiveEncounterPanel.tsx` | Node info panel, objective progress bar, analysis-node advance button, encounter flash |
| `src/components/RunTrack.tsx` | Node progress track bar |
| `src/components/GemWallet.tsx` | Gem inventory display |
| `src/components/SouvenirPouch.tsx` | Souvenir collection display |
| `src/components/ExpeditionBriefing.tsx` | Pre-run briefing card |
| `src/components/CesiumMap.tsx` | Route trail polyline + node markers |

## DB Tables

- `eco_run_sessions` — run metadata, score totals, gem wallet
- `eco_run_nodes` — per-node objectives, rewards, status

See also: [ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md](./ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md) for GIS layer scoring details.
