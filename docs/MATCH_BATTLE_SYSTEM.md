# Match Battle System

Current source of truth for the Match Battle roguelite combat layer.

Match Battle is the active direction for the match-3 game loop. It layers a route map, weighted piece pool, field gear, upgrades, stamina combat, and rewards over the existing Phaser board.

## Runtime Ownership

- React owns run state, route selection, reward drafts, upgrades, persistence, and end-of-run UI.
- Phaser owns board input, cascades, combat resolution, enemy turns, and combat HUD events.
- `src/game/matchBattle/*` owns static definitions and combat trigger helpers.
- Postgres stores run checkpoints through `eco_run_sessions.metadata.matchBattle`.

## Files

- `src/game/matchBattle/types.ts` — route, piece, gear, upgrade, combat state types.
- `src/game/matchBattle/catalog.ts` — piece catalog, gear catalog, upgrade catalog, route generation, enemy creation, reward drafts, state normalization.
- `src/game/matchBattle/combatEvents.ts` — field gear trigger resolution.
- `src/contexts/ExpeditionContext.tsx` — Match Battle state machine, route/reward/upgrade reducers, checkpoint persistence.
- `src/game/scenes/Game.ts` — combat board initialization, match effects, enemy turns, win/loss events.
- `src/game/BackendPuzzle.ts` — weighted Match Battle spawning and board model.
- `src/components/MatchBattleCombatHud.tsx` — stamina/actions/focus/enemy HUD.
- `src/components/MatchBattleRewardDraft.tsx` — reward and upgrade selection.
- `src/components/MatchBattleRouteMap.tsx` — branching route selection.

## Run Lifecycle

1. Expedition starts.
2. `createInitialMatchBattleState()` creates route, piece pool, combat base, and starter resources.
3. React creates the persisted run and stores `metadata.matchBattle`.
4. React emits `cesium-location-selected` with `matchBattleConfig`, current route node type, combat base, and armaments.
5. Phaser initializes a Match Battle board using weighted pieces.
6. Player swaps adjacent pieces.
7. Matches resolve piece effects, cascades, drop triggers, gear triggers, and turn cost.
8. If enemy Wariness reaches 0, Phaser emits `match-battle-combat-ended` with `outcome: 'won'`.
9. React marks the route node complete, grants resources, opens reward draft or ends the run on apex clear.
10. If player Stamina reaches 0, Phaser emits `match-battle-combat-ended` with `outcome: 'lost'`; React moves to deduction camp with gathered clues.
11. The HUD Break Camp button emits `match-battle-break-camp-requested`; Phaser emits `node-advance-requested` with `reason: 'retreat'`; React stores `outcome: 'called'` and moves to deduction camp without zeroing Stamina.

## Route Generation

`createRouteMap(nodeCount)` builds a depth/lane graph. `depthCount = max(6, nodeCount)`.

- **Early depths (0..4):** fixed explicit lane layouts from `EARLY_DEPTHS` (intro enemy, then mixed combat/utility ramps).
- **Extended middle depths (5..depthCount-2):** rotate through `MIDDLE_CYCLE` by `(depth - EARLY_DEPTHS.length) % MIDDLE_CYCLE.length`, keeping combats and utility interleaved. `MIDDLE_CYCLE` never contains `leader`, so extended runs never repeat a leader/boss depth.
- **Final depth (depthCount-1):** always exactly one `leader` lane.

Each node links `next` to adjacent lanes (`|lane delta| <= 1`) in the following depth. The depth-0 node is renamed `n0`. `sourceNodeIndex` clamps to the available expedition node index (`min(depth, nodeCount-1)`). Generation is deterministic — no RNG. Saved `routeNodes` are preserved verbatim on resume (`normalizeMatchBattleRunState`); only newly created runs get the improved layout.

## Combat State

`MatchBattleCombatState` tracks:

- `playerHp` / `playerMaxHp` — Stamina.
- `enemy.hp` / `enemy.maxHp` — Wariness in player-facing HUD.
- `energy` / `maxEnergy` — Actions per turn.
- `guard` — temporary Cover.
- `attack` — temporary Pressure accumulator.
- `focusStored` / `maxAccel` — Focus charge. `accel` was removed; Focus is now the single charge field. When `focusStored >= maxAccel`, the player can fire the Focus skill (HUD button → `match-battle-focus-skill-requested` → `Game.handleMatchBattleFocusSkill` → `resolveFocusSkill`): deals unblocked Pressure equal to stored Focus directly to enemy HP, then resets `focusStored` to 0. A lethal hit routes through `finishMatchBattleCombatWin`.
- `turn`
- `enemy`
- `log`

