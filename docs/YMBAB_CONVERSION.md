# YMBAB Conversion

Historical handoff for the first-pass conversion from the legacy clue-first board model to a **You Must Build A Boat**-inspired action board.

Status note: this doc is still useful for understanding the shift into the action/loot board, but it is no longer the runtime source of truth. Prefer [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md), [GAME_SYSTEM_ARCHITECTURE.md](./GAME_SYSTEM_ARCHITECTURE.md), and [DEDUCTION_CAMP_ECONOMY.md](./DEDUCTION_CAMP_ECONOMY.md) for current behavior.

Read this after [GAME_SYSTEM_ARCHITECTURE.md](./GAME_SYSTEM_ARCHITECTURE.md) and [EXPEDITION_RUN_LOOP.md](./EXPEDITION_RUN_LOOP.md).

## Purpose

The old runtime treated the board as:

- 8 knowledge gems for clue categories
- 4 resource gems for expedition wallet rewards

This conversion changes the board toward a YMBAB-style structure:

- **Action gems** are now the main board pool and drive node missions.
- **Loot gems** are the old 8 clue gems and now appear only sometimes.
- **Crates** now generate usable items.

This is intentionally an early structural conversion, not a full combat/economy rewrite.

## Core Design Shift

### Before

- gem color was doing too many jobs at once:
  - board mechanic
  - clue category
  - expedition objective input
  - UI identity
- node goals were still based on clue-color pairs
- the board pool used a `knowledge/resource` split

### After

- the board uses an `action/loot` split
- node goals are action-gem goals
- expedition loot matches award clue fragments, with clue reveals moved to Deduction Camp purchases
- crate matches create consumables
- expedition spawning is configured by explicit board config, not a single resource-weight scalar

## New Canonical Domain

Primary source of truth:

- [src/expedition/domain.ts](../src/expedition/domain.ts)

**Note:** `domain.ts` currently imports `GemCategory` from `@/game/clueConfig`, creating a dependency from the new canonical module back into the legacy clue system. Consider moving `GemCategory` into domain or a shared types file to clean this up.

This module now owns:

- action gem definitions
- loot gem definitions
- gem colors and labels
- wallet currency definitions
- crate consumable blueprints
- board spawn config helpers
- node-type display metadata

### Gem Families

**Action gems**

- `sword`
- `staff`
- `shield`
- `key`
- `crate`
- `power`
- `thought`
- `multiplier`

**Loot gems**

- `black`
- `blue`
- `green`
- `orange`
- `red`
- `white`
- `yellow`
- `purple`

### Wallet Currencies

The run wallet now uses:

- `gold`
- `power`
- `thought`
- `dust`

`dust` is currently the simple rare payout from loot-gem matches.

## Runtime Conversion

### Board spawning

Files:

- [src/game/constants.ts](../src/game/constants.ts)
- [src/game/BackendPuzzle.ts](../src/game/BackendPuzzle.ts)
- [src/game/scenes/Game.ts](../src/game/scenes/Game.ts)
- [src/MainAppLayout.tsx](../src/MainAppLayout.tsx)

Changes:

- replaced the old `resourceWeight` board tuning with `boardConfig`
- board generation now uses:
  - `lootChance`
  - weighted action-gem distribution
- nodes now boot the board using `buildBoardSpawnConfigForNode(...)`
- loot gems are intentionally uncommon

### Gem semantics

Files:

- [src/game/gemSemantics.ts](../src/game/gemSemantics.ts)
- [src/game/constants.ts](../src/game/constants.ts)

Changes:

- old semantic assumptions were replaced with domain-backed lookups
- clue category lookup now only resolves for loot gems
- wallet currency lookup now resolves action-gem currencies
- legacy helper names remain in place where useful, but behavior changed underneath them

### Visual loading/rendering

Files:

- [src/game/scenes/Preloader.ts](../src/game/scenes/Preloader.ts)
- [src/game/BoardView.ts](../src/game/BoardView.ts)

Changes:

- only loot gems use existing sprite assets
- action gems currently use generated placeholder textures
- this keeps the runtime working without requiring immediate art production

## Node Objective Conversion

Primary file:

- [src/lib/nodeScoring.ts](../src/lib/nodeScoring.ts)

The old node templates used clue-color pairs. They now use action-gem pairs.

### Current node goals

- `riverbank_sweep` → `shield`, `power`
- `dense_canopy` → `sword`, `crate`
- `urban_fringe` → `key`, `thought`
- `elevation_ridge` → `staff`, `shield`
- `storm_window` → `power`, `multiplier`
- `custom` → `crate`, `thought`
- `analysis` → none

### Action bias

`resourceBias` was replaced with `actionBias`.

`actionBias` is now used to tilt the board toward certain action gems depending on GIS-derived node context.

API payload change:

- legacy payload key: `resource_bias`
- new: `action_bias`

Touched files:

- [src/lib/nodeScoring.ts](../src/lib/nodeScoring.ts)
- [src/app/api/protected-areas/at-point/route.ts](../src/app/api/protected-areas/at-point/route.ts)
- [src/components/CesiumMap.tsx](../src/components/CesiumMap.tsx)
- [src/types/expedition.ts](../src/types/expedition.ts)

## Crate Consumable Pipeline

