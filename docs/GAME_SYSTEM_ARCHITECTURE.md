# Game System Architecture

Current source of truth for the React + Phaser gameplay stack.

Use this doc before changing run flow, EventBus contracts, board logic, or clue behavior.

## Runtime ownership

- React owns app layout, expedition phase state, run persistence, and node advancement.
- Phaser owns board state, input, matching, scoring, clue emission, and objective progress.
- Cesium listens to completed-node events to update trail visuals.
- Species/clue UI listens to game events but does not own puzzle state.

## Layout model

- `src/MainAppLayout.tsx` keeps Phaser, Cesium, and clue UI mounted.
- Top area is the Phaser wrapper.
- Bottom area switches between Cesium, expedition briefing, completion summary, and clue UI.
- Components should be hidden with CSS instead of unmounted when they need to preserve EventBus listeners or state.

## EventBus ownership rules

- Emit facts, not side effects.
- Phaser can emit progress or completion requests.
- React decides whether a request advances the expedition.
- Only React emits the final `node-complete` event.

### Current node progression contract

1. Phaser emits `node-objective-updated` while a node is active.
2. When a node is ready to advance, game/UI emits `node-advance-requested`.
3. `MainAppLayout` validates the request against current run state, persists node completion, advances `RunState`, then emits `node-complete`.
4. `Game.ts` and `CesiumMap.tsx` listen to `node-complete` for board/trail cleanup only.

### Active run events

- `expedition-data-ready`: Cesium/API -> React run setup
- `expedition-start`: briefing -> active run
- `cesium-location-selected`: React -> Phaser node initialization
- `node-objective-updated`: Phaser -> React/UI progress update
- `node-advance-requested`: Phaser/UI -> React advancement request
- `node-complete`: React -> Phaser/Cesium/UI completion fact
- `encounter-triggered`: Phaser -> UI flash/loot feedback
- `souvenir-dropped`: Phaser -> React souvenir state

## Clue contract

- Gem colors currently map directly to clue categories.
- This mapping is a live gameplay contract, not presentation-only.
- `src/game/gemSemantics.ts` is the runtime source of truth.
- `clue-revealed` drives:
  - clue UI updates
  - toast notifications
  - gem wallet rewards during expeditions

This means board-color mechanics and clue semantics are still coupled.

## Board model

Current backend board cells use:

```ts
interface BoardCell {
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
- Wild gems, locked tiles, multi-hit mud, scheduled hazards, and terrain effects require backend model expansion.
- `BoardView` should only render state that already exists in `BackendPuzzle`, and mirrors `BoardCell.state` onto sprite metadata.

## Expedition schema vs runtime

The GIS/action-run docs describe a richer long-term target than the current runtime.

Current runtime supports:

- node templates
- typed obstacle definitions
- deterministic static obstacle seeding into `BoardCell.state`
- deterministic `boardContext` generation shared by runtime and run persistence
- required gem objectives
- encounter triggers
- souvenir drops
- gem wallet rewards

Current runtime does not yet support:

- persisted per-board outcome/state evolution beyond initial seeded context
- obstacle state machines beyond static seeded footprints
- tool recipes/home base systems
- distinct tactical gem actions beyond clue generation/objective progress

## Safe extension order

1. Keep node advancement single-owned by React.
2. Expand `BackendPuzzle` cell/state model.
3. Separate board mechanics from clue-category semantics.
4. Extend persistence/events for richer node outcomes.
5. Add action-oriented systems on top of those contracts.

## Files to inspect first

- `src/MainAppLayout.tsx`
- `src/game/EventBus.ts`
- `src/game/scenes/Game.ts`
- `src/game/BackendPuzzle.ts` (grid state, snapshots, match detection)
- `src/game/ExplodeAndReplacePhase.ts` (phase result + `matchGridState` snapshot)
- `src/game/boardTypes.ts`
- `src/game/gemSemantics.ts`
- `src/game/nodeObstacles.ts`
- `src/components/ActiveEncounterPanel.tsx`
- `src/components/CesiumMap.tsx`
- `docs/EXPEDITION_RUN_LOOP.md`
- `docs/CLUE_BOARD_IMPLEMENTATION.md`