## Board Size and Pacing

The starter Match Battle board uses the same default footprint as the regular gem board: 4 columns x 3 rows (`GRID_COLS`, `GRID_ROWS`). `createInitialMatchBattleState()` persists this as `boardCols: 4` and `boardRows: 3`.

Board upgrades expand from that base:

- `board_col` adds one column, capped at 7.
- `board_row` adds one row, capped at 6.
- `snippet_row` was removed from the upgrade catalog because snippets are enabled at run init.

The combat target is a short session, roughly 2-3 minutes on the starter board. Species-derived HP is tuned for that compact board.

## Enemy Tuning

Generic catalog enemies remain the fallback when no `species_combat_traits` rows are available.

When species combat traits are available, `src/game/matchBattle/speciesMapper.ts` maps them into enemies:

- Base HP comes from `size_class`.
- Tier and route-node multipliers scale that base.
- Difficulty adds a small flat bonus.
- Compact-board caps prevent apex/leader fights from compounding out of range.
- `hp_override` is an exact max HP override; it skips size/tier/node/difficulty scaling and caps.
- `guard_override` is an exact guard override.

Reference cases at difficulty 2:

- small/common/enemy = 18 HP
- generic fallback enemy = 20 HP
- massive/apex/leader caps at 56 HP

## Resume Policy

Current policy: restart current combat on node entry.

Persist between-combat state only:

- player HP and max HP
- max Actions
- max Focus threshold
- Focus charge
- route state
- piece pool
- gear
- upgrades
- currencies
- reward draft

Do not persist live enemy, guard, attack, turn, or combat log as a mid-fight restore contract. `ExpeditionContext` sanitizes checkpoints through `resetMatchBattleCombatForNodeEntry()`.

## Board Pieces

Pieces spawn from `matchBattle.piecePool` by weight. A valid pool must keep at least 3 spawnable (positive-weight) piece types so no-match board generation cannot run out of legal choices (`MIN_SPAWNABLE_PIECES`).

This invariant is enforced at three layers:
- **Upgrades:** `purchaseMatchBattleUpgrade` blocks a `piece_weight_down` that would drop the active pool below 3 (`hasMinimumSpawnablePieces`), with a user toast.
- **Resume/normalize:** `normalizeMatchBattleRunState` runs `ensureMinimumSpawnablePieces`, repairing corrupt/legacy persisted pools (0-2 positive entries) by restoring starter pieces. Valid pools pass through untouched, so intentional thinning is preserved.
- **Runtime (defensive only):** `BackendPuzzle.getSpawnableMatchBattlePieces` pads to 3 starters, `pickWeightedPiece` never returns a zero-weight piece, and `getInitialPuzzleStateWithNoMatches` falls back rather than placing bad cells.

Trigger families:

- `match` — resolves when the piece is part of a match.
- `break` — resolves when adjacent to a matched piece.
- `drop` — resolves when a piece reaches the bottom row.
- `debuff` — seeds a debuffed cell (see Debuff Semantics below).

`BackendPuzzle` also preserves `BoardCellState.debuffId` and `charge` so future debuff work can build on stable cell metadata.

Trigger edge rules:

- `drop` pieces fire once per cell id per combat, including across cascades and shuffles.
- `break` pieces fire once per cell id per swap, so a surviving adjacent piece cannot double-fire across cascade phases of the same move.
- Player shuffles can fire `on_shuffle` gear; system repair shuffles that restore a valid move do not.
- Shuffle preserves whole cell identities (`id`, `pieceId`, `level`, `trigger`) while keeping slot state anchored, so `drop` dedupe survives shuffles.

## Debuff Semantics (MVP)

All `debuffId` values (currently `burn`, `web`) share the same first-pass board behavior:

- Debuffed cells are unmovable — `applyMoveToGrid` rejects swaps touching them.
- Debuffed cells are unmatchable — `getMatches` skips them unconditionally (no durability gate).
- A debuff cleanses when any orthogonally adjacent cell is part of a successful match. Cleansing runs at the top of `applyExplodeAndReplacePhase` on pre-collapse coordinates, before gravity, and assigns a fresh `state` object so the shallow `matchGridState` animation snapshot is unaffected.
- Blocker visuals/semantics take priority over debuffs when a cell somehow has both.
- `seedDebuff` skips already-debuffed and blocker cells, and clears a just-seeded debuff (one-shot, no retry) if it would leave the board with no valid moves.

Per-type effects (HP tick, turn timers, distinct burn/web behavior) remain future work.

## Gear Taxonomy

Gear belongs to one bucket:

