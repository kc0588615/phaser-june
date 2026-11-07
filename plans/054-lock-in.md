# 054: Lock in

Owner, 2026-11-06: pencil marks become a deduction. **Lock in** names the mystery from the player's own pencils, and a right one pays a bonus by how many cells and categories they called.

## Owner picks (2026-11-06)
- Lock in sits **beside** "It's this one!" (both stay).
- Bonus weight **by category**, a fixed table.
- A wrong pencil **subtracts** its weight (random pencilling must average 0; 045 rejected a reward for right guesses alone, "Call it").

## Rules (054-0, `src/clueGame/animalBoard.ts`)
- `lockInPick(state, pencil)`: unmarked, unreleased suspects; each cell is its shown answer, else its pencil, else unknown; checked against the camera's shown answers. Exactly one left, and at least one pencil on another unreleased animal's hidden cell: that one. Else null. Reads only what the player sees or wrote, never hidden answers. **But the button still concludes who fits** (it shows only when exactly one does, judging shown answers the player may not have marked yet): an exception to point-don't-conclude, like Auto rule-out. Owner to confirm (Codex review, 2026-11-06).
- `lockIn(state, pencil)`: `nameIt(state, pick, lockInBonus(...))`. Same stake as Name it: right finds (★, no move points), wrong loses (`wrong-name`). Sets `lockedIn: { bonus }` (0 unless found); the `named` log entry gets `lockedIn: true`.
- `lockInBonus`: each pencil on a still-hidden cell of an unreleased look-alike (the mystery's own cells would be free: its answers are the camera's). Right +weight, wrong -weight; net x distinct categories pencilled x 2; clamped to ±50 (`LOCK_IN_POINTS`). At -50 a find's star and bonus net 0 points, streak aside.
- `LOCK_IN_WEIGHT`: body 1 (seen in the photo), habitat 2, range 2, habits 3, life 3.
- `scoreRound` adds `lockedIn.bonus`. Version `054-0` (drops saved games).

### Why not a floor at 0, or a multiplier on gains only
The balance bot's `scribbler` (pencils every hidden cell at random, locks in when it can) averaged +14 bonus a find with a 0 floor, +10 with gains-only multiplied. A symmetric multiplier brings it to +4.7 / -1.4 (Africa / Asia; random moves, after the Codex fix).

Not zero by design, though: the bonus is zero-mean per random pencil, but **not given a find**. A pencil that rules a look-alike out disagrees with the camera, and on a look-alike that differs from the mystery that pencil is right; a find needs every look-alike out, so lucky finds lean positive (Codex: one shown body column, 32 fair pencillings, 5 lock in, the 1 find always +8). Random pencilling pays only on the finds it lucks into; its cost is the rounds it loses.

## UI
- Field guide footer (`SuspectSheet`): "Lock in my pencil marks" on its own row under Rule out / It's this one!, only in the guide of the animal `lockInPick` names. Asks first (`data-name-confirm="lock"`): one try; right adds a bonus for right marks on the other animals, wrong ones take away.
- Out-of-moves sheet: "Lock in my pencil marks: the X" above the list.
- Round end: "Locked in!" kicker; "pencil bonus (in the points)" stat (`data-lock-bonus`). Lost: "You locked in the X."
- How to play: a sentence in the Name it step; key `v5`.
- Pencils are saved with the game (the session is saved whole, `useAnimalSession.ts`), so a reload keeps them.
- `AnimalGame`'s `lockPick` hides camera answers until their gems land (`answerShown`), so the button never shows before the answer does. The rules re-check at lock in.

## Balance (bot, 400 rounds a place, seed 44)
| Player | Found Africa / Asia | Locked in | Bonus at a lock-in find | Points a round (no streak) |
|---|---|---|---|---|
| careful | 98 / 97% | - | - | 298 / 253 |
| locker (knows size, covering) | 98 / 95% | 48 / 57% | 3.0 | 161 / 118 |
| locker (knows all but range, life) | 99 / 99% | 89 / 80% | 22 / 17 | 91 / 100 |
| scribbler (random moves) | 58 / 56% | 81 / 81% | 4.7 / -1.4 | 32 / 27 |
| random | 20 / 20% | - | - | 10 / 10 |

- Lock in pays far less than playing the round out (a lock-in find is a name find: no move points, plan 053). A player who can finish on the board should; Lock in is for when they're sure early or stuck. **Owner call:** if Lock in should compete with board play, give it move points or a bigger cap.
- The scribbler finds 56-58% vs random's 20%: `lockInPick` reads the shown answers for it. Not yet compared with a fair baseline (Codex): a random mover with Auto rule-out who names the last unmarked animal. Todo.

## Checks
- E2E (`scripts/e2e.mjs`, after the rise section): Lock in hidden with 2 left; shown and asks first with 1 left; right with one right pencil: find, ★, bonus = weight x 2, in the round's points (50 + streak + bonus), card says "Locked in!" and the bonus (`08-lock-in-end.png`); a right and a wrong pencil in the same column: bonus 0; a look-alike locked in: lost, `wrong-name`, bonus 0.
