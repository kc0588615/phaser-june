> Superseded 2026-07 by the Match Battle simplification. See [SIMPLIFICATION_CUT_LIST.md](../SIMPLIFICATION_CUT_LIST.md). The spook/objective loop no longer describes the active runtime.

# Expedition Run Loop

Runtime doc for the legacy expedition node loop. For cross-system ownership rules, read [GAME_SYSTEM_ARCHITECTURE.md](../GAME_SYSTEM_ARCHITECTURE.md) first.

For the current Match Battle combat route, read [MATCH_BATTLE_SYSTEM.md](../MATCH_BATTLE_SYSTEM.md). Match Battle is the active gameplay direction; this document remains useful for GIS node generation, Deduction Camp, spook/objective mechanics, and legacy expedition behavior.

This document describes:

- the standard GIS expedition loop
- the spook/objective pressure model
- the deduction camp handoff

Standard expedition loop: map click → expedition briefing → 6-node run → deduction camp → completion summary.

Match Battle loop: map click → expedition briefing → branching combat route → reward/upgrade/route choices → leader win or stamina-loss summary.

## Design Position

The project is no longer aiming for a literal *You Must Build A Boat* clone.

The current game keeps several YMBAB-inspired structural elements:

- a compact shared match-board footprint (`GRID_COLS = 4`, `GRID_ROWS = 3`)
- action-gem-driven node objectives
- crates/consumables
- encounter events tied to board output

But it intentionally diverges in its emotional core:

- no hard left-edge death state
- no direct clue-reveal pressure during node play
- a calmer banked-score economy with a post-run deduction phase

The intended identity is now:

- **YMBAB-inspired board grammar**
- **expedition node progression**
- **science discovery and species deduction as the meta-loop**

## Current Runtime Split

### Standard expedition runtime

- Nodes are solved by matching required action gems until `objectiveTarget` is filled.
- Pressure comes from the **spook meter** (tracking window that decays each second) plus move limits as a secondary lever.
- Three per-node outcomes: **stabilized** (best rewards), **spooked** (reduced rewards), **escaped** (run ends early → Deduction Camp).
- Loot gems award clue fragments instead of direct clue reveals.
- After the route (or early escape), the player spends banked score in Deduction Camp to buy clues and make a species guess.
- Action gem labels use fieldwork language (Observe, Scan, Camouflage, Traverse, Focus, Field Notes, Backpack, Burst).

### Match Battle runtime

