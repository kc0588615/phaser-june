# 044: The animal board (release the look-alikes)

Branch: `variant/044-animal-board`, cut from `variant/043-literal-gems` so it keeps the 043 gem art, the 7×7 board and the legend. `main` keeps rules 041-5; `variant/043-literal-gems` keeps 043-0. Rules versions `044-x`.

## Problem

Owner, 2026-09-30: random play must not solve rounds; players should have to play smart. Tuning 043 is not enough. Codex and an Opus agent both measured 043-1 (only your own match earns charges, one guess, best lead, 8×8, 6 moves): careful 94-95%, random 41-45%. The owner wants a different system instead.

The root cause in every version so far: **the game does the reasoning.** Any match asks a question and every answer crosses animals out by itself, so a random player gets the same deduction a smart one does. The new system hands the reasoning to the player, makes a wrong conclusion cost the round, and ties acting on a conclusion to the board.

Also decided by the owner (2026-09-30):
- **12 animals is too many.** A round has **5 suspects** (4 on easy).
- **The family tree leaves gameplay.** Players learn it by reviewing each animal after the round (see Review).
- Animals on the board, literal clue gems (a fly for "eats bugs"), obstacles and bombs: all wanted since plan 043.

## The game

**Story.** "Something dug up the termite mound last night. It was one of these five." Five suspect cards sit above the board; the game has secretly picked one of them as the mystery.

**The board.** 7×7. The five suspects are **animal tiles** on the board: a photo in a round frame, clearly not a gem. They never match and they fall like gems. The other cells hold five gem types: **four clue gems** and the **pebble**.

**Clue gems.** Each is one yes/no question about the mystery, drawn as its picture: a fly for "Eats bugs?", a fur tuft for "Covered in fur?", a moon for "Out at night?", a cactus for "Lives in desert?". Matching a clue gem asks its question once; the answer is stamped on its legend tile (✓ yes, ✗ no). An answered clue's gems still match and still release animals; they just ask nothing new. **Answers never cross anything out.**

**Pebbles.** A plain gem that matches and asks nothing. It's how you release animals without asking.

**Releasing.** An animal is released (it walks off the board) when your move clears a cell right next to it (up, down, left or right), or when a toy's clear covers its tile. This is the note gem's rule today (`BoardModel` collects a rare gem next to a run or inside a blast), with an animal instead.
- **Only your move releases:** its own clear and the toys that clear sets off. Cascades still clear, refill, make toys and may ask clues, but never release. Nothing escapes in a way you couldn't see coming.
- **Release the mystery and it escapes:** the round is lost, and the reveal shows who it was.

**Toys** cut both ways. A line gem fired along a row of three look-alikes releases all three in one move; the same line gem past the mystery ends the round. A blast gem releases every animal in its 3×3; a color gem clears every gem of one color and releases every animal next to one.

**Winning.** Release all four look-alikes: the last animal on the board is the mystery, found.
**Out of moves** with more than one animal left: you get **one guess** among them. Right: found, 1 star. Wrong: lost.
There is no early tag: if a player could name it once the clues prove it, releasing would be optional and the board would stop mattering.

**Stars.** ★★★ all four released with 2 or more moves left; ★★ all four released; ★ found by the out-of-moves guess. Points: 50 per star plus 10 per move left, plus the streak.

**The trail.** A session is a trail of 5 mysteries from the continent, with **3 hearts**; a lost round costs a heart, and the trail ends at the fifth mystery or the last heart. With five suspects a blind player wins about 1 round in 5, and no rule inside one round can push that much lower; the trail does. On an endless trail, expected finds before the third loss are `3p / (1 - p)` for a player who finds a round's mystery with chance p: about 0.75 for p = 0.2, about 57 for p = 0.95, so a careful player finishes a 5-mystery trail almost every time. Stars count only finds, so a lucky guess (1 star) is worth a third of a proof.

## How a round starts

