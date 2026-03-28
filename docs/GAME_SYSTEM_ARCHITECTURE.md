# Game System Architecture

Current source of truth for the React + Phaser gameplay stack.

Use this doc before changing run flow, EventBus contracts, board logic, clue behavior, or the run economy.

## Runtime ownership

- React owns app layout, expedition phase state, run persistence, wallet/inventory state, deduction camp, and node advancement.
- Phaser owns board state, input, matching, scoring, gem effect emission, spook meter, objective progress, and encounter triggers.
- Cesium listens to completed-node events to update trail visuals.
- Species/clue UI listens to game events but does not own puzzle state.

## Layout model

- `src/MainAppLayout.tsx` keeps Phaser, Cesium, and clue UI mounted.
- Top area is the Phaser wrapper.
- Bottom area switches between Cesium, expedition briefing, Deduction Camp, completion summary, and clue UI.
- Components should be hidden with CSS instead of unmounted when they need to preserve EventBus listeners or state.

## EventBus ownership rules

- Emit facts, not side effects.
- Phaser can emit progress facts, spook meter ticks, gem effects, or completion/escape requests.
- React decides whether a request advances the expedition.
- React decides whether clue purchases or guesses are legal.
- Only React emits the final `node-complete` event.

### Node progression contract

1. Phaser emits `node-objective-updated` while a node is active.
2. When the objective is met, Phaser emits `node-advance-requested` with `reason: 'objective_complete'`.
3. When the spook meter hits escaped tier (or moves are exhausted during an expedition), Phaser emits `node-advance-requested` with `reason: 'escaped'`.
4. Analysis nodes use a panel button that emits `node-advance-requested` with `reason: 'analysis_complete'`.
5. `MainAppLayout` validates the request against current run state, persists node completion, advances `RunState`, then emits `node-complete`. On escape, it skips remaining nodes and transitions to Deduction Camp.
6. `Game.ts` and `CesiumMap.tsx` listen to `node-complete` for board/trail cleanup only.

### Active run events

- `expedition-data-ready`: Cesium/API -> React run setup
- `expedition-start`: briefing -> active run
- `cesium-location-selected`: React -> Phaser node initialization
- `node-objective-updated`: Phaser -> React/UI progress update
- `node-bonus-tick`: Phaser -> UI spook meter state (currentPool, startPool, pct, tier)
- `node-rewards-summary`: Phaser -> React per-node reward breakdown with spook tier
- `clue-fragment-earned`: Phaser -> React category-specific fragment accumulation
- `clue-discount-earned`: Phaser -> React thought-gem discount accumulation
- `resource-wallet-updated`: Phaser/React -> UI wallet display sync
- `node-advance-requested`: Phaser/UI -> React advancement request (includes reason: objective_complete, escaped, analysis_complete, etc.)
- `node-complete`: React -> Phaser/Cesium/UI completion fact
- `encounter-triggered`: Phaser -> UI flash/loot feedback
- `souvenir-dropped`: Phaser -> React souvenir state
- `deduction-camp-purchase`: React -> Phaser clue category purchase

Typed in `src/game/EventBus.ts` but not active end-to-end in the current expedition loop:

- `trivia-unlocked`
- `deduction-camp-guess`

## Clue contract

- The board uses **two gem families**:
  - **Loot gems (8)** map to clue categories. During expeditions they award **clue fragments** (not direct reveals).
  - **Action gems (8)** drive node objectives, encounters, and economy effects (Observe, Scan, Camouflage, Traverse, Focus, Field Notes, Backpack, Burst).
- `src/game/gemSemantics.ts` and `src/expedition/domain.ts` are the runtime sources of truth.
- During expeditions: loot matches emit `clue-fragment-earned`; clues are only revealed via Deduction Camp purchases (which emit `clue-revealed`).
- During free-play: `clue-revealed` fires directly on loot matches (legacy behavior preserved).

## Board model

Current backend board cells use:

```ts
interface BoardCell {
  family: 'action' | 'loot';
  gemType: GemType;
  state?: BoardCellState;
}
```

### Grid state snapshots

`BackendPuzzle.getGridState()` returns a shallow clone (not a live reference). `getNextExplodeAndReplacePhase()` also captures a `matchGridState` snapshot after the swap but before explode-and-replace, bundled into the returned `ExplodeAndReplacePhase`. Callers should use `phaseResult.matchGridState` to read the original gem types at matched coordinates.

