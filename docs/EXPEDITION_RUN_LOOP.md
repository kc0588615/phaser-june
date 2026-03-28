# Expedition Run Loop

Current runtime doc. For cross-system ownership rules, read [GAME_SYSTEM_ARCHITECTURE.md](./GAME_SYSTEM_ARCHITECTURE.md) first.

This document now describes both:

- the **current shipped/runtime loop**
- the **planned pressure-loop evolution** toward a softer YMBAB-style chase model

Core gameplay loop: map click → expedition briefing → 6-node run → deduction camp → completion summary.

## Design Position

The project is no longer aiming for a literal *You Must Build A Boat* clone.

The current game keeps several YMBAB-inspired structural elements:

- a 6x8 wraparound action board
- action-gem-driven node objectives
- crates/consumables
- encounter events tied to board output

But it intentionally diverges in its emotional core:

- no runner-lane combat
- no hard left-edge death state
- no direct clue-reveal pressure during node play
- a calmer banked-score economy with a post-run deduction phase

The intended identity is now:

- **YMBAB-inspired board grammar**
- **expedition node progression**
- **science discovery and species deduction as the meta-loop**

## Current Runtime vs Planned Direction

### Current runtime

- Nodes are solved by matching required action gems until `objectiveTarget` is filled.
- Pressure comes from move limits plus a decaying node bonus.
- Loot gems award clue fragments instead of direct clue reveals.
- After the route, the player spends banked score in Deduction Camp to buy clues and make a species guess.

### Planned direction

The next major design step is to replace most of the remaining move-cap pressure with a **hybrid chase pressure loop**.

Instead of recreating YMBAB's monster pushback literally, the game will reinterpret that tension as an **animal tracking / spook meter**:

- the mystery animal gradually pulls away during the run
- nodes represent behavior or traversal moments where the player must gather the right observations quickly
- failing a node does not kill the player; it increases escape pressure or ends the expedition early into Deduction Camp
- Deduction Camp remains the run's main sink and final decision point

This preserves the expedition/deduction identity while reintroducing more continuous momentum.

## Run Phases

`RunPhase`: `idle` → `briefing` → `in-run` → `deduction` → `complete`

- **idle**: waiting for map click
- **briefing**: ExpeditionBriefing shown; player reviews nodes before starting
- **in-run**: puzzle active, nodes advance sequentially
- **deduction**: Deduction Camp — player spends banked score to buy clues and guess the species (see [DEDUCTION_CAMP_ECONOMY.md](./DEDUCTION_CAMP_ECONOMY.md))
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

## Planned Pressure-Loop Evolution

### Goal

Recover some of YMBAB's momentum and flow-state without importing its most frustrating fail conditions.

### Proposed hybrid model

Keep:

- 6-node expedition structure
- per-node action-gem objectives
- clue fragments
- banked score
- Deduction Camp

Change:

- move limits become a secondary tuning lever instead of the primary source of pressure
- the node bonus bar evolves into a more thematic **tracking / spook meter**
- failing to stabilize the situation causes the animal to get farther away rather than causing direct defeat

### Animal-spook reinterpretation

The current node bonus system is the easiest bridge into this model.

Short-term plan:

- rename the node bonus readout in design terms to a tracking window / observation window
- keep the same underlying timer-driven implementation while testing the fantasy
- make `shield`-style effects read as stealth or camouflage buffering the escape risk
- make `power`/`staff`-style effects read as observation burst or catch-up tools

Long-term plan:

- replace pure decay with a visible pursuit state
- allow nodes to resolve as:
  - **stabilized**: player keeps pace, gains best rewards
  - **spooked**: animal escapes further, player takes a softer reward hit
  - **escaped**: expedition ends early, player still proceeds to Deduction Camp with gathered evidence

### Why not a pure YMBAB treadmill

A literal left-edge fail state would conflict with the explorer-science tone and with the low-stress goals of the project.

The intended compromise is:

- preserve live urgency
- avoid harsh punishment
- let partial-information runs still produce meaningful deduction gameplay

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

### Planned semantic remap

As the chase model becomes more explicit, action gems should read less like combat abstractions and more like fieldwork verbs:

- `sword` / `staff` → observation tools or data capture actions
- `shield` → stealth / camouflage buffer
- `key` → traversal tools for environmental blockers
- `power` / `thought` → field notes, samples, and deduction leverage
- `crate` → backpack supplies / consumables

This is a presentation and encounter-design shift, not necessarily a required code-level rename on the first pass.

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

1. Treat the existing node bonus meter as the first prototype of chase pressure rather than as a permanent scoring-only system.
2. Reduce the design importance of move caps so nodes feel less like discrete turn budgets.
3. Introduce a visible tracking/escape state in the HUD before changing deeper board logic.
4. Re-theme node encounters around animal behavior and field observation instead of combat-adjacent framing.
5. Keep Deduction Camp as the primary end-of-run sink and identity anchor.

## DB Tables

- `eco_run_sessions` — run metadata, score totals, gem wallet
- `eco_run_nodes` — per-node objectives, rewards, status

See also: [ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md](./ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md) for GIS layer scoring details.
