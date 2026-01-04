---
sidebar_position: 5
title: Game constants reference
description: Reference for puzzle sizing, animation timing, asset keys, and scoring multipliers
tags: [reference, game, constants]
---

# Game constants reference

Reference for constants defined in `src/game/constants.ts`. These values control puzzle sizing, asset keys, animation timing, and scoring behavior.

## Source file

- `src/game/constants.ts`

## Grid and gem configuration

| Constant | Value | Purpose | Used in |
|----------|-------|---------|---------|
| `GRID_COLS` | `7` | Board columns | `BackendPuzzle.ts`, `Game.ts` |
| `GRID_ROWS` | `7` | Board rows (reduced for owl UI space) | `BackendPuzzle.ts`, `Game.ts` |
| `GEM_TYPES` | `black, blue, green, orange, red, white, yellow, purple` | Allowed gem colors | `BackendPuzzle.ts`, `Preloader.ts` |
| `GEM_FRAME_COUNT` | `8` | Frames per gem sprite (0 idle, 1-7 explode) | `Preloader.ts` |

## Asset paths and keys

| Constant | Value | Purpose | Used in |
|----------|-------|---------|---------|
| `ASSETS_PATH` | `assets/` | Base path for Phaser asset loading | `Preloader.ts` |
| `AssetKeys.LOGO` | `logo` | Logo texture key | `Preloader.ts`, `MainMenu.ts` |
| `AssetKeys.BACKGROUND` | `background` | Background texture key | `Preloader.ts`, `Game.ts`, `MainMenu.ts`, `GameOver.ts` |
| `AssetKeys.GEM_TEXTURE(type, frame)` | `type_gem_frame` | Gem texture key helper | `Preloader.ts`, `BoardView.ts` |

```typescript
// src/game/constants.ts
const key = AssetKeys.GEM_TEXTURE('blue', 0); // "blue_gem_0"
```

## Animation durations (milliseconds)

| Constant | Value | Purpose | Used in |
|----------|-------|---------|---------|
| `ANIMATION_DURATIONS.SNAP` | `250` | Swap snap or return tween | `BoardView.ts` |
| `ANIMATION_DURATIONS.EXPLODE` | `200` | Explosion tween | `BoardView.ts` |
| `ANIMATION_DURATIONS.FALL_BASE` | `200` | Base fall duration | `BoardView.ts` |
| `ANIMATION_DURATIONS.FALL_PER_UNIT` | `0.4` | Additional ms per pixel of fall distance | `BoardView.ts` |
| `ANIMATION_DURATIONS.FALL_MAX` | `450` | Cap for fall duration | `BoardView.ts` |
| `ANIMATION_DURATIONS.LAYOUT_UPDATE` | `150` | Resize/orientation tween | `BoardView.ts` |

Legacy aliases remain for compatibility during refactors:

- `TWEEN_DURATION_SNAP`
- `TWEEN_DURATION_EXPLODE`
- `TWEEN_DURATION_FALL_BASE`
- `TWEEN_DURATION_FALL_PER_UNIT`
- `TWEEN_DURATION_FALL_MAX`
- `TWEEN_DURATION_LAYOUT_UPDATE`

## Input thresholds

| Constant | Value | Purpose | Used in |
|----------|-------|---------|---------|
| `INPUT_THRESHOLDS.DRAG` | `10` | Pixels before drag direction locks | `Game.ts` |
| `INPUT_THRESHOLDS.MOVE` | `0.3` | Fraction of gem size to count as a move | `Game.ts` |

Legacy aliases remain for compatibility:

- `DRAG_THRESHOLD`
- `MOVE_THRESHOLD`

## Habitat to gem mapping

`HABITAT_GEM_MAP` maps habitat classification codes to gem colors. It is currently not referenced by runtime code but is intended for habitat-driven gem selection.

| Habitat codes | Category | Gem |
|--------------|----------|-----|
| 100-109 | Forests | Green |
| 200-202 | Savannas | Orange |
| 300-308 | Shrublands | Black |
| 400-407 | Grasslands | White |
| 500-518 | Wetlands | Blue |
| 1400-1406 | Urban or artificial | Red |
| 0 | No data | White |
| 1700 | Unknown | White |

## Game mechanics and scoring

| Constant | Value | Purpose | Used in |
|----------|-------|---------|---------|
| `MAX_MOVES` | `50` | Move cap per round | `BackendPuzzle.ts`, `Game.ts` |
| `STREAK_STEP` | `0.25` | Multiplier increase per streak step | `Game.ts` |
| `STREAK_CAP` | `3.0` | Max streak multiplier | `Game.ts` |
| `EARLY_BONUS_PER_SLOT` | `100` | Bonus per unrevealed clue slot | `Game.ts` |
| `DEFAULT_TOTAL_CLUE_SLOTS` | `8` | Fallback clue slots per species | `Game.ts` |
| `MOVE_LARGE_MATCH_THRESHOLD` | `4` | Minimum match length for large bonus | `Game.ts` |
| `MOVE_HUGE_MATCH_THRESHOLD` | `5` | Minimum match length for huge bonus | `Game.ts` |
| `MULTIPLIER_LARGE_MATCH` | `1.25` | Score multiplier for large matches | `Game.ts` |
| `MULTIPLIER_HUGE_MATCH` | `1.5` | Score multiplier for huge matches | `Game.ts` |
| `MULTIPLIER_MULTI_CATEGORY` | `1.15` | Bonus for multi-category matches | `Game.ts` |
| `MULTIPLIER_REPEAT_CATEGORY` | `1.25` | Bonus for repeat-category streaks | `Game.ts` |

```typescript
// src/game/scenes/Game.ts
const streakMultiplier = Math.min(1 + streak * STREAK_STEP, STREAK_CAP);
```

## Tuning notes

- Increase `MAX_MOVES` to lengthen sessions; reduce it for tighter rounds.
- Adjust `STREAK_STEP` and `STREAK_CAP` to change streak impact on scoring.
- Raise `MOVE_LARGE_MATCH_THRESHOLD` or `MOVE_HUGE_MATCH_THRESHOLD` to make bonus matches rarer.
- Tune `ANIMATION_DURATIONS` for faster or slower board feel.
- Change `INPUT_THRESHOLDS.MOVE` to make swaps more or less forgiving.

## Related docs

- [Gem & Clue Mapping](/docs/reference/gem-clue-mapping)
- [Clue Board Implementation](/docs/guides/game/clue-board)
