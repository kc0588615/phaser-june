# Game System Architecture

Current source of truth for the React + Phaser gameplay stack.

Use this doc before changing run flow, EventBus contracts, board logic, clue behavior, or the run economy.

## Runtime ownership

- React owns app layout, expedition phase state, run persistence, wallet/inventory state, store resolution, and node advancement.
- Phaser owns board state, input, matching, scoring, clue emission, combat resolution, and objective progress.
- Cesium listens to completed-node events to update trail visuals.
- Species/clue UI listens to game events but does not own puzzle state.

## Layout model

- `src/MainAppLayout.tsx` keeps Phaser, Cesium, and clue UI mounted.
- Top area is the Phaser wrapper.
- Bottom area switches between Cesium, expedition briefing, completion summary, and clue UI.
- Components should be hidden with CSS instead of unmounted when they need to preserve EventBus listeners or state.

## EventBus ownership rules

- Emit facts, not side effects.
- Phaser can emit progress facts, combat updates, or completion requests.
- React decides whether a request advances the expedition.
- React decides whether wallet spend, store purchase, or retreat is legal.
- Only React emits the final `node-complete` event.

### Node progression contract

1. Phaser emits `node-objective-updated` while a node is active.
2. During standoffs, Phaser emits battle state updates and may emit `node-advance-requested` only after victory, defeat + retreat, or explicit failure handling.
3. During crisis/store nodes, React owns the screen and emits `node-advance-requested` only after the player resolves the decision.
4. `MainAppLayout` validates the request against current run state, persists node completion, advances `RunState`, then emits `node-complete`.
5. `Game.ts` and `CesiumMap.tsx` listen to `node-complete` for board/trail cleanup only.

### Active run events

- `expedition-data-ready`: Cesium/API -> React run setup
- `expedition-start`: briefing -> active run
- `cesium-location-selected`: React -> Phaser node initialization
- `node-objective-updated`: Phaser -> React/UI progress update
- `battle-state-updated`: Phaser -> React/UI creature HP, player HP, armor, telegraph, wallet-spend affordances
- `resource-wallet-updated`: Phaser/React -> UI wallet display sync
- `store-opened`: React -> UI merchant state
- `store-purchase-requested`: UI -> React inventory/wallet validation
- `store-purchase-resolved`: React -> UI/Phaser purchase fact
- `crisis-choice-requested`: UI -> React run modifier validation
- `crisis-choice-resolved`: React -> UI/Phaser modifier fact
- `node-advance-requested`: Phaser/UI -> React advancement request
- `node-complete`: React -> Phaser/Cesium/UI completion fact
- `encounter-triggered`: Phaser -> UI flash/loot feedback
- `souvenir-dropped`: Phaser -> React souvenir state

## Clue contract

- The board now needs **two gem families**:
  - **Knowledge gems (8)** map directly to clue categories.
  - **Resource gems (4)** map to run economy currencies.
- `src/game/gemSemantics.ts` is the runtime source of truth.
- `clue-revealed` drives:
  - clue UI updates
  - toast notifications
  - knowledge-category progress only

This means clue semantics and run currency must be explicitly decoupled before the 12-gem spec is implemented.

## Board model

Current backend board cells use:

```ts
interface BoardCell {
  family: 'knowledge' | 'resource';
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
- Combat states such as weakened, spoiled, fogged, armor-linked effects, and skill targeting require backend model expansion.
- Resource gems must be first-class board entities, not post-match random wallet rewards.
- `BoardView` should only render state that already exists in `BackendPuzzle`, and mirrors `BoardCell.state` onto sprite metadata.

### Combat contract

- Phaser should own:
  - creature HP / armor
  - player HP
  - weakness/resistance application
  - countdown telegraphs
  - board afflictions (fog, spoil, weaken, blockers)
- React should own:
  - resource wallet persistence
  - consumable inventory / passive relic inventory
  - store purchases
  - retreat costs
  - crisis/store node resolution

Combat skills should be requested from UI/Phaser as explicit spend intents, then resolved against the shared wallet state rather than silently mutating local counters.

### Run state additions

The 12-gem / battle-store spec implies `RunState` needs more than `phase`, `currentNodeIndex`, and a flat wallet:

- `resourceWallet`: 4 resource currencies
- `knowledgeMatchSummary`: per-category match counts for end-of-run stats
- `equippedPassives`: fixed-size passive inventory
- `consumables`: fixed-size consumable inventory
- `pendingNodeModifiers`: crisis effects that alter the next node
- `currentBattleState`: optional creature/player combat snapshot for UI restore

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
- dual gem families on the board (8 knowledge + 4 resource)
- battle HP/armor/telegraph state
- consumables, passive relics, or merchant stock
- explicit wallet spends during a run
- crisis/store modifiers that alter future node config
- distinct tactical gem actions beyond clue generation/objective progress

## Safe extension order

1. Keep node advancement single-owned by React.
2. Separate knowledge gems from resource gems in the runtime model.
3. Expand `BackendPuzzle` cell/state model for combat afflictions and board-side spends.
4. Extend persistence/events for wallet, inventory, store, crisis, and standoff outcomes.
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
- `src/types/expedition.ts`
- `src/components/GemWallet.tsx`
- `src/components/ExpeditionBriefing.tsx`
- `src/components/ActiveEncounterPanel.tsx`
- `src/components/CesiumMap.tsx`
- `docs/EXPEDITION_RUN_LOOP.md`
- `docs/CLUE_BOARD_IMPLEMENTATION.md`