Primary files:

- [src/expedition/domain.ts](../src/expedition/domain.ts)
- [src/game/scenes/Game.ts](../src/game/scenes/Game.ts)
- [src/MainAppLayout.tsx](../src/MainAppLayout.tsx)
- [src/components/ConsumableTray.tsx](../src/components/ConsumableTray.tsx)

### Current flow

1. Player matches a `crate` group.
2. Phaser rolls a consumable from the crate blueprint list.
3. Phaser emits `consumable-found`.
4. React stores the consumable in `RunState.consumables`.
5. UI renders the item in `ConsumableTray`.
6. Player uses the item.
7. React emits `consumable-used`.
8. Phaser applies the effect.

### Current consumables

- `Signal Flare`
  - simple score burst
- `Bait`
  - simple objective push
- `Trail Map`
  - simple move buffer
- `Field Kit`
  - queues helpful gems into future spawns

These effects are intentionally simple and can be expanded later into richer battle logic.

## Match Resolution Changes

Primary file:

- [src/game/scenes/Game.ts](../src/game/scenes/Game.ts)

The scene now resolves matches in a more YMBAB-like split:

- action gems contribute to run economy and node goals
- loot gems contribute clue fragments and rare dust payout
- crates create consumables
- multiplier gems currently add a small direct score effect

### Important detail

Clue progression still exists, but it is no longer the board's primary role.

Loot gems are now the bridge back into:

- clue fragments by category
- Deduction Camp clue purchases
- species guessing flow

## UI Changes

Touched files:

- [src/components/ExpeditionBriefing.tsx](../src/components/ExpeditionBriefing.tsx)
- [src/components/GemWallet.tsx](../src/components/GemWallet.tsx)
- [src/components/ActiveEncounterPanel.tsx](../src/components/ActiveEncounterPanel.tsx)
- [src/components/RunTrack.tsx](../src/components/RunTrack.tsx)
- [src/components/ConsumableTray.tsx](../src/components/ConsumableTray.tsx)

Changes:

- briefing now shows action-gem bias instead of resource bias
- wallet now displays `gold/power/thought/dust`
- active node panel now shows action-gem objective labels
- run HUD now includes a consumable tray

## Data Model Changes

Primary file:

- [src/types/expedition.ts](../src/types/expedition.ts)

Key changes:

- removed legacy `gemWallet` (was in prior git history, no longer present)
- replaced `knowledgeMatchSummary` with `lootMatchSummary` (prior field removed from git history)
- changed expedition payload from `resourceBias` to `actionBias`
- aligned run wallet to the new currency model
- reused consumable typing from the expedition domain module

## Files Touched

### Created

- [src/expedition/domain.ts](../src/expedition/domain.ts)
- [src/components/ConsumableTray.tsx](../src/components/ConsumableTray.tsx)

### Edited

- [src/MainAppLayout.tsx](../src/MainAppLayout.tsx)
- [src/app/api/protected-areas/at-point/route.ts](../src/app/api/protected-areas/at-point/route.ts)
- [src/components/ActiveEncounterPanel.tsx](../src/components/ActiveEncounterPanel.tsx)
- [src/components/CesiumMap.tsx](../src/components/CesiumMap.tsx)
- [src/components/ExpeditionBriefing.tsx](../src/components/ExpeditionBriefing.tsx)
- [src/components/GemWallet.tsx](../src/components/GemWallet.tsx)
- [src/components/RunTrack.tsx](../src/components/RunTrack.tsx)
- [src/game/BackendPuzzle.ts](../src/game/BackendPuzzle.ts)
- [src/game/BoardView.ts](../src/game/BoardView.ts)
- [src/game/EventBus.ts](../src/game/EventBus.ts)
- [src/game/constants.ts](../src/game/constants.ts)
- [src/game/gemSemantics.ts](../src/game/gemSemantics.ts)
- [src/game/scenes/Game.ts](../src/game/scenes/Game.ts)
- [src/game/scenes/Preloader.ts](../src/game/scenes/Preloader.ts)
- [src/lib/nodeScoring.ts](../src/lib/nodeScoring.ts)
- [src/types/expedition.ts](../src/types/expedition.ts)

## Verification

Validation completed:

- `npm run typecheck`

Result:

- passed

## Current Limitations

This is a structural conversion, not a full YMBAB implementation.

Still simplified:

- no real runner-lane combat
- no explicit sword vs staff damage model yet
- no shield durability system yet
- no key/chest resolution model yet
- multiplier gem behavior is still simple
- crate items are lightweight effects, not deep battle tools
- `key` and `crate` both have `currencyKey: 'gold'` — crate matches award gold AND produce consumables (double reward); key matches just award gold with no chest/lock mechanic yet
- loot gem rarity is static per node config, not yet influenced by artifacts or passives

## Recommended Next Steps

1. Extract match resolution (`emitMatchEconomyRewards()` in `Game.ts`) into a pure expedition rules module.
2. Add explicit action outcomes for `sword`, `staff`, `shield`, `key`, and `multiplier`.
3. Introduce chest/lock entities so `key` and `crate` have board-side targets.
4. Add passive/relic hooks that modify loot chance and crate outcomes.
5. Update architecture docs once this conversion is considered the new baseline rather than an active transition.
