# 044: The animal board (mark and release the look-alikes)

Branch: `variant/044-animal-board`, cut from `variant/043-literal-gems` so it keeps the 043 gem art and board. `main` keeps rules 041-5; `variant/043-literal-gems` keeps 043-0. Rules versions `044-x`.

History: written 2026-09-30; revised after the Codex review (pinned tiles, set-first deal, bot metrics); revised again after the Fable review and the owner's decisions (mark to release, witness notes, long Candy Crush-style rounds, no net). Both reviews and the decisions are at the end.

## Problem

Owner, 2026-09-30: random play must not solve rounds; players should have to play smart. Codex and an Opus agent both measured 043-1 (only your own match earns charges, one guess, best lead, 8×8, 6 moves): careful 94-95%, random 41-45%. The owner wants a different system instead.

The root cause in every version so far: **the game does the reasoning.** Any match asks a question and every answer crosses animals out by itself. The new system hands the reasoning to the player and makes a wrong conclusion cost the round.

## The game

**Story.** Neutral, so it hints at nothing: "Our camera trap caught a blur. It was one of these five." Five suspect cards sit above the board; the game has secretly picked one as the mystery.

**The board.** 7×7 (8×8 if the bot wants it). The five suspects are **animal tiles**: a photo in a round frame with a thick light rim, clearly not a gem. Tiles are **pinned**: they never move, never match and can't be swapped; gems fall past them (behind the frame). The other cells hold five gem types: **four clue gems** and the **pebble**, plus the rare **witness gem**.

**Clue orders (long rounds, like Candy Crush).** Each clue gem is one yes/no question about the mystery, drawn as its picture, with the question's exact words on its order tile: a fly for "Eats mostly bugs?", a fur tuft for "Covered in fur?", a moon for "Out at night?", a cactus for "Lives in desert?". Each clue is an **order**: collect its gems (say 8 flies, from runs, toys and cascades alike) and its answer is stamped on the tile (✓ yes, ✗ no). Words keep their qualifiers ("mostly"): a chimpanzee eats some insects, so "Eats bugs?" would teach a false rule. **Answers never cross anything out.** After its answer, a clue's gems still match but collect toward nothing.

**Pebbles.** A plain gem that matches and collects nothing.

**Witness gem** (the old note gem, kept): rare; collected by a match next to it. It shows one hand-written clue from the mystery's profile with the naming words blanked, and how many suspects' field guides agree: "It digs into ant nests and termite mounds with its strong, spade-like claws. **The field guides of 2 of the 5 say this too.**" Working out which two is the player's job. Only notes whose tags fit 2 to 4 of the 5 suspects are used: a note fitting only the mystery would solve the round, and a note without tags says nothing. The count is from the field guides' records (an untagged trait counts as not recorded), and the wording says so. Collected notes stay readable in the notes list.

**Signs.** During play, each suspect's card and field guide list its **signs**: the open tags its field guide records, as short phrases (digging claws, raids termite mounds, walks on knuckles). They never show the hand-written sentences: a witness note would match one word for word. Most tags read fine with spaces for underscores; Part 3 adds a phrase list for the awkward ones.

