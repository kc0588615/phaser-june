# 047: Ruled-out animals wander off

On `main`, over 044/045/046. Written 2026-10-17; revised after Codex review the same day. Owner go 2026-10-17. Steps 0–3 built 2026-10-17, uncommitted: the game runs 047-0 (wander + reward toy). Step 4: e2e 717/717 (per-move walk invariant, walked card survives reload); not yet covered: mid-move reload, targeted block/tie/toy-provenance cases. Playtest `docs/playtests/2026-10-17-wander.md`: works, short parade; copy and reward cue fixed, direction hint open. Codex review 2 (mid-tick call-back, deferred escape) fixed; e2e 717/717 without the escape exemption. Step 5 (docs) done 2026-10-17: paper §2.2, §2.5–2.6, §3, §4.5–4.6, §4.9; CLUE_MATCH; CONTEXT (Wander); how-to and field guide copy; playtest skill.

## Problem

Owner playtest: the order is scout answers (pencil), take the biggest matches, go for a purple witness gem, then rule animals out. The frustration comes at the end. The deduction is done, but releasing a ruled-out animal needs a clear right next to its card, and the gems don't land there. The paper agrees: a careful player knows the mystery about two moves before finding it (`docs/ANIMAL_BOARD_PAPER.md` §3). Those moves are luck, not reasoning.

## Rules (owner decisions 2026-10-17)

