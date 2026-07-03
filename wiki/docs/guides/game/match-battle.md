---
sidebar_position: 5
title: Match Battle
description: Current combat route, board pieces, rewards, and persistence
tags: [guide, game, match-battle, combat, persistence]
---

# Match Battle

Match Battle is the active direction for the match-board game loop. It adds a branching route, weighted piece pool, Stamina combat, Actions, Focus, field gear, upgrades, rewards, and checkpoint persistence over the existing Phaser board.

## Runtime Ownership

| Owner | Responsibilities |
|-------|------------------|
| React | Run phase, route selection, reward drafts, upgrades, persistence, end-of-run UI |
| Phaser | Board input, swaps, cascades, piece effects, enemy turns, combat HUD events |
| Postgres | Run checkpoints in `eco_run_sessions.metadata.matchBattle` |

Primary files:

- `src/contexts/ExpeditionContext.tsx` - run state machine, reducers, checkpoint effect
- `src/game/scenes/Game.ts` - combat board setup, move/cascade resolution, enemy turns
- `src/game/BackendPuzzle.ts` - weighted Match Battle spawning
- `src/game/matchBattle/types.ts` - route, piece, gear, upgrade, combat state types
- `src/game/matchBattle/catalog.ts` - piece/gear/upgrade catalogs and route generation
- `src/game/matchBattle/combatEvents.ts` - field gear trigger resolution
- `src/components/MatchBattleCombatHud.tsx` - Stamina/Actions/Focus/enemy HUD
- `src/components/MatchBattleRewardDraft.tsx` - reward and upgrade selection
- `src/components/MatchBattleRouteMap.tsx` - route node selection

## Run Lifecycle

1. Map click creates GIS expedition data.
2. Starting the expedition creates `MatchBattleRunState` with route nodes, piece pool, combat base, and starter currencies.
3. React persists the run with `metadata.matchBattle`.
4. React emits `cesium-location-selected` with `matchBattleConfig`, route node type, combat state, gear, and species combatants.
5. Phaser initializes a weighted Match Battle board.
6. Player swaps adjacent pieces, spending Actions.
7. Matches resolve piece effects, cascades, drop/break triggers, gear triggers, and enemy turns.
8. Phaser emits `match-battle-combat-ended`.
9. React marks the route node complete, grants resources, then opens reward/route UI or completes the run.

Loss is Stamina reaching 0. Leader clear is a run win.

## Board Size and Pacing

The default board is intentionally compact: `GRID_COLS = 4`, `GRID_ROWS = 3`.
That default applies to the shared gem board footprint so regular expedition
and Match Battle screens use the same starting space.

Match Battle stores board dimensions on the run:

- `matchBattle.boardCols`
- `matchBattle.boardRows`

`board_col` and `board_row` upgrades expand the combat board over time. Current
caps are 7 columns and 6 rows.

## Run Phases

Match Battle uses the shared `RunPhase` union:

```
idle -> briefing -> in-run -> reward -> route -> complete
```

Utility route nodes can remain in `route` after immediate rewards. Combat nodes enter `in-run`. Reward drafts use `reward`. Deduction Camp is for the standard expedition loop, not the current Match Battle route.

## Route Map

`createRouteMap(nodeCount)` builds depth/lane route nodes:

- depth 0 starts with one enemy node, renamed `n0`
- early depths use fixed lane layouts
- middle depths rotate combat and utility layouts
- final depth is a single `leader`
- each node links to adjacent lanes in the next depth
- `sourceNodeIndex` clamps to the available GIS expedition node index

Route node types are:

`enemy`, `elite`, `leader`, `shop`, `treasure`, `event`, `repair`, `challenge`, `trivia`, `gis_recon`.

## Combat State

`MatchBattleCombatState` tracks:

| Field | Meaning |
|-------|---------|
| `playerHp`, `playerMaxHp` | Stamina |
| `energy`, `maxEnergy` | Actions per turn |
| `guard` | Temporary Cover |
| `attack` | Temporary Pressure accumulator |
| `focusStored`, `maxAccel` | Focus charge and threshold |
| `turn` | Combat turn |
| `enemy` | Current enemy |
| `log` | Combat log for the active fight |

Focus fires through `match-battle-focus-skill-requested`, deals direct Pressure equal to stored Focus, then resets `focusStored` to 0.