- Route nodes come from `matchBattle.routeNodes`, not the linear 6-node objective route.
- Combat nodes use the shared 4x3 board by default, with Match Battle row/column upgrades able to expand it.
- Stamina reaching 0 immediately ends the Match Battle run as lost.
- Enemy defeat clears the route node and opens reward/route selection.
- Leader clear ends the run as won.
- Build mutations are checkpointed from `RunState.matchBattle`; see [MATCH_BATTLE_SYSTEM.md](./MATCH_BATTLE_SYSTEM.md#persistence).

## Run Phases

`RunPhase`: `idle` → `briefing` → `in-run` → `deduction` → `complete`

- **idle**: waiting for map click
- **briefing**: ExpeditionBriefing shown as a dismissible overlay on the Cesium map. Player can close it (✕ button) to return to the map and click a different location. Map clicks are not blocked during briefing — clicking a new location replaces the current briefing with fresh expedition data.
- **in-run**: puzzle active, nodes advance sequentially. Map clicks blocked.
- **deduction**: Deduction Camp — player spends banked score to buy clues and guess the species (see [DEDUCTION_CAMP_ECONOMY.md](./DEDUCTION_CAMP_ECONOMY.md)). Map clicks blocked. Clue-reveal toasts are suppressed; purchased clues appear directly in the DenseClueGrid.
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
| `riverbank_sweep` | shield, power | flow_shift, mud_tiles | amphibian_signal, river_crossing |
| `dense_canopy` | sword, crate | overgrowth, low_visibility | trail_markings, rare_track |
| `urban_fringe` | key, thought | junk_blockers, noise_interference | human_disturbance, corridor_crossing |
| `elevation_ridge` | staff, shield | steep_terrain | vantage_scan |
| `storm_window` | power, multiplier | time_pressure, signal_dropout | urgent_tracking_window, migration_shift |
| `custom` | crate, thought | unknown_terrain | discovery_event |
| `analysis` | (none) | limited_signal | wager_guess |

Each template has a unique gem pair to ensure variety within an expedition. Filler logic cycles through unused gem pairs.

### Obstacle Seeding

Standard expedition and Match Battle node setup both use the board dimensions from `src/game/constants.ts` unless Match Battle has purchased board-size upgrades. The current default is 4 columns x 3 rows.

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

Nodes with `requiredGems.length > 0` get `objectiveTarget: 6`. Player matches the required action gems for the node objective. Loot-colored clue gems do not drive node completion; they feed clue fragments for the deduction phase. Match-4+ of required objective gems instantly completes the node.

## Node Objective Tracking (Game.ts)

- `nodeRequiredGems: Set<GemType>` — action gems that count toward objective
- `nodeObjectiveProgress: number` — incremented per matched required gem
- `nodeObjectiveTarget: number` — target count (6 for gem nodes, 0 for analysis)
- `nodeObjectiveCompleted: boolean` — prevents double-fire

Objective counting reads gem types from `phaseResult.matchGridState` (snapshot taken after swap, before explode-and-replace). This is independent of species/clue state — nodes with no species still track gem objectives. Progress is emitted via `node-objective-updated`. `ActiveEncounterPanel` is display-only for gem-objective nodes.

## Node Advancement Ownership

- Phaser owns objective tracking.
- React owns expedition advancement and persistence.
- `node-complete` is a completion fact emitted once by `MainAppLayout`, not a request signal.
- Analysis nodes use a panel button that emits `node-advance-requested`.

## Spook Meter (Chase Pressure)

The node bonus decay timer has been re-themed and mechanically upgraded into an **animal tracking / spook meter** with three outcome tiers per node.

### Tier thresholds

| Tier | % Range | Base reward | Bonus multiplier | Run effect |
|------|---------|-------------|------------------|------------|
| **Stabilized** | > 60% | 1.0x | 1.0x | Continue to next node |
| **Spooked** | 20–60% | 0.75x | 0.5x | Continue with reduced rewards |
| **Escaped** | ≤ 20% | 0.5x | 0x | Skip remaining nodes → Deduction Camp |

- `SpookTier` type and `getSpookTier(pct)` helper in `src/types/expedition.ts`
- Meter floor lowered from 40% to 20% to create the escaped zone
- `node-bonus-tick` event now includes `tier: SpookTier`
- `node-advance-requested` reason union includes `'escaped'`

### Escape behavior

When the spook meter drops to ≤ 20%, or moves are exhausted without completing the objective:

1. Game.ts stops the decay timer and emits `node-rewards-summary` with escaped tier multipliers
2. Game.ts emits `node-advance-requested` with `reason: 'escaped'`
3. MainAppLayout skips remaining nodes and transitions directly to `phase: 'deduction'`
4. Player enters Deduction Camp with whatever banked score + fragments they accumulated

Spook state does **not** carry between nodes — each node resets fresh. The structural consequence of escape is fewer completed nodes (fewer fragments, less banked score), making Deduction Camp harder but still playable.

### Gem effect integration

- `shield` (Camouflage) → `decay_slow` effect halves meter decay for 5s
- `power` (Focus) → `score_multiply` effect boosts node payout
- Moves exhausted during expeditions now triggers escape instead of the GameOver scene

### Why not a pure YMBAB treadmill

A literal left-edge fail state would conflict with the explorer-science tone. The compromise: live urgency without harsh punishment, and partial-information runs still produce meaningful deduction gameplay.

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

## Run Economy

- Loot-colored clue gems award clue fragments by category during the run.
- Action gems drive node scoring, encounters, and end-of-run deduction discounts.
- `GemWallet` remains displayed for legacy resources and crate rewards, but the expedition clue loop is no longer based on direct clue reveals during board play.

### Gem semantic remap (implemented)

Action gem labels have been re-themed from combat abstractions to fieldwork verbs. Code-level `GemType` enum values are unchanged; only display labels in `src/expedition/domain.ts` changed.

| Code value | Label | Effect |
|------------|-------|--------|
| `sword` | Observe | direct_score |
| `staff` | Scan | trivia_boost |
| `shield` | Camouflage | decay_slow (spook meter buffer) |
| `key` | Traverse | open_cache |
| `power` | Focus | score_multiply |
| `thought` | Field Notes | clue_discount |
| `crate` | Backpack | grant_consumable |
| `multiplier` | Burst | combo_enhance |

Wallet currencies: Supplies, Focus, Insight, Samples.
Consumables: Signal Flare, Bait, Trail Map, Field Kit.

## Route Trail (CesiumMap)

Synthetic positions fanned NE from click center (~300m spacing). Dashed cyan polyline + point markers (gray=future, yellow=current, cyan=completed). Uses `CallbackProperty` for reactive updates.

## API Routes

- `POST /api/runs` — create run session + nodes
- `POST /api/runs/[runId]/nodes/[nodeIndex]/complete` — mark node done, persist score/moves/souvenirs
- `PATCH /api/runs/[runId]` — persist run metadata on completion (resource wallet, final score, deduction summary)

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

## Planned Next Steps

1. ~~Spook meter with stabilized/spooked/escaped tiers~~ — done
2. Reduce the design importance of move caps so nodes feel less like discrete turn budgets.
3. ~~Visible tracking/escape state in the HUD~~ — done
4. ~~Re-theme gems and encounters around fieldwork instead of combat~~ — done
5. Keep Deduction Camp as the primary end-of-run sink and identity anchor.
6. Tune spook meter decay rates and tier thresholds via playtesting.
7. Support partial-run summaries in Deduction Camp for escaped expeditions.

## DB Tables

- `eco_run_sessions` — run metadata, score totals, gem wallet
- `eco_run_nodes` — per-node objectives, rewards, status

See also: [ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md](./ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md) for GIS layer scoring details.
