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

**Marks.** Tap a suspect card and choose **Rule out** to mark it; tap again to unmark (until it's released). Marking is free and instant. **Only marked animals can be released.**

**Releasing.** A marked animal is released (it hops off the board) when **any gem next to it** (up, down, left or right) is cleared: by your run, a toy, a cascade or a color gem. Unmarked tiles are never released, so nothing escapes by a stray swipe; every loss comes from a wrong conclusion. A released tile's cell becomes an ordinary cell and fills like any other.
- **Release the mystery and it escapes:** the round is lost, even if the same clear released every look-alike.
- **Release preview:** after the first tap (or while dragging), marked tiles this swap's own clear would release are outlined. Cascades may release more.

**Winning.** Release all four look-alikes: the last animal on the board is the mystery, **found**. There is no net and no early tag.

**Out of moves** with more than one animal left: the round is **lost** (a heart). You may still name it: a right name records the animal in your journal (learning still counts), but saves no heart and earns no star. Blind naming wins 1 time in 5 whatever the board does, so it can't be what saves a heart.

**Moves and stars.** Rounds are long: about 20-30 moves (the bot tunes moves and order sizes). ★ found; ★★ and ★★★ at moves-left thresholds the bot sets so careful players earn ★★★ in about 40% of rounds. Points: 50 per star, 10 per move left, plus the streak.

**The trail.** A session is a trail of **5 rounds** from the continent with **3 hearts**; each lost round costs one; it ends after round 5 or at the third loss. **Trail success** = finishing all 5 rounds with a heart left (3 or more finds). For a player who finds with chance p each round: p = 0.2 gives 5.8%, p = 0.85 gives 97.3%. With long rounds a trail takes a while; the trail and journal save between visits.

## How a round starts

1. **Suspect set first** (`pickSuspectSet`): a seed animal from the place plus its 4 closest look-alikes (most shared traits, relatives first). **Substitution:** a candidate that no full yes/no question can tell apart from an animal already in the set is skipped for the next look-alike. Real pairs this catches: the Western and Eastern long-beaked echidnas, the Dyeing Poison Dart Frog and the Golden Poison Frog, Africa's small frogs. A seed that can't make a set of 5 isn't a seed (count them per place). Without this rule, the Fable review found no valid deck for 11 of 20 Asia sets, 4 of 26 Africa, 3 of 14 South America and 29 of 76 world.
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

### Part 2: graybox phone playtest

Before any new art: emoji or letter glyphs on the 043 gem shapes, photo tiles, order tiles with counts and answers, suspect cards with trait chips and Rule out, release preview, witness notes, out-of-moves sheet, stars, trail hearts. Questions: can a kid say why an animal is ruled out, and does marking feel like committing? Do long rounds stay fun once the mystery is known (the bot reports moves after identification)?

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

Generated examples come from `scripts/balance-044.ts --explain <seed>` (same content pipeline as the game); this one was checked against the profiles.

Suspects: Okapi, Aardvark, Giant Pangolin, Black Rhinoceros, Hirola; the mystery is the Aardvark. Clues, with every suspect's record:

| Suspect | Eats mostly bugs? | Covered in fur? | Lives in groups? | Lives in desert? |
|---|---|---|---|---|
| Okapi | no | yes | no | no |
| Aardvark | yes | yes | no | no |
| Giant Pangolin | yes | no (scales) | no | no |
| Black Rhinoceros | no | no (skin) | no | yes |
| Hirola | no | yes | yes | no |

1. The fly and fur orders split the five best (2 against 3), so chase the flies. A few moves later: "Eats mostly bugs? Yes." The Okapi, Rhino and Hirola eat plants. Mark all three **Rule out**.
2. Keep matching: clears next to the three marked tiles release them, some from your runs, some from cascades.
3. A witness gem next to a match: "It digs into ant nests and termite mounds with its strong, spade-like claws. The field guides of 2 of the 5 say this too." The Aardvark and the Pangolin both dig into termite mounds: it doesn't settle it.
4. Fill the fur order: "Covered in fur? Yes." The Pangolin has scales: mark it, release it. Only the Aardvark is left: found.

The danger is a hasty mark. After the witness note, a player who guesses "it's the Aardvark" and marks the Pangolin before the fur answer is right this time; had the mystery been the Pangolin, releasing it would have lost the round.

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
