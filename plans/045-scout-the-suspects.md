# 045: Scout the suspects (hidden answers, shown by clears next to tiles)

On `main`, over the 044 animal board. Rules versions `045-x`. Written 2026-10-09; bot test 2026-10-09; built 2026-10-11 as rules `045-0` (uncommitted, not deployed).

## Problem

Owner, 2026-10-08: "it's boring just to have to get enough gems to reveal all the mystery traits." Diagnosis (Fable agent): every piece of information is free, certain and arrives on a timer. About 8 moves of waiting per answer; when a stamp lands the player compares 5 visible cells with no doubt and no cost; the board only matters for release, after the deduction; knowing animals or reading the field guide earns nothing, because the grid hands over all 20 suspect answers.

Rejected on the way: **Call it** (player calls hidden cells ✓/✗ for bonus gems, wrong costs moves). The game is turn-based, so reading the bio always beats guessing and 20 calls become homework (Codex review, owner 2026-10-09).

## The rule

- Each suspect's answers start as `?` in the evidence grid.
- A clear of a clue's color next to an **unmarked** tile shows that animal's answer to that clue. The gem still counts toward its order. (Next to a ruled-out tile the same clear releases it, as today.)
- Only the move's own clear scouts, not cascades: when cascades scouted too (bot test), random moves saw 16 of the 20 cells for free.
- Players may pencil their own ✓/✗ from what they know or see in the photo, and rule out on them. No feedback until round end. A wrong belief is a wrong mark, which can let the mystery escape (the 044 stake).
- During play the field guide hides the lines for the 4 dealt questions; photo, signs and other lines stay. Round end shows everything.
- Point, don't conclude: a shown cell is that suspect's own record, independent of the mystery and the marks.

## Bot results (2026-10-09)

`node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 400 --seed 4401 [--order N]`, Africa / Asia, found %. The "any clear" and payback rows came from bot flags since removed. New players: **novice** knows no trait on sight (scouting only), **careful** knows size and covering (stand-in for the photo), **expert** knows every trait. Bots reason only from shown or known cells.

| Setup | Careful | Novice | Expert | Reader | Guesser | Random | Careful moves left |
|---|---|---|---|---|---|---|---|
| 044 today (order 24, no scouting) | 95 / 95 | (95) | (95) | 77 / 68 | 20 | 0 | 13.8 / 11.5 |
| scout any clear, order 24 | 93 / 85 | 91 / 84 | 95 / 95 | 71 / 58 | 20 | 0 | 13.5 / 11.3 |
| scout any clear, order 20 | 94 / 87 | 90 / 85 | 98 / 96 | 74 / 71 | 20 | 0 | 15.0 / 13.2 |
| scout any clear, order 16 | 96 / 89 | 93 / 88 | 98 / 98 | 82 / 74 | 20 | 0 | 16.7 / 15.1 |
| scout any clear, order 12 | 94 / 91 | 92 / 86 | 99 / 98 | 83 / 78 | 20 | 0 | 18.2 / 16.7 |
| **moves scout, order 20** | **92 / 86** | **88 / 82** | **98 / 96** | **67 / 61** | 20 | 0 | 15.0 / 13.0 |
| moves scout, order 24 | 90 / 86 | 87 / 80 | 95 / 95 | 67 / 56 | 20 | 0 | 13.4 / 11.1 |
| moves scout, order 16 | 94 / 88 | 89 / 84 | 98 / 98 | 78 / 69 | 20 | 0 | 16.3 / 14.6 |
| any clear, order 20, payback row | 96 / 93 | 93 / 90 | 100 / 98 | 83 / 77 | 20 | 0 | 16.3 / 14.3 |
| any clear, order 16, payback row | 97 / 93 | 95 / 94 | 100 / 100 | 88 / 81 | 20 | 0 | 18.0 / 16.2 |

Reading it:
- **Random stays at 0, the blind guesser at 20** in every setup: scouting adds no way to win without reasoning.
- **Knowing animals now pays:** expert beats novice by 10-14 points with moves-only scouting at order 20 (4-11 with any-clear scouting). Under 044 knowledge is worth nothing.
- **Board skill matters more:** careful vs reader gap 25 points at moves-only order 20 (044 today: 18-27).
- Smaller orders shorten rounds but shrink the skill gap; any-clear scouting is nearly free (random sees 16 of 20 cells).
- **Payback** (a released animal leaves a row gem) makes everyone stronger and narrows the skill gap (reader 83-88%). Not recommended with these orders; retry only with bigger orders if rounds feel slow.

**Pick: moves scout, order 20.** Meets the targets (careful ≥85%, random 0%, guesser ≤22%, reader ≥20 points behind); Asia careful (86%) and novice (82%) are the weak spot. Star lines need moving: careful's moves left at the find, 20th/40th/60th percentile, are 10/13/17 (Africa) and 8/11/14 (Asia), against 8/12/15 and 6/10/13 today.

Bot limits: "knows" is all-or-nothing per trait; the bot never pencils a wrong belief, so it can't measure escapes from misremembering. That's the playtest's job.

