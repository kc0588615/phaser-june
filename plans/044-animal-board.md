# 044: The animal board (release the look-alikes)

Branch: `variant/044-animal-board`, cut from `variant/043-literal-gems` so it keeps the 043 gem art, the 7×7 board and the legend. `main` keeps rules 041-5; `variant/043-literal-gems` keeps 043-0. Rules versions `044-x`.

Revised 2026-09-30 after the Codex review (last section): pinned animal tiles, an exact release rule, a timeout that costs a heart, a set-first deal, and metrics that measure board play.

## Problem

Owner, 2026-09-30: random play must not solve rounds; players should have to play smart. Tuning 043 is not enough. Codex and an Opus agent both measured 043-1 (only your own match earns charges, one guess, best lead, 8×8, 6 moves): careful 94-95%, random 41-45%. The owner wants a different system instead.

The root cause in every version so far: **the game does the reasoning.** Any match asks a question and every answer crosses animals out by itself, so a random player gets the same deduction a smart one does. The new system hands the reasoning to the player, makes a wrong conclusion cost the round, and makes acting on a conclusion a board puzzle.

Also decided by the owner (2026-09-30):
- **12 animals is too many.** A round has **5 suspects** (4 on easy).
- **The family tree leaves gameplay.** Players learn it by reviewing each animal after the round (see Review).
- Animals on the board, literal clue gems, obstacles and bombs: all wanted since plan 043.

## The game

**Story.** Neutral, so it hints at nothing: "Our camera trap caught a blur. It was one of these five." Five suspect cards sit above the board; the game has secretly picked one as the mystery.

**The board.** 7×7. The five suspects are **animal tiles**: a photo in a round frame with a thick light rim, clearly not a gem. Tiles are **pinned**: they never move, never match and can't be swapped; gems fall past them (behind the frame). So tiles keep the spacing the deal gave them and never pile up at the bottom. The other cells hold five gem types: **four clue gems** and the **pebble**.

**Clue gems.** Each is one yes/no question about the mystery, drawn as its picture, with the question's exact words on its legend tile: a fly for "Eats mostly bugs?", a fur tuft for "Covered in fur?", a moon for "Out at night?", a cactus for "Lives in desert?". The words keep their qualifiers ("mostly"): a chimpanzee eats some insects, so "Eats bugs?" would teach a false rule. Matching a clue gem asks its question once; the answer is stamped on its legend tile (✓ yes, ✗ no). An answered clue's gems still match and still release; they ask nothing new. **Answers never cross anything out.**

**Pebbles.** A plain gem that matches and asks nothing.

**Releasing** (one rule, used by the board, the bot and the release preview):
- A **run** releases every tile orthogonally next to any of its cells, including the cell where a toy is made.
- A **toy** releases every tile inside its clear: a line gem's row or column, a blast gem's 3×3, a combo's area. A **color gem releases nothing**: it clears gems of one color, and tiles aren't gems. So it's the safe big clear.
- **Only the first clear of your move releases**: its runs and every toy set off in it, worked out after the swap and the toy chain, before anything falls. Cascades still clear, refill, make toys and may ask clues, but release nothing, and a toy set off in a cascade leaves tiles in place.
- A released tile hops off; its cell becomes an ordinary cell and fills like any other.
- **Release the mystery and it escapes:** the round is lost, even if the same move released every look-alike. Answers asked in that move don't make its releases safe after the fact.

**Winning.** Release all the look-alikes: the last animal on the board is the mystery, **found**.

**Out of moves** with more than one animal left: the round is **lost** (a heart). You may still name it: a right name records the animal in your journal (learning still counts), but it saves no heart and earns no star. Without this, a player could ask every clue from safe cells, never release anything and name it at the end: board play would be optional.

There is no early tag, for the same reason.

**Stars.** ★★★ found with 2 or more moves left; ★★ found. Points: 50 per star, 10 per move left, plus the streak.

**The trail.** A session is a trail of **5 rounds** from the continent with **3 hearts**; each lost round costs one; it ends after round 5 or at the third loss. **Trail success** = finishing all 5 rounds with a heart left (3 or more finds). For a player who finds with chance p each round: p = 0.2 gives 5.8%, p = 0.85 gives 97.3%.

