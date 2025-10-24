# Match Flow & Move Economy (Updated 2025-02)

## Overview

The match-3 layer now drives a move-based scoring loop that rewards efficient play, large combos, and repeated colour mastery. Moves are counted **up** toward a 50-move budget (`MAX_MOVES`), and every resolved swap produces a `MoveSummary` used to apply combo multipliers and clue bursts. The pause overlay can freeze/resume the entire game loop without breaking cascades or input state.

Key outcomes:

- ✅ Moves count upward (`movesUsed`) with a hard cap (`maxMoves`)
- ✅ Combo multipliers reward 4+ matches, multi-colour moves, and repeat categories
- ✅ Clue bursts: 4-match → two clues, 5-match+ → all remaining clues
- ✅ Repeating the same category on consecutive moves unlocks the entire clue set
- ✅ HUD displays streak multiplier, last move multiplier, and `movesUsed/max`
- ✅ Pause overlay freezes tweens/time while keeping the board in sync

## Move Resolution Pipeline

1. **Pointer Up** (`Game.ts::handlePointerUp`)
   - Validates the drag distance and direction
   - Commits the move, sets `isResolvingMove = true`

2. **Apply Move** (`Game.ts::applyMoveAndHandleResults`)
   - Creates `currentMoveSummary`
   - Applies the initial `ExplodeAndReplacePhase`
   - Recursively processes cascades via `handleCascades`

3. **Move Summary**
   - `recordMatchesForSummary` tracks largest match size, categories, gem types, cascades
   - `applyMoveBonuses` converts summary into a multiplier (`moveMultiplier`)
   - `BackendPuzzle.addBonusScore` applies combo bonus delta

4. **Clue Rewards**
   - `revealCluesForCategory` fires 1 or 2 clues depending on match length
   - `revealAllCluesForCategory` handles 5+ matches and repeat-category bursts
   - Habitat clues reuse raster data via `generateRasterHabitatClue`

5. **HUD Update**
   - `onMoveResolved` registers the move (`BackendPuzzle.registerMove`)
   - `game-hud-updated` emits `movesUsed`, `maxMoves`, `streak` multiplier, and `moveMultiplier`
   - React SpeciesPanel shows `Moves: used/max`, `Streak`, and `Move Bonus`

## Combo Multiplier Rules

Configuration lives in `src/game/constants.ts`:

| Condition                              | Constant                    | Effect                                   |
|----------------------------------------|-----------------------------|------------------------------------------|
| 4-match in one move                    | `MOVE_LARGE_MATCH_THRESHOLD`| `MULTIPLIER_LARGE_MATCH`, 2 clues        |
| 5+ match in one move                   | `MOVE_HUGE_MATCH_THRESHOLD` | `MULTIPLIER_HUGE_MATCH`, all clues       |
| Multiple gem categories in one move    | —                           | `MULTIPLIER_MULTI_CATEGORY`              |
| Same category as previous move         | —                           | `MULTIPLIER_REPEAT_CATEGORY`, full burst |

Multipliers stack multiplicatively before rounding (`Math.round`) and are surfaced via both HUD text (`multiplierText`) and `GameHudUpdatedEvent.moveMultiplier`.

## Pause Overlay

- Created in `Game.ts::createPauseControls`
- Pause button lives top-right relative to board (`positionPauseButton`)
- `togglePause(true)`:
  - Stores `canMove` in `canMoveBeforePause`
  - Pauses tweens (`this.tweens.pauseAll()`)
  - Sets `this.time.timeScale = 0`
  - Shows overlay container and resume button
- `togglePause(false)`:
  - Restores time scale & tweens
  - Hides overlay, re-enables input if the move was idle

All pause UI elements are destroyed in `shutdown()` to prevent leaks.

## EventBus Contract (`src/game/EventBus.ts`)

```ts
type GameHudUpdatedEvent = {
  score: number;
  movesRemaining: number;
  movesUsed: number;
  maxMoves: number;
  streak: number;          // streak multiplier for early guesses
  multiplier: number;      // current streak multiplier (x1.00..x3.00)
  moveMultiplier?: number; // optional per-move combo multiplier
};
```

React consumers (e.g., `SpeciesPanel.tsx`) display the new fields and show a `Move Bonus` badge when `moveMultiplier > 1`.

## Key Touchpoints

- `src/game/constants.ts` – Tunables (`MAX_MOVES`, combo multipliers)
- `src/game/BackendPuzzle.ts` – `registerMove`, `getMovesUsed`, combo scoring
- `src/game/scenes/Game.ts`
  - `createPauseControls`, `togglePause`, `processMatchedGemsWithOriginalTypes`
  - `applyMoveAndHandleResults`, `applyMoveBonuses`, `revealCluesForCategory`
- `src/components/SpeciesPanel.tsx` – updated HUD rendering

## Testing Checklist

- [ ] Ensure move counter increments once per successful swap (cascades don’t double count)
- [ ] Match of 4 Gems → two clues emitted, `Move Bonus: x…` visible
- [ ] Match of 5 Gems → all clues for that category emitted
- [ ] Consecutive matches on same category → full clue burst on second move
- [ ] Pausing mid-cascade freezes animations and resumes cleanly
- [ ] `game-hud-updated` event shows expected `movesUsed/maxMoves` and multipliers
- [ ] Game over triggers after 50 moves with pause overlay hidden