### Objective progress is independent of species state

`recordMatchesForSummary()` counts required-gem matches and emits `node-objective-updated` regardless of whether a species is selected. Clue emission still requires a selected species, but objective progress does not.

### Implications

- Obstacles have a stable cell model but are not yet game-state beyond visual seeding.
- `BoardView` should only render state that already exists in `BackendPuzzle`, and mirrors `BoardCell.state` onto sprite metadata.

### Spook meter contract

- Phaser owns the per-node spook meter (decay timer, tier computation, escape detection).
- Phaser disables inputs and sets `nodeObjectiveCompleted = true` before emitting escape.
- React owns the run-level consequence (skip remaining nodes, transition to Deduction Camp).
- See [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md#spook-meter-chase-pressure) for tier thresholds and multipliers.

### Run state

`RunState` (in `src/types/expedition.ts`) includes:

- `phase`: idle → briefing → in-run → deduction → complete
- `bankedScore`: accumulated research score across nodes
- `clueFragments`: per-category fragment counts from loot matches
- `resourceWallet`: 4 economy currencies (Supplies, Focus, Insight, Samples)
- `consumables`: crate-dropped items (Signal Flare, Bait, Trail Map, Field Kit)
- `deductionCamp`: clue shop, revealed clues, guess state, score spent
- `currentNodeBonus`: typed placeholder for persisted spook state; currently initialized as `null` and not used as the live UI source
- `lastNodeRewards`: most recent node reward breakdown with tier
- `totalThoughtDiscount`: accumulated Field Notes discount for clue shop
- `finalScore`: populated after correct deduction guess

## Expedition schema vs runtime

Current runtime supports:

- 6-node expedition structure with GIS-driven node generation
- node templates with typed obstacle definitions and deterministic board-state seeding
- required action-gem objectives per node
- spook meter with 3-tier outcomes (stabilized/spooked/escaped)
- encounter triggers every 3rd match group, with souvenir drops
- gem effect system (`src/expedition/gemEffects.ts`) routing action/loot matches to distinct effects
- clue fragment accumulation from loot matches
- banked score economy with Deduction Camp (clue purchases + species guess)
- consumable items from crate matches
- resource wallet (Supplies, Focus, Insight, Samples)
- run persistence to `eco_run_sessions` / `eco_run_nodes`

Current runtime does not yet support:

- persisted per-board outcome/state evolution beyond initial seeded context
- obstacle state machines beyond static seeded footprints (3 dynamic-only placeholders: flow_shift, low_visibility, time_pressure)
- trivia content or active `trivia-unlocked` usage in expeditions
- partial-run summary UI for escaped expeditions entering Deduction Camp

## Safe extension order

1. Keep node advancement single-owned by React.
2. Evolve obstacle placeholders into active board mechanics.
3. Add trivia content to feed the existing Scan / `trivia_boost` hooks.
4. Build partial-run summary for escaped expeditions.
5. Tune spook meter decay rates and clue pricing via playtesting.

## Files to inspect first

- `src/MainAppLayout.tsx` — run phase state machine, node advancement, deduction handlers
- `src/game/EventBus.ts` — typed event contracts
- `src/game/scenes/Game.ts` — board play, spook meter, gem effects, objective tracking, encounters
- `src/game/BackendPuzzle.ts` — grid state, snapshots, match detection
- `src/game/ExplodeAndReplacePhase.ts` — phase result + `matchGridState` snapshot
- `src/game/boardTypes.ts` — cell schema
- `src/game/gemSemantics.ts` — gem-to-category mapping
- `src/game/nodeObstacles.ts` — obstacle typing, labels, board-state seeding
- `src/expedition/domain.ts` — gem definitions, wallet defs, consumable blueprints
- `src/expedition/gemEffects.ts` — gem effect routing
- `src/types/expedition.ts` — RunState, SpookTier, economy types, helpers
- `src/components/ActiveEncounterPanel.tsx` — spook meter UI, objective progress
- `src/components/DeductionCamp.tsx` — clue market + species guess
- `src/components/CesiumMap.tsx` — route trail, click guards
- `docs/EXPEDITION_RUN_LOOP.md` — run loop + spook meter docs
- `docs/DEDUCTION_CAMP_ECONOMY.md` — economy + deduction camp docs
