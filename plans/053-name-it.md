# 053: Name it

Owner, 2026-10-31: players get one guess a round, any time, so a player who knows can just say so. Wrong ends the round and costs a heart. Out of moves, a right name also finds it (no heart lost).

## Rules (053-0)
- `nameIt(state, id)` (`src/clueGame/animalBoard.ts`) replaces `nameAtTimeout`. Allowed while playing or out of moves, on an animal still on the board. Right: `found`. Wrong: `lost`, `lostBy: 'wrong-name'`. Out of moves, `null` (skip): lost. Ignored while a move's end is pending (mystery or every look-alike already gone), so a name never overrides the board.
- A find by name: ★ only, 50 points plus streak, no points for moves left. A lucky early name must not pay like board play (owner pick).
- One try: any name ends the round.
- Bumps `version` (drops saved games) and the how-to key (shows the new step once).

## UI
- Field guide footer: "It's this one!" beside Rule out (not on a ruled-out or released animal). Asks first: "One try only. Right, and you find it (★). Wrong, and the round is lost." Back / Yes.
- Out-of-moves sheet: same list; copy says a right name finds it.
- Round end: "Named it!" kicker on a find by name; "Wrong animal" on a wrong one.

## Balance
The floor moves from 0% (random never marks) to about 20% for anyone naming blind; the guesser already sat at 18-22%. Trail success for a blind namer stays about 6% (one in five rounds, three hearts). 
Bot, 400 rounds a place, seed 44, vs the paper's 047 numbers (bots name only when moves run out, from what they've worked out; random at random):

| Player | Found Africa / Asia before (047 paper) | Found 053-0 | Trails finished 053-0 |
|---|---|---|---|
| careful | 96 / 92% | 98 / 97% | 100% |
| reader | 85 / 78% | 94 / 90% | 100% |
| guesser | 18% | 18% | 5% |
| random | 0% | 20% | 6% |
| oracle | 100% | 100% | 100% |

Thinkers who run out of moves after working it out now find it (★): careful +2-5 points, reader +9-12. The reader/careful gap shrinks to 4-7 points, so board skill shows almost only in stars (careful ★★★ 69 / 48%, reader 40 / 24%). Blind play stays at the one-in-five floor, and a trail is still out of reach (5-6%).
