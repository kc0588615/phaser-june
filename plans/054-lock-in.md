# 054: Pencil bonus (built first as Lock in)

Owner, 2026-11-06: pencil marks become a deduction. A right name pays a bonus by how many cells and which categories the player pencilled; harder categories and more of them pay more.

## Owner picks
- 2026-11-06: weight **by category**, a fixed table; a wrong pencil **subtracts** (random pencilling must not pay; 045 rejected a reward for right guesses alone, "Call it").
- 2026-11-07, after a playtest: no separate Lock in button. **Merged into "It's this one!"** (plan 053): the player picks the animal; the rules never work out who's left. Scored **once an animal is ruled out**, with any number still in, and **naming with more still in pays more**.

## Rules (054-0, `src/clueGame/animalBoard.ts`)
- `nameIt(state, id, pencil)`: as 053; a right name sets `pencilBonus` (null otherwise).
- `pencilBonus(state, pencil)`: null until an animal is ruled out (marked or released), or with no pencil counted. Counts each pencil on a still-hidden cell of an unreleased look-alike (the mystery's own cells would be free: its answers are the camera's). Right +weight, wrong -weight; net x distinct categories pencilled x animals still in (the named one too) x 2; clamped to ±50 (`PENCIL_POINTS`). At -50 a find's star and bonus net 0 points, streak aside.
- `PENCIL_WEIGHT`: body 1 (seen in the photo), habitat 2, range 2, habits 3, life 3.
- `scoreRound` adds `pencilBonus`. Version `054-0` (drops saved games).

### Why symmetric, no floor
With a floor at 0, or with only gains multiplied, random pencils paid (+14 and +10 a find). Symmetric, they're noise around 0. Not exactly 0 at a find, though (Codex): a pencil that rules a look-alike out disagrees with the camera, and on a look-alike that differs from the mystery it's right. Random pencils pay only on finds they happen into; the cost is the rounds lost.

### Why not Lock in (the first build)
Lock in named the one animal the pencils and shown answers left. Codex: the button showing at all concluded who fits (point-don't-conclude). The playtest: pencils that ruled out every animal left no button and no hint why, and ✓ read as "matches the camera" rather than "yes". Letting the player pick avoids both.

## UI
- "It's this one!" ask: adds "plus a bonus for your pencil marks on the other animals: right ones add, wrong ones take away" when it would score (an animal out, a pencil on another's hidden cell). Reads only the player's marks and pencils.
- Round end: "pencil bonus (in the points)" stat (`data-pencil-bonus`) when scored.
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
- E2E (`scripts/e2e.mjs`, after the rise section): one right pencil and 1 out: bonus = weight x 4 still in x 2, in the points (50 + streak + bonus), shown on the card (`08-pencil-bonus-end.png`); 3 out: x 2 still in; a right and a wrong pencil in one column: 0; nobody out: no bonus, the ask doesn't mention it; a look-alike named: lost, no bonus.