## Pieces

Pieces spawn from `matchBattle.piecePool` by weight. Runtime and normalization keep at least three positive-weight piece types so no-match board generation has enough legal choices.

| Trigger | Meaning |
|---------|---------|
| `match` | Resolves when the piece is part of a match |
| `break` | Resolves when adjacent to a matched piece |
| `drop` | Resolves when the piece reaches the bottom row |
| `debuff` | Seeds a debuffed cell |

Current debuffs (`burn`, `web`) share MVP behavior:

- unmovable
- unmatchable
- cleansed by an orthogonally adjacent successful match
- skipped on blocker cells

Per-type HP ticks or timers are future work.

## Gear and Upgrades

Gear is either permanent on-acquire state or per-event combat triggers.

| Gear | Trigger | Effect |
|------|---------|--------|
| Trail Mix | `turn_start` | +4 Approach each turn, spend 2 Stamina |
| Multi-Tool | on acquire | +1 max Action |
| Grant Ledger | `combat_end` | +8 Grants |
| Reinforced Blind | `combat_start` | Start with 6 Cover |
| Endurance Log | `on_hp_loss` | Stamina loss adds Focus |
| Smartwatch | `on_cascade` | Each cascade adds +1 Approach |

Upgrade IDs:

`board_col`, `board_row`, `max_energy`, `accel_cell`, `arm_slot`, `reduce_rate`.

`reduce_rate` is repeatable but cannot reduce the active pool below three spawnable pieces.

## Enemy HP Tuning

Combat is tuned for short sessions on the 4 x 3 starter board. Regular fights
should resolve quickly; leaders can be tougher but should stay inside the same
2-3 minute session budget.

Species enemies are created in `src/game/matchBattle/speciesMapper.ts`:

- base HP comes from `size_class`
- `combat_tier` and route node type apply moderate multipliers
- difficulty adds a small flat bonus
- explicit compact-board caps prevent massive/apex/leader stacking from
  producing long outlier fights
- `hp_override` is an exact max HP override and bypasses size/tier/node/difficulty
  scaling

Current reference cases:

| Case | HP |
|------|----|
| small common enemy, difficulty 2 | 18 |
| generic fallback enemy, difficulty 2 | 20 |
| massive apex leader, difficulty 2 | 56 cap |

Generic fallback enemies from `src/game/matchBattle/catalog.ts` use similarly
compact HP values when species combat traits are unavailable.

## Persistence

React checkpoints Match Battle through `PATCH /api/runs/[runId]` into `eco_run_sessions.metadata.matchBattle`.

Persisted between combats:

- route state
- piece pool
- gear and upgrades
- credits, Mark Form, reroll cost
- board dimensions and snippet flag
- player Stamina/max Stamina
- max Actions
- Focus threshold and stored Focus
- reward draft

Not persisted as a mid-fight restore contract:

- live enemy
- guard
- temporary attack
- turn
- combat log
- board snapshot

Reloading mid-fight intentionally restarts the current combat from sanitized between-combat state.

Checkpoint behavior:

- normal Match Battle state changes debounce for 300ms
- reward picks, rerolls, upgrades, and non-combat route nodes request immediate flush
- `visibilitychange` and `pagehide` attempt a final keepalive checkpoint
- `/api/runs` and `/api/runs/[runId]` sanitize the `matchBattle` JSON blob before writing

## EventBus Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `match-battle-combat-state-updated` | Phaser -> React | Combat HUD state |
| `match-battle-combat-ended` | Phaser -> React | Win/loss, final combat state, credits delta |
| `match-battle-focus-skill-requested` | React -> Phaser | Fire Focus skill |
| `match-battle-reward-draft-opened` | React -> UI | Reward options available |
| `match-battle-route-node-selected` | UI -> React | Route node chosen |
| `match-battle-run-ended` | React/Phaser -> UI | Run outcome fact |

## Known Follow-Ups

- Add focused tests for cascade resolution and gear triggers.
- Expand debuff behavior beyond the shared MVP semantics.
- Tune route pacing and reward draft UX through playtesting.

## Related Docs

- [Expedition Run Loop](/docs/guides/game/expedition-run-loop)
- [Event Types Reference](/docs/reference/event-types)
- [Database Schema](/docs/reference/database-schema)
- [Game Constants](/docs/reference/game-constants)
