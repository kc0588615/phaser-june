# Game System Architecture

Current source of truth for the React + Phaser gameplay stack.

Use with [MATCH_BATTLE_SYSTEM.md](./MATCH_BATTLE_SYSTEM.md). Older expedition docs are archived under `docs/archive/`.

## Current Loop

1. Globe click selects a location and candidate species.
2. Briefing opens with affinity and field-partner selection.
3. Match Battle route starts: 4-6 depths, node types `enemy`, `elite`, `repair`, final `leader`.
4. Combat uses a 4x5 board with 8 loot gems plus 3 tool pieces:
   - `sword` / Spotting Scope: damage
   - `staff` / Telephoto Lens: heavier direct damage
   - `shield` / Camo Blind: stamina recovery
5. Loot gems reveal clues during combat. `lootChance` is 0.35.
6. Rewards, rerolls, and upgrades spend banked score only.
7. Leader win or stamina loss enters Deduction Camp with `revealedDuringRun`.
8. Correct species guess captures the species through `player_species_discoveries`.

Moves are unlimited. Move count is retained for stats only.

## Runtime Ownership

- React owns app layout, expedition phase state, route/reward/upgrade state, run persistence, partner selection, Deduction Camp, and node advancement.
- Phaser owns board state, input, matching, scoring, clue reveal emission, combat event emission, and board-side debuff application.
- `src/game/matchBattle/combatResolver.ts` owns pure combat math: piece effects, gear effects, enemy turns, next intent, score deltas, stat deltas, and outcomes.
- Cesium owns map rendering, click ingress, and route visuals.

## EventBus

Active categories:

- location: `cesium-location-selected`
- board/HUD: `game-hud-updated`, `game-reset`, `game-restart`
- run: `expedition-data-ready`, `expedition-start`, `node-advance-requested`, `node-complete`, `node-objective-updated`
- Match Battle: `match-battle-combat-state-updated`, `match-battle-combat-ended`, `match-battle-reward-draft-opened`, `match-battle-route-node-selected`, `match-battle-run-ended`
- clue/deduction: `clue-revealed`, `species-guess-submitted`, `deduction-camp-purchase`
- auth/progress: `auth-user-ready`

`EventBus.ts` is fully typed. Emit facts only; React decides run-state transitions.

## Board Model

- Default board: `GRID_COLS = 4`, `GRID_ROWS = 5`.
- Match Battle can expand via `board_col` and `board_row`.
- `BackendPuzzle` owns `BoardCell` state and returns cloned snapshots.
- `ExplodeAndReplacePhase.matchGridState` captures matched gem identity before replacements.
- `BoardView` renders the state already present in `BackendPuzzle`.

## Combat State

`MatchBattleCombatState` is intentionally flat:

- `playerHp`
- `playerMaxHp`
- `turn`
- `enemy`
- `log`

Enemy combat state is HP + intent only. Guard, energy/actions, focus, focus storage, max acceleration, fragments, and wallet currencies were removed.

## Persistence

- Match Battle schema version is `4`.
- Checkpoints persist sanitized between-combat state in `metadata.matchBattle`.
- Combat enemy/log/turn reset on combat entry.
- Legacy saved piece pools are normalized to current tool pieces.
- Legacy wallet/currency fields are ignored.

## Files To Inspect First

- `src/MainAppLayout.tsx` - layout and run phase shell
- `src/contexts/ExpeditionContext.tsx` - route, rewards, persistence, deduction handoff
- `src/game/EventBus.ts` - typed event contracts
- `src/game/scenes/Game.ts` - Phaser input, board adapter, EventBus emission
- `src/game/BackendPuzzle.ts` - board state, matches, shuffle, move count
- `src/game/BoardView.ts` - rendering and animation
- `src/game/matchBattle/catalog.ts` - pieces, gear, upgrades, route map
- `src/game/matchBattle/types.ts` - Match Battle contracts
- `src/game/matchBattle/combatResolver.ts` - pure combat resolver
- `src/game/matchBattle/speciesMapper.ts` - species combat traits to enemies/intents
- `src/game/matchBattle/partner.ts` - field partner passives
- `src/game/matchBattle/debug.ts` - tuning/debug summaries
- `src/components/DeductionCamp.tsx` - clue review and capture guess
- `src/components/MatchBattleCombatHud.tsx` - combat HUD
- `src/components/MatchBattleRouteMap.tsx` - route UI
- `src/components/MatchBattleRewardDraft.tsx` - rewards/upgrades