- on-acquire permanent modifiers, handled in React reducers (`addMatchBattleArmament`).
- per-event triggers, handled by `resolveGearTriggers()` and dispatched from `Game.ts` call sites.

`action_booster` is on-acquire: it bumps max Actions (and current Actions) once when gained. It has no `trigger` and is **not** a `combat_start` event. The +1 is baked into `combat.maxEnergy`, which is persisted authoritatively and preserved verbatim through `normalizeMatchBattleRunState` on resume. Do not "repair" it in normalize — re-adding the bonus per owned `action_booster` would double-count on every reload.

Current per-event trigger wiring (each has a `resolveGearTriggers` case AND a `Game.ts` dispatch site):

- `iron_jaw` — `combat_start` (guard).
- `assault_potion` — `turn_start` (hp/attack trade).
- `credit_ledger` — `combat_end` (credits).
- `pain_transmitter` — `on_hp_loss` (focus).
- `crescendo_earrings` — `on_cascade` (attack scales with cascade count).

## Persistence

Match Battle persistence is centralized in one checkpoint effect in `ExpeditionContext`, built around `buildMatchBattleCheckpoint(state)` (sanitize + dedupe key) and `persistRunCheckpoint`.

- Normal state changes use a 300ms debounce.
- High-risk between-combat mutations request an **immediate** flush by setting `immediateCheckpointRef.current = true` before `setRunState`. The same effect then writes synchronously instead of waiting for the debounce. This covers: `selectMatchBattleReward`, `rerollMatchBattleRewards`, `purchaseMatchBattleUpgrade`, and `selectMatchBattleRouteNode` for non-combat node types (`repair`, `trivia`, `gis_recon`, `treasure`, `shop`, `event`). Combat-entry route nodes stay on the debounced path.
- A single `matchBattleCheckpointKeyRef` dedupe key guards both paths, so immediate + debounce cannot double-write the same state.
- `flushMatchBattleCheckpointNow` fires on `visibilitychange` (hidden) and `pagehide`, persisting best-effort with `fetch({ keepalive: true })` so a closing tab still saves the latest between-combat state.
- Failed debounced checkpoints roll back the dedupe key so the next state change or flush can retry the same payload.

Do not add scattered manual checkpoint calls to individual reducers; set the immediate flag instead. Mutating `runState.matchBattle` remains enough to trigger a (debounced) checkpoint.

Completion checkpoints include `finalScore` so `PATCH /api/runs/[runId]` marks `runStatus = 'completed'`, updates `scoreTotal`, and writes `run_memories`.

Deduction completion writes `deductionSummary` verbatim. Correct guesses include `captureGrade: { tier, label }`, derived from clues used and wrong guesses.

### Resume Policy

Crash-safe: between-combat reward/reroll/upgrade/utility/shop/event choices. Mid-combat resume is still **deferred** — live board/enemy/turn/guard state is intentionally sanitized out by `sanitizeRunStateForMatchBattleCheckpoint`, so reloading mid-fight resets the current combat by design. Reviving it would require board-snapshot serialization, which is out of scope here.

## Tuning Readout (debug)

`src/game/matchBattle/debug.ts` provides a console readout for balance tuning, gated behind the `mbDebug` localStorage flag (`localStorage.mbDebug = '1'`; silent otherwise).

- Per-combat (Phaser): on win/loss, `logMatchBattleCombatEnd` prints turns, damage dealt/taken, Focus gained/used, and debuffs seeded/cleansed. Stats accumulate in `Game.matchBattleStats`, reset at combat init, via `addFocusStored` / `applyPlayerHpDelta` helpers and damage-closure hooks (effective values, overkill not counted).
- Run-level (React): `logMatchBattleRunEvent` logs reward picks, rerolls, and upgrades from the `ExpeditionContext` reducers.

## Loss and Completion

- Stamina 0 means forced camp handoff with `outcome: 'lost'`.
- Break Camp means voluntary camp handoff with `outcome: 'called'`.
- Correct deduction after either path shows `Species Captured!`.
- Player can return to globe/reset from the summary.
- Combat HUD clue chips show unique clue-category icons plus total clue count; Break Camp stays disabled until at least one clue is gathered.

## Deferred Feature Work

- Per-type debuff effects (HP tick, turn timers, distinct burn/web behavior). MVP unmovable/unmatchable + adjacent-match cleanse is implemented.
- Route generation tuning only (encounter pacing, per-biome layouts). Core scalable generator with early/middle-cycle/final-leader structure is implemented (see Route Generation).
- Better reward drafting and shop UX.
- Tests for combat reducers and board generation invariants.