## How a round starts

1. **Suspect set first** (`pickSuspectSet`): a seed animal from the place plus its 4 closest look-alikes (most shared traits, relatives first). The set must have a clue deck (step 2); if not, pick again.
2. **Clue deck** (`dealClues`), from the set only: 4 questions where **every suspect has a record** (a full yes/no table, no "no record" answers), and the 5 suspects' answer rows are all different. Five distinct rows always have a separating set of 4 or fewer questions, so there's no 5-clue fallback. Ties break on a hash of the set's sorted ids. Prefer clues with different splits and a mix of strong (2/3) and weak (1/4) ones, so which to ask first matters.
3. **Mystery last:** chosen uniformly among the 5. The deck and the board depend only on the set, so they can't hint at it (and a test checks it, see Part 1).
4. **Board** (`newAnimalBoard`, seeded from the set): tiles in cells at least 3 apart (Manhattan), so no cell touches two tiles, and never in a corner; no ready-made matches; at least one move that releases nothing.

## Why random play fails, and what smart play needs

- **Blind naming** at the end of moves wins 1 time in 5 (4 suspects: 1 in 4), and no board rule changes that: hidden mystery, board independent of it. That's why naming saves no heart. What the bot gates on is **finds** (all look-alikes released) and **trail success**.
- A random player rarely releases all four look-alikes before the mystery within the moves (at best 1 in 5 orders, cut further by the move limit and escapes).
- Smart play needs three things at once: **which clue to ask** (moves are scarce; a strong clue first), **who the answers rule out** (the player's job now), and **routing**: matches next to the right tiles, toys aimed along the right rows, the mystery's neighbors kept quiet, asking and releasing in one move when safe.
- Main fun risk: identifying the mystery early, then grinding out releases. The move budget should make the releases the puzzle, not a chore; the bot reports moves between identification and the find.

**Helping kids reason without doing it for them:**
- **Release preview:** after the first tap (or while dragging), the tiles this swap would release are outlined. It says what will happen, never whether it's safe.
- **Trait chips:** each suspect card shows that animal's own trait for every clue (the Hirola card: fur ✓, mostly bugs ✗), clearly apart from the mystery's answers on the legend. Comparing them is the player's job.
- **Marks:** tap a suspect card to mark it "ruled out" (a note for yourself; it changes nothing).
- Difficulty comes from reasoning, not from hiding information: closer look-alikes and fewer moves for older players; 4 suspects on easy.

## Review instead of the family tree

The reveal card keeps the photo, family tree, range map and sources, and now shows the field notes (hand-written clues and fun facts). An optional recall question ("Which group is it in?" with three choices from the family tree) gives a small streak bonus; **Skip** is always there and costs nothing. There is no note gem and no last chance.

## Removed from gameplay

Charges, the question sheet and spend panel, family tree steps, note gems and the last chance, 12 candidates, auto cross-out, and wrong guesses that only cost moves.

## Build order

### Part 1: rules, board and bot (no UI)

1. Branch `variant/044-animal-board` from `variant/043-literal-gems`.
2. **`src/game/BoardModel.ts`: pinned tiles.** The current model can't stay as it is: the grid is `GemType[][]`, `canSwap` allows any swap that matches, gravity and `shuffle` move gem/toy pairs. Changes:
   - an `animals` layer (suspect id or null) beside `toys`; an animal cell holds no gem;
   - matching treats tile cells as breaks; swaps touching a tile are refused;
   - gravity compacts each column's gems past tile cells; refill fills non-tile cells;
   - `shuffle` keeps tiles where they are and shuffles gems and toys among the other cells (bounded tries, then fresh gems), never moving, copying or spawning an animal;
   - `commonestColor`, color-gem targets and `loadBoard` skip tile cells;
   - `nextPhase` returns `released` (first phase of a move only), computed by the release rule above; cascade blasts leave tile cells alone;
   - with no animals, every 041/043 behavior is unchanged (the existing board tests must pass as they are).
   - New board tests (board invariants, allowed by AGENTS.md): tiles keep their cells through gravity, cascades and shuffle; one copy of each surviving animal; a cascade blast through a tile cell; a toy chain's release set; a run next to two tiles.
3. **`src/clueGame/animalBoard.ts` (pure):** `pickSuspectSet`, `dealClues`, round state (suspects, deck with answers, released, moves, stars), `applyPhase` (answers, releases, escape), `nameAtTimeout`, `scoreRound`, `trail`. Terminal timing: once a round is found or lost, later phases change nothing (no second heart). Reuse `questionMatch.ts` for traits and question text; leave the 041/043 rules untouched.
   - Rules tests: a move releasing the mystery and every look-alike is a loss; for one suspect set, the deck and board are identical whichever suspect is the mystery; every dealt deck has a full table with 5 distinct rows.
4. **`scripts/balance-044.ts`.** Separate RNGs for setup, board and each player's choices; tune on one setup seed, report on a held-out one. Players may preview a move's first clear (it's deterministic and the UI shows it), never future refills or answers not yet asked.
   - **careful:** asks the clue that best splits the suspects it hasn't ruled out; releases only ruled-out animals; when no move is safe, takes the move that releases the fewest animals it hasn't ruled out (logged as forced risk).
   - **random:** random moves; names at random at the end.
   - **reader:** reasons like careful but picks at random among its safe moves: what planning is worth.
   - **staller:** asks clues from safe cells, never releases, names at the end: proves board play isn't optional.
   - **reckless:** releases as fast as it can, ignoring answers: what reasoning is worth.
   - **solver (diagnostic only):** a bounded search that may see future refills; an upper bound on what's possible, never a player.
   - Report per round: identified (careful knows the answer), found, ★★★, escapes, lost at timeout, named right at timeout, forced-risk moves, moves after identification. Separately count rounds with no legal move (reshuffle), no safe move, and no full release possible within the moves (from the solver). Per trail: success and finds. Per place and for easy mode. 400 rounds is about ±3.5 percentage points near 15% or 85%; give intervals. Save the worst seeds with their move traces to replay.
5. **Tune only:** moves (5-8), suspects (4 or 5), board (7×7 or 8×8), whether cascades ask clues, tile spacing.

**Targets (percentage points, held-out seed, 400 rounds a place):** careful found ≥ 80% and ★★★ ≥ 40%; random found ≤ 5%; staller found 0% (by rule); reader found at least 15 points under careful but ≥ 50% (planning matters, the game stays fair); reckless found at least 40 points under careful; trail success careful ≥ 85%, random ≤ 2%. If careful misses, check the solver first: a board with no possible full release is a board problem (more moves, 8×8, spacing); a board where the solver wins and careful doesn't is a bot problem. **Gate:** the owner sees the table before Part 2.

### Part 2: graybox phone playtest

Before any new art: emoji or letter glyphs on the 043 gem shapes, photo tiles, legend with answers, suspect cards with trait chips and marks, release preview, out-of-moves sheet, stars, trail hearts. Questions for the playtest: can a kid say what a swap will release, why it's safe, and why cascades don't release? Does it feel like a puzzle after the mystery is known, or a chore?

### Part 3: the playable screen

- `useMatchSession` → a session over `animalBoard.ts`; rules version `044-1`.
- `EventBus`: `clue-board-setup` gains tile placements; `gems-matched` gains `released` (first phase only) and the view animates hops and escapes; `BoardController` bounces swaps that touch a tile.
- **Saved rounds:** `parseSolveReport` rejects unknown fields and the API maps columns by name. Part 3 saves only fields whose meaning doesn't change (outcome, moves, moves left, questions with answers, rules version, place). Stars, release order, escapes and trail position wait for a schema and API change the owner approves; no existing column gets a new meaning.
- How to play: five short steps with the example round below; easy-mode copy says "all the look-alikes", not "all four".

### Part 4: clue gem art

The 043 system: each of the 4 clue slots keeps its own silhouette and color (ball, triangle, leaf, hexagon) and its glyph shows the trait (fly, leaf, meat, moon, sun, egg, fur, scales, shell, water drop, tree, grass, cactus, mountain…); the pebble is a plain grey stone in the rounded square. About 30 glyphs, our own SVGs, playful and modern, readable at 42 px; checked in a grayscale contact sheet. Only after the playtest says the loop works.

### Part 5: checks

- `npm run e2e`: every move, nothing released by a cascade; the released set matches the preview shown before the swap; a released animal is never the mystery unless the round ends lost; legend stamps match the answers; tiles never move; out of moves, the round is lost and naming changes only the journal; the trail loses exactly one heart per lost round. Artifact: report and screenshots as today.
- `playtest` skill run on a phone viewport; report in `docs/playtests/`.

### Later

Obstacles that matter here: brush that hides a tile's photo until a match next to it; stones that block a column. A daily trail with a shared seed.

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

1. Match three flies away from every tile: "Eats mostly bugs? Yes." The Okapi, Rhino and Hirola eat plants: ruled out.
2. Match fur tufts next to the Okapi: "Covered in fur? Yes," and the Okapi is released in the same move (safe: move 1 already ruled it out).
3. Line up four pebbles across the row above the Rhino and the Hirola, away from every tile: it makes a line gem that clears a row. (Tiles break runs, so a row holding two tiles has no room for four in a row.)
4. Swap the line gem down into the Rhino and Hirola's row so it lines up three: it fires along that row and releases both. The run itself touches only those two.
5. The Pangolin has scales, so release it with a match next to it. Only the Aardvark is left: found, ★★ with 1 move to spare (6 moves).

The danger is everywhere: in move 2, a match touching the Aardvark's tile instead would have released it and lost the round.

## Open questions for the owner

1. Trail: 5 rounds, 3 hearts?
2. Out of moves costs a heart even when the name is right (only the journal records it). Agreed, or too harsh?
3. Should cascades ask clues (livelier) or only your move (more demanding)? The bot will show the difference.
4. Photo tiles, or drawn portraits later?
5. Stars: ★★★ at 2+ moves left, ★★ otherwise?

## Codex review (2026-09-30), and what changed

1. **Blocker: blind naming wins 20% whatever the board does.** Agreed: hidden mystery, board independent of it. Naming at timeout no longer saves a heart; targets gate on finds and trail success; trail success is defined (5.8% at p = 0.2, 97.3% at p = 0.85) instead of the endless-trail figure.
2. **Blocker: a safe first move doesn't make a round solvable; falling tiles pile up and touch.** Tiles are now pinned and dealt at least 3 apart, never in corners. The bot's no-safe-move behavior is defined (forced risk, logged), and rounds with no legal, no safe or no possible full release are counted apart, with a diagnostic solver as the upper bound and saved traces.
3. **High: the release rule contradicted the note-gem shortcut.** One rule now: runs release their neighbors (toy cells included), toys release what's inside their clear, color gems release nothing, first clear only, cascades never; the mystery's release beats a simultaneous win; answers don't justify releases after the fact.
4. **High: the board model can't stay unchanged.** Part 1 lists every change (layer, swaps refused, gravity past pinned cells, shuffle conservation, color targets, payloads) and the tests, and keeps 041/043 behavior when there are no animals.
5. **High: the deck contract.** A full yes/no table for every dealt clue, distinct rows, no 5-clue fallback; the set is picked first and the mystery last, uniformly, with a test that the deck and board don't depend on it.
6. **High: the bot could pass while board play barely matters.** A staller player, separate metrics (identified, found, ★★★, timeout, forced risk), percentage-point targets on finds, separate and held-out seeds, intervals, per-place and easy-mode rows, replayable worst cases.
7. **High: the example taught a false rule** (the chimpanzee eats some insects). Questions keep their qualifiers; the example uses the Hirola, its table is checked against the profiles, and future examples are generated. The termite story hinted at diet; it's neutral now.
8. **Medium: fun is unproven.** Release preview, trait chips, marks, difficulty by reasoning, a graybox playtest (Part 2) before art, and a skippable recall question.
9. **Medium: integration gaps.** Saved rounds keep existing meanings only; easy-mode copy; the example shows how the line gem is made; terminal timing is defined.