**Marks.** Tap a suspect card and choose **Rule out** to mark it; tap again to unmark (until it's released). Marking is free and instant. **Only marked animals can be released.**

**Releasing.** A marked animal is released (it hops off the board) when **any gem next to it** (up, down, left or right) is cleared: by your run, a toy, a cascade or a color gem. Unmarked tiles are never released, so nothing escapes by a stray swipe; every loss comes from a wrong conclusion. A released tile's cell becomes an ordinary cell and fills like any other.
- **Release the mystery and it escapes:** the round is lost, even if the same clear released every look-alike.
- **Release preview:** after the first tap (or while dragging), marked tiles this swap's own clear would release are outlined. Cascades may release more.

**Winning.** Release all four look-alikes: the last animal on the board is the mystery, **found**. There is no net and no early tag.

**Out of moves** with more than one animal left: the round is **lost** (a heart). You may still name it: a right name records the animal in your journal (learning still counts), but saves no heart and earns no star. Blind naming wins 1 time in 5 whatever the board does, so it can't be what saves a heart.

**Moves and stars.** Rounds are long: about 20-30 moves (the bot tunes moves and order sizes). ★ found; ★★ and ★★★ at moves-left thresholds the bot sets so careful players earn ★★★ in about 40% of rounds. Points: 50 per star, 10 per move left, plus the streak.

**The trail.** A session is a trail of **5 rounds** from the continent with **3 hearts**; each lost round costs one; it ends after round 5 or at the third loss. **Trail success** = finishing all 5 rounds with a heart left (3 or more finds). For a player who finds with chance p each round: p = 0.2 gives 5.8%, p = 0.85 gives 97.3%. With long rounds a trail takes a while; the trail and journal save between visits.

## How a round starts

1. **Suspect set first** (`pickSuspectSet`): a seed animal from the place plus its 4 closest look-alikes (most shared traits, relatives first). **Substitution:** a candidate is skipped for the next look-alike when, with it in, some two suspects would answer every full question alike. Only two pairs of today's 76 can never be told apart: the Dyeing Poison Dart Frog and the Golden Poison Frog, and the Saola and the Sumatran Orangutan (their records barely overlap). Many more pairs can't be told apart inside a particular set, when another suspect lacks a record for the trait that would split them (the two long-beaked echidnas differ only on shrubland and Melanesia); the rule checks the whole set. Without it, the Fable review found no valid deck for 11 of 20 Asia sets, 4 of 26 Africa, 3 of 14 South America and 29 of 76 world. With it, every seed makes a set except 8 frogs in whole-world play (Part 1 results).
2. **Clue deck** (`dealClues`), from the set only: 4 questions where **every suspect has a record** (a full yes/no table), and the 5 suspects' answer rows all differ. Five distinct rows always have a separating set of 4 or fewer questions. Ties break on a hash of the set's sorted ids. Prefer clues with different splits and a mix of strong (2/3) and weak (1/4) ones, so which order to chase first matters.
3. **Witness notes:** the mystery's hand-written clues whose tags fit 2-4 suspects, in profile order.
4. **Mystery last:** chosen uniformly among the 5. The deck and the board depend only on the set, so they can't hint at it (a test checks it, Part 1).
5. **Board** (`newAnimalBoard`, seeded from the set): tiles at least 3 apart (Manhattan) and never in a corner; no ready-made matches; at least one valid move.

## Why random play fails, and what smart play needs

- **A player who never marks never finds** (0%, by rule). A player who marks at random wins 1 time in 5 at best, and the trail compounds it: 5.8% trail success.
- Smart play needs three things: **which order to chase** (the clue that splits the suspects best, while the board offers it), **who the answers and notes rule out** (the player's job), and **getting clears next to marked tiles** while finishing the orders within the moves.
- Difficulty comes from reasoning and the move budget, not from hiding information: closer look-alikes and fewer moves for older players; easy mode can give 4 suspects later.

**Helping kids reason without doing it for them:**
- **Trait chips:** each suspect card shows that animal's own answer to every clue (the Hirola: fur ✓, mostly bugs ✗), clearly apart from the mystery's answers on the order tiles. Comparing them is the player's job.
- **Release preview** (above) shows consequences, never safety.

## Review instead of the family tree

The reveal card keeps the photo, family tree, range map and sources, and shows the field notes not used in play. An optional recall question ("Which group is it in?" with three choices from the family tree) gives a small streak bonus; **Skip** is always there and costs nothing.

## Removed from gameplay

Charges, the question sheet and spend panel, family tree steps, the last chance, 12 candidates, auto cross-out, wrong guesses that only cost moves, and the net (owner: too hard to engineer).

## Build order

### Part 1: rules, board and bot (no UI)

1. Branch `variant/044-animal-board` from `variant/043-literal-gems`.
2. **`src/game/BoardModel.ts`: pinned tiles.** The grid is `GemType[][]`, `canSwap` allows any swap that matches, gravity and `shuffle` move gem/toy pairs, so it has to change:
   - an `animals` layer (suspect id or null) beside `toys`; an animal cell holds no gem;
   - matching treats tile cells as breaks; swaps touching a tile are refused;
   - gravity compacts each column's gems past tile cells; refill fills non-tile cells;
   - `shuffle` keeps tiles where they are and shuffles gems and toys among the other cells (bounded tries, then fresh gems), never moving, copying or spawning an animal;
   - `commonestColor`, color-gem targets and `loadBoard` skip tile cells;
   - each phase reports, per tile, whether a gem next to it was cleared (`touched`); the rules decide what a touch does (marked: released);
   - cascade blasts leave tile cells alone;
   - with no animals, every 041/043 behavior is unchanged (the existing board tests must pass as they are).
   - New board tests (board invariants, allowed by AGENTS.md): tiles keep their cells through gravity, cascades and shuffle; one copy of each surviving animal; a cascade blast through a tile cell; touches from runs, toys and color gems.
3. **`src/clueGame/animalBoard.ts` (pure):** `pickSuspectSet`, `dealClues`, `witnessNotes`, round state (suspects, orders with counts and answers, marks, released, moves, notes), `applyPhase` (collect, answer, release marked touched tiles, escape), `mark`, `nameAtTimeout`, `scoreRound`, `trail`. Terminal timing: once a round is found or lost, later phases change nothing (no second heart). Reuse `questionMatch.ts` for traits and question text; leave the 041/043 rules untouched.
   - Rules tests: a clear releasing the mystery and every look-alike is a loss; unmarked tiles are never released; for one suspect set, the deck and board are identical whichever suspect is the mystery; every dealt deck has a full table with 5 distinct rows; a witness note's count matches the suspects' tags.
4. **`scripts/balance-044.ts`.** Separate RNGs for setup, board and each player's choices; tune on one setup seed, report on a held-out one. Players may preview a move's first clear, never future refills or answers not yet earned.
   - **careful:** chases the order whose clue best splits the suspects it hasn't ruled out; marks what answers and notes rule out; then aims clears next to marked tiles.
   - **reader:** reasons and marks like careful, but moves at random: what board planning is worth.
   - **guesser:** marks four suspects at random, then plays like careful: the blind floor (about 20%).
   - **random:** random moves, never marks (0% found by rule); names at random at the end (journal only).
   - **solver (diagnostic only):** may see future refills; an upper bound, never a player.
   - Report per round: identified (careful knows the answer), found, ★★★, escapes, lost at timeout, moves left, moves after identification, orders filled, notes collected, toys made. Count rounds where no full finish was possible within the moves (from the solver). Per trail: success and finds. Per place. 400 rounds is about ±3.5 percentage points near 15% or 85%; give intervals. Save the worst seeds with their move traces to replay.
5. **Tune only:** moves (15-30), order size, board (7×7 or 8×8), witness gem rate, tile spacing.

**Targets (percentage points, held-out seed, 400 rounds a place):** careful found ≥ 85% and ★★★ about 40%; reader at least 20 points under careful (board play matters) but ≥ 50% (fair); guesser ≤ 22%; random 0%; trail success careful ≥ 90%, guesser ≤ 8%. If careful misses, check the solver first: a round with no possible finish is a board problem (moves, order size, 8×8); a round the solver wins and careful doesn't is a bot problem. **Gate:** the owner sees the table before Part 2.

### Part 1: built 2026-09-30 (rules 044-0, no UI)

Built on `variant/044-animal-board`: pinned tiles in `src/game/BoardModel.ts` (5 new board tests; the 32 old ones pass unchanged, and the 043 bot gives the same numbers), the rules in `src/clueGame/animalBoard.ts` (9 rules tests on the real content), note and animal tags carried into the game data (`questionMatchContent.ts`), and `scripts/balance-044.ts` (`--explain N` prints a dealt round).

**Tuned values** (`ANIMAL_RULES`): 7×7 board, 30 moves, clue orders of 24 gems, witness gems 3% of new gems, ★★ at 6 moves left, ★★★ at 13. The sweep: orders of 12 ended rounds after about 10 moves; orders of 16-20 with 22-26 moves came close; orders of 24 with 30 moves gave the longest rounds that still met the targets.

**Held-out run** (setup seed 4401, 400 rounds a place, ±2-5 points):

| Place (animals, distinct sets) | Careful found (★★★) | Reader | Guesser | Random | Oracle | Moves careful uses | Trails finished: careful / guesser |
|---|---|---|---|---|---|---|---|
| Africa (26, 23) | 95% (53%) | 77% | 20% | 0% | 99% | 16 | 100% / 6% |
| Asia (20, 17) | 95% (42%) | 68% | 20% | 0% | 99% | 19 | 100% / 6% |
| North America (13, 8) | 97% (52%) | 80% | 22% | 0% | 100% | 17 | 100% / 6% |
| South America (14, 10) | 96% (53%) | 76% | 20% | 0% | 100% | 16 | 100% / 5% |
| Oceania (6, 2) | 95% (55%) | 72% | 20% | 0% | 100% | 16 | 100% / 6% |
| World (76, 45) | 97% (52%) | 79% | 20% | 0% | 100% | 17 | 100% / 6% |

- **Met:** careful finds 95-97% (target ≥ 85%); random finds none and names the right animal at the end 19% of the time (journal only); the guesser sits on the blind floor (20-22%, target ≤ 22%) and escapes in 80% of rounds; careful finishes every trail, the guesser 5-6% (targets ≥ 90% / ≤ 8%); the oracle finds 99-100%, so every round could be won in the moves (no board problem).
- **Borderline:** the reader trails careful by 15-27 points (target 20): Asia 27, Oceania 23, South America 20, but Africa 18, world 18, North America 17. Aiming matters, a little less than hoped. Levers if the owner wants more: orders of 28, or fewer witness gems (they fill reasoning gaps for both).
- **★★★** lands at 42-55% of careful's rounds (target about 40%); move the ★★★ line to 14 to bring it down.
- **No grind after the answer:** careful knows the mystery about 2 moves before its find; most moves go into filling orders (it needs about 2 of the 4 answers plus 1.5-2 witness notes). The plan's fear of "identify early, then grind" doesn't show up.
- **Small pools repeat:** Oceania's 6 animals make only 2 distinct sets, North America's 13 make 8. Plan 040's content batches matter here. In whole-world play, 8 frogs can't seed a set (records too thin).
- **Bot limits:** careful and reader read witness notes perfectly (through tags) and never misjudge a trait, so they're an upper bound on reasoning; careful looks one move ahead. Kids will reason slower: the playtest has to show where they land.

**Gate:** the owner reviews this table before Part 2.

### Part 2: graybox phone playtest

Before any new art: emoji or letter glyphs on the 043 gem shapes, photo tiles, order tiles with counts and answers, suspect cards with trait chips and Rule out, release preview, witness notes, out-of-moves sheet, stars, trail hearts. Questions: can a kid say why an animal is ruled out, and does marking feel like committing? Do long rounds stay fun once the mystery is known (the bot reports moves after identification)?

### Part 2: built 2026-10-01 (graybox at `/explore` on this branch)

**Play it:** `npm run dev`, then `http://localhost:8080/explore/?place=continent:africa` in a phone-sized window (`?seed=N` replays). The first visit shows How to play.

What's there:
- **Board:** the five animals pinned as photo tiles (Commons thumbnails in a round cream frame, a badge if the photo fails); gems fall past them; each round's clue gems show the clue's picture (emoji) on the 043 shapes (`src/game/faceTextures.ts`), toys drawn on those faces; ruled-out tiles wear a red ring and cross; tapping a gem outlines in amber the ruled-out animals its swap would release (the preview); released tiles hop off and gems drop into their cells.
- **Screen** (`src/components/animalBoard/`): suspect cards with each animal's own answer per clue (picture plus ✓ or ✗), a field guide sheet per animal (its answers, its signs, its field guide lines, **Rule out** / Undo), the four clue orders with progress and stamped answers, the latest event, witness notes (with "the field guides of N of the 5 say this too"), the out-of-moves sheet (name it for the journal), the round-end card (stars, points, family tree, all field notes), trail and hearts on the top bar, How to play, the journal (finds and right names).
- **Rules wiring:** the board releases what the rules have marked (`clue-board-marks`), reports `touched` and `released` per phase, and says when a move has settled (`clue-board-settled`); the session reducer is `src/clueGame/animalSession.ts`.
- **Range clues** each get a direction arrow (⬅️ West Africa, ➡️ East Africa, 🎯 Central…), and a deck never shows the same picture twice (two Range clues both showed a compass in the first build). The held-out bot numbers didn't change.
- **Thumbnails:** Wikimedia serves only standard widths (120, 250, 330, 500 work; 160 and 440 return 400, which the browser blocks as a cross-origin error page), so tiles use 120 and the round-end photo 500.

**E2E** (`npm run e2e`, rewritten for the animal board; the 043 one is in git history): 427/427 at seed 7, Africa. Round 1 plays carefully (rules out through the real cards, aims at marked tiles) and finds the Hairy Frog in 24 moves; round 2 rules out the mystery on purpose and it escapes; round 3 rules out nobody, runs out of moves and names the mystery, which lands in the journal. Every move: only ruled-out animals leave, the mystery leaves only by escaping, tiles never move, the view shows a tile exactly on each pinned cell, the clue orders on screen match the rules; once a run, the release preview outlines the right animals and a witness note shows its count. A 4-round careful run: 518/518, all found.

**Not built yet:** saving rounds to the database (no POST: Part 3 maps only fields with unchanged meaning), the optional recall question, easy mode (4 suspects), the drawn clue art (Part 4), and the 043 screen code (`MatchGame` and its parts) is still in the tree, unused here.

**Watch in the playtest:**
- Witness notes are strong: in the e2e, two or three notes alone identified the mystery twice (rounds found in 5 and 10 moves). If rounds end too fast, lower the witness rate (3%).
- Can a kid say why an animal is ruled out, and does **Rule out** feel like committing?
- Do the emoji faces read at a glance as their clue, and do the cards' ✓/✗ chips help or crowd?
- Do 30-move rounds stay fun once the mystery is known?

### Evidence grid: built 2026-10-04 (replaces the suspect cards and order tiles)

Why: the cards held each animal's answers in a 2×2 block, so the same clue sat in a different spot on each card and nothing lined up; the order tiles repeated the mystery's answers under the board. Settled with the owner after ChatGPT, Grok and Fable proposals and a throwaway prototype (two layouts on real rounds; the owner picked animals as rows).

- **One table** (`EvidenceGrid.tsx`): a column per clue (its gem face and a short label, `columnLabel` in `questionMatch.ts`, qualifiers kept: "Huge 300+ kg", "Mostly bugs"); the Mystery row, where each cell fills with that clue's gems and flips to an ochre YES/NO stamp; a row per suspect with its own ✓/✗. Rows never move or collapse; ruled out = red ring and ✕, released = dimmed.
- **Point, don't conclude:** during play nothing marks a contradiction, says who is "still possible", or eliminates anyone. When an answer lands the whole column lights, not the mismatching cells. The counter is the player's own marks ("2 ruled out"). The round-end card replays the grid with red exactly where an *earned* answer rules an animal out; unearned answers stay "?" (small pools repeat sets, so showing all four would leak).
- **Numbers, not just photos:** each animal has a number (1–5, the suspect order) on its row and on its board tile, because look-alike photos can't be told apart at 30 px. Tapping a row or a tile picks the animal (the tile pulses blue); its Field guide and **Rule out** appear in the status line, so marking takes two taps and a stray tap can't start an escape.
- **Gem flight:** each color cleared sends one gem from the board to its column (`gems-matched` gains `from`, page pixels). The rules still count at once (`data-have` on the cell, which the e2e reads); only the grid's number waits for the landing or the settle (`useShownOrders.ts`). The round-end card waits for the board to settle. Reduced motion: no flight.
- **Screen:** grid, one status line (events only; the whole question once, when its first gems land), board. The top bar is gone: menu, hearts, trail and moves sit in the grid's empty corner; globe, journal, how to play, sound and score are in the menu. DESIGN.md records the exception (12 px grid text, 34 px rows). At 375×548 the board keeps 210 px (the old layout gave 218).
- **Deferred:** close-up photo crops (one focus point per animal; a tight crop can hide the trait a clue asks about), the released tile flying to its row, the first-round "point at mismatches" help.

E2E: 501/501 at seed 7, Africa (adds: grid rows and columns match the rules, the Mystery row never named during play, no mismatch marks during play, marks counted, Rule out through the row and status line, a tile tap picks its row, the board keeps 210 px at 375×548, the end card's red cells are exactly the earned mismatches).

### Part 3: the playable screen

- `useMatchSession` → a session over `animalBoard.ts`; rules version `044-1`.
- `EventBus`: `clue-board-setup` gains tile placements; `gems-matched` gains `touched`; the view animates hops and escapes; `BoardController` bounces swaps that touch a tile.
- **Saved rounds:** `parseSolveReport` rejects unknown fields and the API maps columns by name. Part 3 saves only fields whose meaning doesn't change (outcome, moves, moves left, questions with answers, rules version, place). Stars, marks, release order, escapes and trail position wait for a schema and API change the owner approves; no existing column gets a new meaning.
- How to play: short steps with the example round below.

### Part 4: clue gem art

The 043 system: each of the 4 clue slots keeps its own silhouette and color (ball, triangle, leaf, hexagon) and its glyph shows the trait (fly, leaf, meat, moon, sun, egg, fur, scales, shell, water drop, tree, grass, cactus, mountain…); the pebble is a plain grey stone in the rounded square; the witness gem keeps the purple sparkle. About 30 glyphs, our own SVGs, playful and modern, readable at 42 px; checked in a grayscale contact sheet. Only after the playtest says the loop works.

### Part 5: checks

- `npm run e2e`: every move, unmarked tiles never leave; a released animal is never the mystery unless the round ends lost; order counts and answers match the rules; tiles never move; out of moves, the round is lost and naming changes only the journal; the trail loses exactly one heart per lost round. Artifact: report and screenshots as today.
- `playtest` skill run on a phone viewport; report in `docs/playtests/`.

### Later (from the Fable review, not decided)

- **Chains earn moves:** big cascades fill a meter that adds a move.
- **Known animals hide their chips:** animals already in your journal show no trait chips, so reviewing pays off.
- **Show your work:** an optional "Which clue ruled out the Okapi?" for a bonus.
- **"Which?" orders:** a straight 4 of a clue gem asks the full value ("What does it eat?").
- **Pass the case:** a shareable "Which one?" card and a daily trail with a shared seed.
- Obstacles: brush that hides a tile's photo until cleared next to; stones that block a column.

## Example round (real data, Africa)

Generated with the real rules (`dealClues`, `witnessNotes`) from the profiles; `scripts/balance-044.ts --explain <round>` prints any dealt round the same way.

Suspects: Okapi, Aardvark, Giant Pangolin, Black Rhinoceros, Hirola; the mystery is the Aardvark. The deck the rules deal for this set, with every suspect's record:

| Suspect | Covered in fur? | Lives alone? | Lives in shrubland? | Lives in Southern Africa? |
|---|---|---|---|---|
| Okapi | yes | yes | no | no |
| Giant Pangolin | no | yes | no | no |
| Aardvark | yes | yes | yes | yes |
| Black Rhinoceros | no | yes | yes | yes |
| Hirola | yes | no | yes | no |

The Aardvark's witness notes for this set: the long sticky tongue (fits 3: Okapi, Aardvark, Pangolin), the spade-like claws digging into termite mounds (fits 2), rarely drinking (fits 2), resting in a burrow it digs (fits 2).

1. "Covered in fur?" splits the five 3 against 2; chase its order. A few moves later: "Covered in fur? Yes." The Pangolin (scales) and the Rhino (skin) are out: mark both **Rule out**.
2. Keep matching: clears next to the two marked tiles release them, some from your runs, some from cascades.
3. A witness gem next to a match: "It digs into ant nests and termite mounds with its strong, spade-like claws. The field guides of 2 of the 5 say this too." The signs show *digging claws* and *raids termite mounds* on the Aardvark and the Pangolin only, and the Pangolin is already out: it's the Aardvark. Mark the Okapi and the Hirola.
4. Release them: only the Aardvark is left, found.

The danger is a hasty mark. A player who marks the Okapi and Hirola right after the fur answer, guessing between the three furry ones, is right this time; had the mystery been the Hirola, releasing it would have lost the round.

## Owner decisions (2026-09-30)

- 5 suspects (3 and 4 were measured: a smart player needs 1.7 / 2.0 / 2.4 clues for 3 / 4 / 5; blind picks win 1 in 3 / 4 / 5).
- Mark to release: a loss is a wrong conclusion, never a wrong swipe.
- No net.
- Witness notes in play, with blanks and the "field guides of N of the 5" count.
- Longer rounds, like Candy Crush. Filling them with **clue orders** is this plan's proposal, open to veto.
- Out of moves costs a heart even with a right name; the journal entry is the consolation.

## Codex review (2026-09-30), and what changed

1. **Blind naming wins 20% whatever the board does.** Naming at timeout saves no heart; targets gate on finds and trail success; trail success is defined.
2. **A safe first move doesn't make a round solvable; falling tiles pile up.** Tiles are pinned and spaced; rounds with no possible finish are counted with a diagnostic solver; worst seeds are saved.
3. **The release rule was inconsistent.** Now one rule: a marked tile is released when a gem next to it is cleared, by anything; unmarked tiles never are.
4. **The board model can't stay unchanged.** Part 1 lists every change and the tests, keeping 041/043 behavior when there are no animals.
5. **The deck contract.** A full yes/no table, distinct rows, set first and mystery last, with a test that the deck and board don't depend on the mystery.
6. **The bot could pass while board play barely matters.** Separate metrics, percentage-point targets on finds, a reader player to price board play, held-out seeds, intervals, replayable worst cases.
7. **The example taught a false rule** (the chimpanzee eats some insects). Questions keep their qualifiers; the example uses the Hirola, checked against the profiles.
8. **Fun is unproven.** Release preview, trait chips, a graybox playtest before art, a skippable recall question.
9. **Integration gaps.** Saved rounds keep existing meanings only; terminal timing is defined.

## Fable review (2026-09-30), and what changed

1. **The deck contract failed on real content** (no valid deck for 11 of 20 Asia sets): the substitution rule in step 1.
2. **Deduction is short (2.4 clues), releasing is long:** long rounds now have clue orders and witness notes to fill them; the bot reports moves after identification.
3. **A good reasoner could lose to a bad swipe:** mark to release.
4. **The best clue was rarely matchable this move:** orders collect over many moves, so you can plan toward the clue you want.
5. **Toys would be rarer** (tiles break runs): the bot reports toys made per round.
6. Its ideas the owner took: mark to release, witness notes. Not taken: the net. The rest are under Later.
