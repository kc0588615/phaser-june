---
sidebar_position: 5
title: Game Constants Reference
description: Board sizing, gem domain, asset keys, animation timing, and scoring constants
tags: [reference, game, constants]
---

# Game Constants Reference

Primary source: `src/game/constants.ts`.

Gem domain source: `src/expedition/domain.ts`.

## Grid and Gem Configuration

| Constant | Value | Purpose |
|----------|-------|---------|
| `GRID_COLS` | `4` | Default board columns |
| `GRID_ROWS` | `3` | Default board rows |
| `ACTION_GEM_TYPES` | `sword`, `staff`, `shield`, `key`, `crate`, `power`, `thought`, `multiplier`, `grenade`, `blade_drive`, `caltrops`, `shield_unit` | Action/combat pieces |
| `LOOT_GEM_TYPES` | `black`, `blue`, `green`, `orange`, `red`, `white`, `yellow`, `purple` | Clue-fragment/loot pieces |
| `GEM_TYPES` | action + loot gems | Full board gem union |
| `GEM_FRAME_COUNT` | `8` | Frames per sprite sheet |

The 4 x 3 default is intentional for all board modes so the game screen keeps a
consistent footprint. Match Battle can override board size from
`matchBattle.boardCols` and `matchBattle.boardRows`; row/column upgrades expand
from the same starter size.

## Action Gem Labels

Runtime enum values keep legacy names, while UI labels use fieldwork language.

| Code | Label | Primary use |
|------|-------|-------------|
| `sword` | Observe | Standard objective / Match Battle Pressure |
| `staff` | Scan | Standard utility / Match Battle direct view |
| `shield` | Camouflage | Cover / spook buffer |
| `key` | Traverse | Cache/Focus style support |
| `crate` | Backpack | Economy |
| `power` | Focus | Focus/charge effects |
| `thought` | Field Notes | Support/discount effects |
| `multiplier` | Burst | Combo/risk effects |
| `grenade` | Flash Snare | Match Battle area Pressure |
| `blade_drive` | Pressure Drive | Match Battle drop Pressure |
| `caltrops` | Bramble Snare | Match Battle risk damage |
| `shield_unit` | Barrier Unit | Match Battle Cover |

## Asset Paths and Keys

| Constant | Value | Purpose |
|----------|-------|---------|
| `ASSETS_PATH` | `assets/` | Base Phaser asset path |
| `AssetKeys.LOGO` | `logo` | Logo texture key |
| `AssetKeys.BACKGROUND` | `background` | Background texture key |
| `AssetKeys.GEM_TEXTURE(type, frame)` | `${type}_gem_${frame}` | Gem texture key helper |

```typescript
const key = AssetKeys.GEM_TEXTURE('blue', 0); // "blue_gem_0"
```

Action gems are not all asset-backed; `BoardView.ts` handles semantic rendering/fallbacks.

## Animation Durations

| Constant | Value | Purpose |
|----------|-------|---------|
| `ANIMATION_DURATIONS.SNAP` | `250` | Swap snap or return tween |
| `ANIMATION_DURATIONS.EXPLODE` | `200` | Explosion tween |
| `ANIMATION_DURATIONS.FALL_BASE` | `200` | Base fall duration |
| `ANIMATION_DURATIONS.FALL_PER_UNIT` | `0.4` | Extra ms per pixel of fall distance |
| `ANIMATION_DURATIONS.FALL_MAX` | `450` | Fall duration cap |
| `ANIMATION_DURATIONS.LAYOUT_UPDATE` | `150` | Resize/orientation tween |

Legacy aliases remain during refactors:

- `TWEEN_DURATION_SNAP`
- `TWEEN_DURATION_EXPLODE`
- `TWEEN_DURATION_FALL_BASE`
- `TWEEN_DURATION_FALL_PER_UNIT`
- `TWEEN_DURATION_FALL_MAX`
- `TWEEN_DURATION_LAYOUT_UPDATE`

## Input Thresholds

| Constant | Value | Purpose |
|----------|-------|---------|
| `INPUT_THRESHOLDS.DRAG` | `10` | Pixels before drag direction locks |
| `INPUT_THRESHOLDS.MOVE` | `0.3` | Fraction of gem size dragged needed to register a swap |

Legacy aliases:

- `DRAG_THRESHOLD`
- `MOVE_THRESHOLD`

## Habitat to Gem Mapping

`HABITAT_GEM_MAP` maps habitat classification codes to legacy loot gem colors. It is retained as habitat-driven selection scaffolding.

| Habitat codes | Category | Gem |
|---------------|----------|-----|
| `100-109` | Forests | `green` |
| `200-202` | Savannas | `orange` |
| `300-308` | Shrublands | `black` |
| `400-407` | Grasslands | `white` |
| `500-518` | Wetlands | `blue` |
| `1400-1406` | Urban/artificial | `red` |
| `0`, `1700` | No data/unknown | `white` |

## Legacy Scoring Constants

These still exist for the clue/species board and standard scoring path.

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_MOVES` | `50` | Move cap |
| `STREAK_STEP` | `0.25` | Streak multiplier increase |
| `STREAK_CAP` | `3.0` | Streak multiplier cap |
| `EARLY_BONUS_PER_SLOT` | `100` | Early clue/discovery bonus |
| `DEFAULT_TOTAL_CLUE_SLOTS` | `8` | Fallback clue slots |
| `MOVE_LARGE_MATCH_THRESHOLD` | `4` | Large match threshold |
| `MOVE_HUGE_MATCH_THRESHOLD` | `5` | Huge match threshold |
| `MULTIPLIER_LARGE_MATCH` | `1.25` | Large match multiplier |
| `MULTIPLIER_HUGE_MATCH` | `1.5` | Huge match multiplier |
| `MULTIPLIER_MULTI_CATEGORY` | `1.15` | Multi-category multiplier |
| `MULTIPLIER_REPEAT_CATEGORY` | `1.25` | Repeat-category multiplier |

## Related Docs

- [Match Battle](/docs/guides/game/match-battle)
- [Gem & Clue Mapping](/docs/reference/gem-clue-mapping)
- [Clue Board Implementation](/docs/guides/game/clue-board)