1. **Suspects** (`pickSuspects`): the mystery and 4 look-alikes from the place, closest relatives and most shared traits first (today's `pickRound` with size 5). Every pair of suspects must be tellable apart by some question (`canTellApart`, pairwise, records on both sides); a suspect that can't be is skipped.
2. **Clue deck** (`dealClues`): 4 questions that **tell every pair of the 5 suspects apart** (10 pairs), using only traits both animals have records for. Because the deck separates every pair, it is the same whichever suspect is the mystery, so it never hints at the answer. Prefer clues with different splits (no two clues splitting the five the same way) and a mix of strong and weak ones (a 2/3 split next to a 1/4), so choosing which to ask matters. Fallback when no 4-clue deck exists: 5 clue gems and no pebble.
3. **Board** (`newAnimalBoard`, seeded as today): animal tiles in seeded cells, none touching another, none in the bottom row; no ready-made matches; at least one move that releases nothing.
4. **Legend**: the four clue tiles (icon, short question, answer stamp) and the five suspect cards.

## Why random play fails, and what smart play needs

- A random player releases animals in random order, so the mystery is last about 1 time in 5 at best, and the move limit cuts that further (target ≤ 15% a round, under 1.5 finds a trail).
- Smart play needs three things at once: **which clue to ask** (moves are scarce; a strong clue first), **who the answers rule out** (the player's job now), and **routing**: getting matches next to the right tiles while keeping the mystery's neighbors quiet, often asking and releasing in the same move.
- **Difficulty dial:** easy shows a badge on each suspect card per answered clue (a fly, or a crossed-out fly); standard shows none, so players read the field guide (grades 6 vs 12).

## Review instead of the family tree

The reveal card keeps the photo, family tree, range map, field notes and sources. New: one recall question before **Next animal** ("Which group is it in?" with three choices from the family tree, or "Which clue ruled out the Okapi?"). Right answers add to the streak; there is no penalty. Field notes (hand-written clues and fun facts) move from the board to the reveal card: there is no note gem and no last chance.

## Removed from gameplay

Charges, the question sheet and spend panel, the family tree steps, note gems and the last chance, 12 candidates, auto cross-out, and wrong guesses that only cost moves.

## Build order

### Part 1: rules and bot (no UI)

1. Branch `variant/044-animal-board` from `variant/043-literal-gems`.
2. `src/game/BoardModel.ts`: an **animal layer** beside `toys` (`animals[x][y]`: a suspect id or null). Animal cells hold no gem, never match, fall with their column, never spawn, and are reported per phase as `released: number[]` (next to a run or inside a toy's clear, first clear of a move only). Keep `nextPhase`, `canSwap` and the toy rules as they are.
3. `src/clueGame/animalBoard.ts` (pure): `pickSuspects`, `dealClues`, round state (suspects, deck with answers, released, moves, stars), `applyPhase` (answers asked, animals released, escape = lost), `guess` (out of moves only), `scoreRound`, `trail` (hearts, finds). Reuse `questionMatch.ts` for traits, question text and short text; leave its 041/043 rules untouched.
4. `scripts/balance-044.ts` (from `balance-041.ts`), every player on the same deals and boards, none peeking at the mystery:
   - **careful**: asks the clue that best splits the suspects it can't rule out; releases only ruled-out animals; never makes a move whose release set holds an animal it can't rule out; prefers moves that release and ask at once.
   - **random**: random moves, random guess at the end.
   - **reader**: reasons like careful but moves at random among moves that don't release an unruled animal it can see; shows what board skill is worth.
   - **reckless**: releases as fast as it can, ignoring the answers; shows what reasoning is worth.
   - Report per round: found, stars, escaped, out-of-moves guesses, clues asked, moves used; per trail: finds and hearts left.
5. Tune only: moves (5-8), suspects (4 or 5), board (7×7 or 8×8), cascades asking or not, animal spacing, number of clue gems.

**Targets (bot, 400 rounds a place):** random ≤ 15% found and < 1.5 finds a trail; careful ≥ 85% found and ≥ 50% three-star; reader at least 20 points under careful; reckless at least 30 points under careful. If careful can't reach 85%, the board is too tight (more moves or 8×8) before anything else changes. **Gate:** the owner sees the table before Part 2.

### Part 2: the playable screen

- Suspect row (5 cards: photo, name, easy-mode badges; tap for the field guide) above the board; the clue legend (4 tiles) below it; hearts and the trail on the top bar.
- Animal tiles: the species photo in a round frame with a thick light rim and a soft shadow, so they never read as gems; fallback badge when a photo fails (`TilePhoto` does this today). Release: the tile hops off the board; escape: it runs off with a short sound and the round ends.
- Out-of-moves guess sheet; reveal card with stars, review question and field notes; trail summary at the end.
- `useMatchSession` → a session over `animalBoard.ts`; rules version `044-1` saved with each round. `solveReport.ts`: new optional fields (stars, released order, escaped, trail position) beside today's; `clue_match_solves` keeps its columns, new values ride in what it already stores or wait for a schema change the owner approves.
- How to play: five short steps with the example round below.

### Part 3: clue gem art

The 043 system: each of the 4 clue slots keeps its own silhouette and color (ball, triangle, leaf, hexagon) and its glyph shows the trait (fly, leaf, meat, moon, sun, egg, fur, scales, shell, water drop, tree, grass, cactus, mountain…); the pebble is a plain grey stone in the rounded square. About 30 glyphs, our own SVGs, playful and modern, readable at 42 px; checked in a grayscale contact sheet.

### Part 4: checks

- `npm run e2e`: every move, nothing released by a cascade; a released animal is never the mystery unless the round ends lost; the legend stamps match the answers; the suspect row matches the board; out of moves, exactly one guess; the trail loses a heart per lost round. Artifact: report and screenshots as today.
- `playtest` skill run on a phone viewport; report in `docs/playtests/`.

### Later

Obstacles that matter here: brush that hides an animal tile's photo until a match next to it, and stones that stop a column so tiles can be parked. A daily trail with a shared seed.

## Example round (real data, Africa)

Suspects: Okapi, Aardvark, Giant Pangolin, Black Rhinoceros, Chimpanzee; the mystery is the Aardvark. Clues: fly "Eats bugs?" (yes: Aardvark, Pangolin), fur tuft "Covered in fur?" (yes: Okapi, Aardvark, Chimpanzee), paw trio "Lives in groups?" (yes: Chimpanzee), cactus "Lives in desert?" (yes: Rhino). Together they tell every pair apart.

1. Match flies away from every tile: "Eats bugs? Yes." Okapi, Rhino and Chimpanzee are ruled out.
2. Match fur tufts next to the Okapi: "Covered in fur? Yes," and the Okapi is released in the same move.
3. Fire a line gem along the row holding the Rhino and the Chimpanzee: both released.
4. The Pangolin has scales, so release it. Only the Aardvark is left: found, ★★★ with 2 moves to spare.

The danger is in move 2: a careless match beside the Aardvark tile would release it and lose the round.

## Open questions for the owner

1. Trail length and hearts: 5 mysteries, 3 hearts?
2. Easy mode with badges on by default, or standard?
3. Should cascades ask clues (more lively) or only your move (more demanding)? The bot will show the difference.
4. Photo tiles, or drawn animal portraits later?
5. Stars thresholds and points: as above, or simpler?
