# 054: Lock in

Owner, 2026-11-06: pencil marks become a deduction. **Lock in** names the mystery from the player's own pencils, and a right one pays a bonus by how many cells and categories they called.

## Owner picks (2026-11-06)
- Lock in sits **beside** "It's this one!" (both stay).
- Bonus weight **by category**, a fixed table.
- A wrong pencil **subtracts** its weight (random pencilling averages 0; 045 rejected a reward for right guesses alone, "Call it").

## Rules (054-0, `src/clueGame/animalBoard.ts`)
- `lockInPick(state, pencil)`: unmarked, unreleased suspects; each cell is its shown answer, else its pencil, else unknown; against the camera's shown answers. Exactly one left: that one; else null. Reads only what the player sees or wrote, so the UI may show it (doesn't break point-don't-conclude: it's the player's own reasoning).
- `lockIn(state, pencil)`: `nameIt` on the pick. Same stake: right finds (★, no move points), wrong loses (`wrong-name`). Sets `lockedIn: { bonus }` (0 unless found).
- `lockInBonus(state, pencil)`: every pencil on a still-hidden cell of an unreleased suspect; right +weight, wrong -weight; more distinct categories right pays more; floor 0; capped below board play's ★★★ (plan 053: a lucky name mustn't out-pay the board). **Owner writes the formula.**
- `LOCK_IN_WEIGHT`: body 1 (seen in the photo), habitat 2, range 2, habits 3, life 3.
- `scoreRound` adds `lockedIn.bonus`. Version `054-0` (drops saved games).

## UI (todo)
- Field guide footer: "Lock in" beside "It's this one!", disabled unless `lockInPick` gives one ("Pencil more to narrow it to one"). Asks first, as Name it: names the animal it will pick, "One try only."
- Out-of-moves sheet: Lock in there too.
- Round end: "Locked in!" kicker; bonus line ("Pencil bonus +N: 5 right, 1 wrong, 3 kinds").
- How to play: one line on Lock in; bump the how-to key.
- Pencils stay unsaved (045); a reload mid-round loses them, as today.

## Balance (todo)
- `scripts/balance-044.ts`: a "pencils what it knows, then locks in" player, beside careful/reader/guesser/random. Check: random pencil + lock in stays near the 20% blind floor with ~0 bonus; a knower's lock in total stays under careful ★★★.

## Checks (todo)
- E2E (`scripts/e2e.mjs`): Lock in disabled with 0 and 2+ left; right lock in finds with the bonus on the round-end card; wrong one loses; a wrong pencil lowers the bonus.