1. **Wander.** After each move, every ruled-out animal still on the board steps one cell the way it travels and leaves when it steps off the edge. Direction is thematic: fly goes up, dig and swim go down, walk goes to the nearer side (middle column: right, the side plan 046's exit animation already picks). `exitOf` moves from `useAnimalSession` into pure shared code so the bot and the browser sort bats and swimmers the same way. The direction is fixed when the card is marked; re-marking after a call-back picks it again from where the card stands. A step swaps the card with the gem in that cell; a toy there just moves, it never goes off.
2. **Both rules stay.** A clear next to a ruled-out card still releases it at once (a shortcut, no longer the only way).
3. **Toy reward.** A release by a run from the player's own swap leaves a toy. Not a cascade, a toy blast or a step: the board reports run-adjacent pins separately, since `nearColors` also counts first-phase toy blasts. The toy goes on the freed cell once the whole move has settled (deferred, so it can't be fired or moved by that move's cascades or falls). If a card or a witness gem stands there by then, no toy (a witness never carries a toy; Codex review 2, kept by choice). If a toy is already on that gem, it's replaced.
4. **Call it back.** Unmarking stops the walk; the card stays where it is. Marks stay reversible until the animal leaves.
5. **Middle ground on escape.** A ruled-out mystery escapes, and the round is lost, when it walks off the edge **or** when any clear touches it (as today). The walk gives time to rethink; a touch does not.
6. **Moves stay at 30.** Tune later from bot numbers.

Points, never concludes: every marked card walks the same way, mystery or not, so the walk tells nothing about who the mystery is.

## The tick (one valid move)

A rejected swap is not a tick: no steps, no move used.

1. The player's swap and its cascades, as today. Releases happen at once (cards come off the board), but the round doesn't end yet.
2. Snapshot the walkers: marked, still on the board, in order nearest-its-edge first, ties by suspect id. Each one tries one step, in that order; skip any already released.
3. Each step resolves fully before the next one: the swap, its cascades (they release, never scout), and a walk-off unpins and refills at once.
4. Put down deferred reward toys (rule 3).
5. Decide the round, once (`endOfMove`, for found and escape alike; Codex review 2): escaped (the mystery left by a clear or a step) beats found (every look-alike gone) beats out of moves. So steps still happen on move 30, and score/trail are counted once, after this. Exactly one move used.

Today `applyPhase` sets found/lost on the spot and later phases are ignored, and `animalSession.advance` scores at once; both move to step 5.

Marks made during the animation apply at the next tick: the controller snapshots marks at step 2. A card called back after the snapshot still takes its step; if that takes it off, the rules re-mark it and release it, as they already do for a clear's release (Codex review 2).

## Open (decide while building)

- **Blocked step** (another card in the way): default: wait a turn. An unmarked card in the way can hold a walker for good; the bot reports how often.
- **Long walks.** A flyer in the bottom row is 6 steps from the top row and 7 to leave the 7×7 board. Default: accept it, and see what the bot says before using speed by travel style or nearest edge.
- **Which toy.** Default: a line gem along the direction the animal travelled.
- **Seeing the way.** A small arrow or paw prints on a marked card showing its next step. Owner 2026-10-17: not adding it.
- **Idle hint.** Unchanged for the first comparison; revisit from bot numbers.
- **Nudge.** Swiping a walking card still wiggles it (plan 046 step 1).

## Steps

0. **Pure core behind a flag.** `AnimalRules` gets `wander` (steps) and `wanderToy` (reward), both off in 045-0. `BoardModel`: `stepPin(id, dir)` swaps the pin with the gem there (a toy rides along, never fires), returns the phases its matches make, and a step off the edge unpins. Run-adjacent pins reported apart from blast-adjacent ones. Shared `travelOf(tags, taxonOrder)` replaces `exitOf`. `animalBoard.ts`: the tick above, with one terminal decision; log `wandered` / `released` / `blocked`. With both flags off, 045-0 behavior and the existing tests stay byte-identical. Update the "never move" comments (`BoardModel` line 5, `BoardController` line 7).
1. **Bot.** `scripts/balance-044.ts` drives the same core. Baseline = 045-0 (both flags off); compare 047-0 on the same content, deals and settings, with player randomness seeded per deal so runs pair up. Report win rate for each player type, moves used, the Reader/Careful gap, out-of-moves losses, guesser wins, releases caused by reward toys (not toys made), blocked turns, and the tail: moves from "only the mystery still fits" to the round's end. Careful under wander: marks as today, takes a release when a move offers one, else plays for answers; drop its pull toward marked cards. Reader stays random moves. Record content revision, commands and output in the plan. Go/no-go from the owner.
2. **Wiring.** `BoardController` runs steps 2–4 after its cascade loop (it already calls `unpin` there), reading marks and directions from `ClueBoardScene` state; new `EventBus` events for a step and a decided tick; `useAnimalSession` / `animalSession` take the decided round once. `savedGame.ts`: save rules and board together only when a tick has settled (marks between moves too), with pin cells and fixed directions; setup restores pins from the save, not the deal's tile cells. Resume stays approximate as today (refills come from the board seed, not the saved RNG position); exact continuation is not a goal.
3. **View.** `BoardView`: a step animates the way the animal moves (flap up, burrow down, waddle sideways); leaving reuses `BoardPin.exit`; the call-back is the cross coming off and the card settling. Reduced motion: slide. Screen reader: one `clue-board-announce` line a move ("Zebra walks left", "Zebra wandered off").
4. **Check.** `npm run e2e`: replace the "tiles never move" check (`scripts/e2e.mjs` ~520). Invariants: one step per valid move and none on a rejected swap; an unmarked card never moves; fixed direction, call-back and re-mark; follower/blocked/tie order; a moved toy is kept; reward only from the player's own run, never fired the same move; step cascades never scout; last look-alike + mystery leaving on the same tick (also on move 30) is an escape; score and round end happen once; model, view and pins agree. Resume: reload with a moved card still on the board, and a reload mid-move. Replay the same actions twice and compare per-move snapshots; keep the report and screenshots. Then a playtest (`playtest` skill): does the end of a round feel like a parade, and does anyone use the call-back?
5. **Docs.** `ANIMAL_BOARD_PAPER.md` §2.5, §2.6, §4.6 (and the bot table in §3); `CLUE_MATCH.md`; "wander" in `CONTEXT.md`; any in-game help copy.

## Bot results (step 1, 2026-10-17)

Revision af710655 plus step 0. 400 rounds a place, setup seed 44, player rng seeded per deal (so 045-0 numbers differ a little from plan 045's).
`node scripts/run-typescript.mjs scripts/balance-044.ts` (045-0), `... --wander on` (047-0), `... --wander on --toy off`.

| Africa / Asia | 045-0 | 047-0 | 047-0, no toy |
|---|---|---|---|
| Careful found | 91 / 84% | 95 / 91% | 94 / 88% |
| Novice found | 89 / 79% | 92 / 87% | 91 / 85% |
| Expert found | 98 / 96% | 100 / 100% | 99 / 100% |
| Reader found | 71 / 59% | 84 / 78% | 83 / 76% |
| Reader/Careful gap | 20 / 25 pts | 11 / 13 pts | 11 / 12 pts |
| Guesser found (escaped) | 18 / 18% (82%) | same | same |
| Oracle found | 99 / 100% | 100 / 100% | 100 / 100% |
| Careful ★★★ | 54 / 38% | 68 / 46% | 61 / 42% |
| Careful moves left at find | 15.3 / 12.8 | 16.7 / 13.9 | 16.1 / 13.3 |
| Careful moves from identified to found | 2.2 / 1.9 | 1.3 / 1.4 | 1.4 / 1.4 |
| Careful out of moves once identified | 3 / 4% | 0 / 0% | 0 / 0% |
| Careful walked off a round | - | 0.7 / 0.7 | 0.8 / 0.7 |
| Careful blocked steps a round | - | 0.0 / 0.0 | 0.0 / 0.0 |
| Careful reward toys a round | - | 2.4 / 2.4 | - |
| Careful releases by a toy's clear a round | 0.3 / 0.4 | 0.5 / 0.5 | 0.3 / 0.4 |
| Reader walked off a round | - | 1.9 / 1.6 | 1.9 / 1.6 |

Reading: the end-of-round luck is gone (no careful player runs out of moves once they know the answer; ~1 fewer move to the find). The guesser stays at the blind floor, so wandering adds no free wins. The cost: the Reader/Careful gap halves (board skill counts half as much), because random movers no longer need luck to release. Careful still releases mostly by aiming (2.4 releases a round by its own run, 0.7 walk off). The reward toy adds little (+0.1–0.2 toy releases, +3–4 pts careful, more ★★★). Blocking never happens with 5 tiles. Star lines would move up about 1–2 moves if kept at today's share (owner: keep them).

Rerun after Codex review 2 (escape decided at move end), `--wander on`: careful 95 / 91% (★★★ 67 / 46%), novice 93 / 87%, reader 85 / 78%, guesser 18%, expert and oracle 100%; walked off, reward toys and out of moves once identified unchanged.
