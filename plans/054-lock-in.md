# 054: Pencil bonus (built first as Lock in)

Owner, 2026-11-06: pencil marks become a deduction. A right name pays a bonus by how many cells and which categories the player pencilled; harder categories and more of them pay more.

## Owner picks
- 2026-11-06: weight **by category**, a fixed table; a wrong pencil **subtracts** (random pencilling must not pay; 045 rejected a reward for right guesses alone, "Call it").
- 2026-11-07: a big pencil bonus earns a **second star** and a **badge on the animal's journal page** (Sharp eye).
- 2026-11-07, after a playtest: no separate Lock in button. **Merged into "It's this one!"** (plan 053): the player picks the animal; the rules never work out who's left. Scored **once an animal is ruled out**, with any number still in, and **naming with more still in pays more**.

## Rules (054-1, `src/clueGame/animalBoard.ts`)
- `nameIt(state, id, pencil)`: as 053; a right name sets `pencilBonus` (null otherwise).
- `pencilBonus(state, pencil)`: null until an animal is ruled out (marked or released), or with no pencil counted. Counts each pencil on a still-hidden cell of an unreleased look-alike (the mystery's own cells would be free: its answers are the camera's). Right +weight, wrong -weight; net x distinct categories pencilled x animals still in (the named one too) x 2; clamped to ±50 (`PENCIL_POINTS`). At -50 a find's star and bonus net 0 points, streak aside.
- `PENCIL_WEIGHT`: body 1 (seen in the photo), habitat 2, range 2, habits 3, life 3.
- `scoreRound` adds `pencilBonus`. Version `054-1` (drops saved games).
- `sharpEye(state)`: a right name with a bonus of 20 or more (`PENCIL_POINTS.sharpAt`) from **at least 4 counted pencils** (`sharpPencils`, 054-1) and **no counted pencil wrong** (`round.sharp`, set at the name). `starsFor` gives a name find 2 stars then (+50 points). Still under board play: a name find tops out at 100 + 50, a ★★ board find is 100 + 80 or more.
- 054-1 (Codex second review): **the multiplier is the fewest animals still in this round** (`round.fewestIn`, set by `mark`; releases only take marked animals), so ruling out four and taking three back no longer pays x4. The "one is out" gate counts a mark ever made. And **Sharp eye needs 4+ pencils**: one coin-flip pencil in a weight-3 question with 4 still in is ±24, so half of right names earned it (+50 star, no matching loss; a right name averaged 75 points vs 50). The bot's `dabbler` (a few random cells in the highest-weight questions, one animal out, a random name) reproduces it: 8% of rounds (~40% of its finds) under the old rule, 0% now with 1, 2 or 4 pencils; a locker that knows most traits still gets it on 13-21%.
- Why no wrong pencil: with only the 20 line, the bot's scribbler (random pencils) got Sharp eye on 13-16% of rounds, about half its finds, from the bonus's swings; the careful locker got 0%. With it: scribbler 0-1%; a locker that knows most traits 30-43%.

### Why symmetric, no floor
With a floor at 0, or with only gains multiplied, random pencils paid (+14 and +10 a find). Symmetric, they're noise around 0. Not exactly 0 at a find, though (Codex): a pencil that rules a look-alike out disagrees with the camera, and on a look-alike that differs from the mystery it's right. Random pencils pay only on finds they happen into; the cost is the rounds lost.

### Why not Lock in (the first build)
Lock in named the one animal the pencils and shown answers left. Codex: the button showing at all concluded who fits (point-don't-conclude). The playtest: pencils that ruled out every animal left no button and no hint why, and ✓ read as "matches the camera" rather than "yes". Letting the player pick avoids both.

## UI
- "It's this one!" ask: adds "plus a bonus for your pencil marks on the other animals: right ones add, wrong ones take away" when it would score (an animal out, a pencil on another's hidden cell). Reads only the player's marks and pencils.
- Round end: "pencil bonus (in the points)" stat (`data-pencil-bonus`) when scored; "🎯 Sharp eye! A badge for its journal page." (`data-sharp-eye`).
- Field Journal: `JournalEntry.sharpEyes` (count) per animal, "🎯 Sharp eye ×N" (`data-sharp-eyes`). On the device only: the server journal has no badges; the signed-in merge keeps the local count. A bad count is dropped on parse, not the animal.
- How to play: a sentence in the Name it step; key `v5`.
- Pencils are saved with the game (the session is saved whole), so a reload keeps them.

## Balance (bot, 400 rounds a place, seed 44)
| Player | Found Africa / Asia | Named early | Bonus at a find | Points a round (no streak) |
|---|---|---|---|---|
| careful | 98 / 97% | - | - | 298 / 253 |
| locker (careful, pencils size and covering right, names once sure) | 98 / 95% | 95 / 92% | 3.1 | 50 / 49 |
| autoguess (random moves, Auto rule-out, names one still in at random once one is out) | 34 / 36% | 100% | - | 17 / 18 |
| scribbler (autoguess + random pencils everywhere) | 35 / 31% | 100% | 4.2 / -2.6 | 19 / 15 |
| random | 20 / 20% | - | - | 10 / 10 |

- Random pencils add about nothing over the same blind play (scribbler vs autoguess).
- Naming early pays far less than playing the round out (a name find gets no move points, plan 053). **Owner call:** if pencilling should compete with board play, give a name find move points or a bigger cap.

## Checks
- E2E (`scripts/e2e.mjs`, after the rise section): one right pencil and 1 out: bonus = weight x 4 still in x 2, in the points (50 + streak + bonus), shown on the card (`08-pencil-bonus-end.png`); 3 out: x 2 still in; a right and a wrong pencil in one column: 0; nobody out: no bonus, the ask doesn't mention it; a look-alike named: lost, no bonus; taken back (3 out, 2 brought back): the multiplier stays 2 (054-1); Sharp eye (every look-alike's first two cells pencilled right, 1 out): bonus 50, 2 stars, 100 + streak + 50 points, the card's badge line, `sharpEyes` + 1 in the journal and the badge in the Field Journal (`09-journal-sharp-eye.png`). Every other scenario, a single pencil too: no badge.