## Owner decisions (2026-10-11)

- **Payback: dropped.** It helped the random-move reader most.
- **Pencil marks: in, built with scouting.**

## Built (2026-10-11, rules 045-0)

Bot on the final rules (seed 4401) matches the picked row: careful 92/86, novice 88/82, expert 98/96, reader 67/61, guesser 20, random 0, oracle 99.

- Rules (`animalBoard.ts`): `ANIMAL_RULES` 045-0, `scout: true`, orders of 20, stars at 8 and 14 moves left. `ClueOrder.seen` per suspect; `applyPhase` scouts on the move's own clear only, for unmarked tiles, and logs `scouted`; `stillPossible(book, state, knows)` judges only shown or known cells.
- Board (`BoardModel.ts`): `ExplodePhase.nearColors` (each touched tile with the colors cleared next to it), `previewNearColors`; the `gems-matched` event carries it (`ClueBoardScene.ts`, `EventBus.ts`).
- Session (`animalSession.ts`, `useAnimalSession.ts`): `nearColors` into the rules; `pencil` (per round, `${id}:${tag}` -> yes/no), never read by the rules.
- Grid (`EvidenceGrid.tsx`): hidden cells are dashed `?` buttons; a tap pencils yes, no, blank (`✓?`, `✗?`); no `data-yes` or screen-reader answer until scouted; a scouted answer pops in. The round-end card shows every answer.
- Field guide (`AnimalSheets.tsx`): "not scouted" (or your guess) for hidden answers; while playing, hides guide lines about the round's question traits (`Animal.guide` lines now carry their tags). How to play explains scouting and pencilling (key bumped to v2).
- Owner playtest 2026-10-11: pencil inside the field guide (✓? / ✗? beside each hidden answer; the guide stays open), and a long press (450 ms) on a grid row or a board tile opens that animal's field guide without picking it (`clue-board-tile-hold`; tile taps now fire on release). The field guide is a modeless, shorter drawer (`Sheet modeless`): the grid above stays tappable, so pencilling there keeps the guide open and another row switches the guide to that animal. The reload on the first tap was the dev server blocking live reload for the WSL 172.x address (`allowedDevOrigins` in `next.config.mjs`).
- Owner design pass 2026-10-12: the status line under the grid is gone (events go to a screen-reader live region only; back under the board in the layout pass below), and so is the Field guide button (long press opens the guide). The witness notes book sits in the grid's corner next to hearts and moves, shows the count once there is a note, and flashes once per new note (`.ev-flash`). Pencil marks are a plain light ✓ or ✗ in the dashed cell (no "?"). Each suspect's name: tap picks, hold opens the guide, drag its photo right along a short track (half the name's width) to rule out (again: back in); the ruled-out count rides on the Mystery "?" badge (✕2) so the grid never grows a line and the board keeps its size; a red track shows only while dragging, no pill background (owner, 2026-10-12: the full-width pill looked empty). Once ever, after how to play, the first animal's photo nudges right with "Slide to rule out →" (`critter-connect:slide-hint:v1`). Arrow keys and Shift+Enter for the keyboard. Note: `@theme inline` colors (e.g. `--color-notes`) have no runtime CSS variable, so keyframes use the literal.
- Status line: "🔍 The Okapi: Fur? Yes." per scouted answer; a one-time note on the first pencil mark a round.
- Layout pass 2026-10-12 (owner): on phones the board is capped at the screen's width (it is width-bound everywhere but the iPhone SE), so a tall phone's spare height no longer gaps around it. The status line is back, under the board, on phones at least 560px tall (`roomy`; the board shrinks for it on short phones, owner 2026-10-13: it carries the answers, and a big display size shouldn't hide it; was aspect <= 1/2, then height >= 100vw + 346px) and always from md; the evidence rows grow from 34 to 48px into what's left (`--ev-row`, globals.css; reserves the status line only when `roomy`, and the home bar; the round-end card keeps 34px rows). Dev server (WSL) can serve globals.css one save behind: check the served CSS (or save again) before trusting a measurement.
- Bot: `--scout on|off` (default from the rules), `--knows`; players novice and expert.
- E2E (`npm run e2e`, seed 7): 567/567 (with long press, the photo slide, pencilling in the guide and the grid under it, the corner notes book, and nothing covering the board on any move). New checks: all 20 answers start hidden; pencil cycles yes/no/blank and changes no rule; the field guide says "not scouted" per hidden answer; each move scouts exactly the answers next to unmarked animals in its own clear's colors; the grid shows exactly the scouted answers and no hidden one; the round-end card has no hidden cell.

## Next

1. `playtest` on a phone viewport: do kids pencil, does scouting read as a choice, how long are rounds.
2. Saving: `rules_version` 045-0 saves as before; pencil marks and scouting aren't saved (schema change needs owner approval).
3. Open: should scouting also work next to a ruled-out tile before it leaves? (Today a clear there releases it at once, so no.)
