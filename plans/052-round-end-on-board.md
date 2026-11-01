# 052: Round end on the board

Branch `agent/round-end-on-board`. Written 2026-10-31 from owner review of the success sheet.

## Problem

The round-end card (`RoundEndSheet`, `src/components/animalBoard/AnimalSheets.tsx`) is a near-full-screen drawer that redraws a second, smaller evidence grid behind an Evidence / Field notes tab switch. The player loses sight of the grid they just worked on, and field notes are a long wall behind a tab.

## Decision (owner, 2026-10-31)

Reuse what players already know: the field guide drawer (`SuspectSheet`, `top` prop) rises only to the board's top edge. The round-end card does the same.

1. **The live grid becomes the replay.** After the Camera row lands on the mystery's row, the game's own `EvidenceGrid` switches to `review` (every answer shown, red where an answer rules an animal out, the mystery's row outlined, wrong guesses crossed out). The Camera row slides back up to show its answers. Taps on the grid are off while reviewing.
2. **The card covers the gem board only.** No copy of the grid, no tabs. Body: photo + name (bigger, pops in with the stars on a find), family tree, compact stats (number first, labels read as a sentence), the grid key, then field notes as a plain list. Footer: Next animal / New trail.
3. **Header fix:** "1 moves" -> "1 move".

## Not in this step

- Field notes carousel (earlier review idea): only if the list still feels long on a phone.
- `OutOfMovesSheet` anchored to the board top too.
- Plan 050 step 1's "why" list goes in this card above the grid key (there's no Evidence tab now).

## Check

`npm run e2e`: the round-end checks now read the review grid on the game screen (`table[aria-label="How the evidence lined up"]` is the live grid). Screenshots at 390 and a short phone (375x667).
