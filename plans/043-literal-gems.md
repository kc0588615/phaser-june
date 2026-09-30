# 043: Literal gems, a bigger board, obstacles (game variant)

Branch: `variant/043-literal-gems` (cut from `main` 2026-09-29). `main` keeps rules 041-5 as it is. This variant is rules `043-x`; if the owner likes it, merge it; if not, delete the branch.

## Problem

Owner, 2026-09-29: two needs come first.

1. **Clues and gems feel disconnected.** A match earns a colored charge, the player opens a sheet, reads a category's questions, picks one. Four steps between "I matched" and "an animal is crossed out"; the board says nothing about *which* question a color would ask or what it would rule out. Players can't plan a match around a deduction.
2. **The 5×5 board rewards random play.** About 4 valid swaps per board and 4 moves: too few choices to plan, and toys go off after the round ends. Bot gap careful vs random is 91–98% vs 73–88% (plan 041, part 14); we want random to lose more often, not careful to win more.

Also wanted: gems that *are* the clue (a fly for "eats insects?", an apple for "eats plants?"), animals on the board, and the classic match-3 pieces still missing (obstacles; bombs exist as toys).

## Design

### 1. The gem is the question

The board's 6 gem slots stay abstract in `BoardModel` (a slot is today's "color"). What changes is what a slot **means**: each slot maps to one yes/no question of this round, and its gem icon is that question's picture. Match 3 of a slot = that question is asked, at once, no sheet. A 4-match or 5-match still leaves a toy.

- **Per-round gem deck.** At round start, pick 6 questions from `questionsFor(book, state)` (every question that could cross out a standing animal), the 6 that split the 12 animals best (closest to 6/6), with at most 2 from one category so the deck stays varied. Habitat class questions (forest, savanna, wetlands…) and Range region questions are in the pool like any other.
- **Legend under the board.** A strip of 6 tiles: icon + question in kid words + what it would rule out now ("Eats insects? · crosses out 5"). This is the connection the owner asked for: the player reads the legend, sees which gem splits best, hunts that gem. Tap a legend tile to highlight its gems on the board.
- **An answered slot re-deals.** When a slot's question is answered, the slot maps to the next best unasked question and every gem of that slot flips to the new icon (a flip tween, no board change, the model never knows). If no question is left that can cross anything out, the slot becomes a **wild** gem: it matches with any slot (classic match-3 wild) and pays a field note. So there are never dead colors.
- **A match that answers the mystery's missing trait** ("no record") still re-deals the slot; the log says so as today.
- **4 and 5 matches** ask the question once and leave a toy, as today. The color gem clears one slot and asks its question once (the extra gems count toward `perBlast` notes, not more asks).
- **Icons.** One SVG per trait value and habitat class, in `public/assets/gems/<tag>.svg` (about 30: diet 4, activity 4, size 5, covering 6, social 3, birth 2, young 3, lifespan 2, habitat classes 10, Range 1 compass icon with the region's short name on the legend tile). Readable at 48 px on a 390 px phone. Names in player copy follow `feedback_audience_tone` (no medical or violent words: "meat" not "carnivore").
  - **Owner, 2026-09-30:** we draw our own SVGs, playful and modern, and a match must read at a glance from shape and color alone. Part 0 drew the system (`public/assets/evidence/*.svg`): each slot has its own silhouette and color, a dark rim, a 6 px drop for depth, a top-left shine and a bold glyph. Ball (orange), triangle (yellow), leaf (green), hexagon (blue), rounded square (pink), four-point sparkle (purple, the rare note gem). Checked in a grayscale contact sheet: the shapes alone tell the gems apart.
  - **Part 1 keeps each slot's silhouette and color and swaps only the glyph** for the trait's picture (fly, apple, moon, egg…). A re-deal changes the picture, never the shape or color, so matching never gets harder to read.
- **Charges are gone from the HUD.** The rules keep an internal count only to reuse `applyMatches` and `ask`; a match of slot *k* auto-asks slot *k*'s question. `ChargeChips` and `SpendPanel` are replaced by the legend. At 0 moves there's nothing to spend, so the spend panel becomes the guess sheet only.
- **Family tree.** Its price "one charge of each color" no longer exists. Decision for the owner, my recommendation first:
  1. A rare **tree gem** (like the note gem, about 1 per board, never matches by itself); a match next to it reveals the next step. A planning target on the board, and a bigger board has room for it.
  2. Every toy going off reveals a step (part 1 found "any 4+ match" too easy on 5×5; toys on 7×7 with 6 moves are a different rate, the bot would tell).

### 2. Board 7×7, 6 moves

- `GRID_COLS`/`GRID_ROWS` 7. Plan 041's decisions measured 7×7 with 6 colors at about 7 valid swaps and a reshuffle on 1% of moves. Phone: `squareLayout.ts` already fits any grid; at 390 wide a gem is about 48 px, fine.
- Moves 6 (owner said "larger board, planning available"; 4 moves ends before a toy pays). The bot settles it: target is the careful/random gap, see Balance.
- Toys, cascades, the note gem and all input stay.

### 3. Obstacles

Things to plan around, not another bomb. All cleared by a match next to them; none match by themselves; they fall like gems. Names are outdoor words.

- **Brush** (a leafy tile): hides a gem; one adjacent match clears the brush, the gem under it stays. Some brush hides a **note gem** or the tree gem, so clearing is worth a move.
- **Stone**: doesn't fall, doesn't clear by one match; two adjacent matches (cracked, then gone). Blocks columns, so the player thinks about where gems will land.
- Spawn: 2–4 brush and 0–2 stones per board, from the round seed; none in the first two rows so the board always has a move. `BoardModel` gets an `obstacles` grid beside `toys`; `canSwap`/`hasMove` ignore obstacle cells; `newBoard` guarantees a valid move as today.
- A **countdown bomb** is out: urgency was dropped twice before (Match Battle, urgency meter).

### 4. Look-alikes on the board (later, after 1–3)

Animals as gem *types* can't work: 12 types don't match. Instead a **crate** (camera-trap tile) holding one standing look-alike's photo. Clear it with an adjacent match and that animal is crossed out ("Spotted: a ____ , not our mystery"). One tile acts on one animal, a question on six, so it is a bonus target, not the core loop. Needs the standing list on the board (`clue-board-setup` payload) and a `crate-cleared` event back. Skip in the first build.

## Rules versions

- `043-1`: literal gems + legend, 7×7, 6 moves, family tree by tree gem (or toys). Saved as `rules_version` on every solve, so `main`'s rows and this branch's rows tell apart in `clue_match_solves` (no schema change).
- `043-2`: + obstacles.
- `043-3`: + crates.

## Build order

### Part 0: feel test in an afternoon (no icons yet)

- 7×7 board, 6 moves, `DEFAULT_RULES.version = '043-0'`.
- Legend strip under the board showing, for each of the 5 category colors, the question `autoAsk` *would* ask (the best splitter) and its rule-out count. Matching that color asks it at once. This is rules 043-1 with category icons instead of trait icons: it proves the "match = ask" feel before any art.
- Bot table (`--board 7 --moves 6`). Owner plays `/explore/?seed=1`.

### Part 0: built 2026-09-30 (rules 043-0)

What changed from the sketch above, and why (bot: `node scripts/run-typescript.mjs scripts/balance-041.ts`, 300–400 seeded rounds per row, 12 look-alikes, Africa / Asia):

- **A match that asks at once is too easy.** Asking every match's best-split question: random swaps solved 100%. Dealing a random useful question instead: still 95–100%. A 7×7 board with cascades asks about 1.5 questions a move, and 12 animals need 3 or 4. So each color **holds charges and asks at 2** (`Rules.questionCost`), shown as dots on its legend tile.
- **Lead questions are dealt, not best** (`Rules.lead: 'dealt'`, a fixed shuffle per round). Colors then differ in worth, so reading the legend ("4+ out") is the skill. Best-split leads made every color equally good.
- **Family tree steps need a 5-match.** At a 4-match, careful players asked under 1 question a round and won through the tree: the questions stopped mattering. At 5 the tree is rare (0.0–0.2 steps a round), so it barely exists in 043-0. This is open question 1 again: a tree gem gives it back on purpose.
- **5 moves**, not 6: 6 lets random reach 77–82%.
- The legend (`GemLegend`) replaces the charge chips and the question sheet; the out-of-moves panel only offers questions it can pay for. Gem art redrawn (see Icons). `main` keeps 041-5.

| Rules | Careful solved (first try) | Random solved (first try) | Worst solved | Careful questions a round |
|---|---|---|---|---|
| 041-5 on `main` (5×5, 4 moves) | 96–98% | 87–91% | 77–78% | 3.7 |
| **043-0** (7×7, 5 moves, 2 charges, dealt, tree at 5) | 91–92% (81–85%) | 71–72% (55–57%) | 56–59% | 3.4–3.5 |
| 043-0 with 3 charges | 77% | 57–60% | 42–45% | 2.8 |
| 043-0 with the tree at a 4-match, 3 charges | 94–97% | 62–64% | 47–50% | 0.6–0.9 |

The careful-to-random gap roughly doubles (about 9 points to about 20). Random still solves 71%, above the ≤60% target; random's first-try rate (55–57%) meets it. Lower levers left: fewer note gems barely moved random (75% vs 73–76%), and 3 charges pulls careful under 90%.

E2E: `npm run e2e` 146/146 (seed 7, Africa): the legend on screen (tags and text) matches the rules at the start and after every move, it changes after an answer, and a match that fills a color's charges asks exactly its legend question. Screens fit 390×844. Known: on short phones (667 px tall) the 7×7 board gets small gems; not fixed.

**Codex review of d496643a (2026-09-30), all fixed the same day:**
- The legend's "4+ out" was not sure when some animals have no record: if the mystery is one of them, the answer crosses out none and the next question is asked. Such counts now show "4?" (legend, aria text, How to play, docs).
- The e2e read the on-screen legend only at round start, so a legend frozen after its first paint would pass. It now compares tags and visible text after every move and checks that the legend changed after an answer.
- The bot scored a move by its plain runs only, so a color gem or two toys swapped (big clears, no run) scored 0: careful skipped them and worst chased them. It now plays each move on a scratch board and scores its first clear, toys included, with `chargesEarned` (shared with `applyMatches`); careful also discounts "?" questions. "Charges earned" counted what was left after auto-asking; it now counts every charge earned. The 043-0 row above is the rerun; 041-5 solve rates are unchanged.
- Codex reproduced the plan's 400-round numbers and found no bug in the ask/refund loop or in 041-5.

**For Part 1:** keep charges (2 a question) and deal slots at random, not the 6 best splits: both easy versions were measured here. The family tree needs its own source (the tree gem).

### Part 1: literal gems (043-1)

1. `src/clueGame/gemDeck.ts` (pure): `dealDeck(book, state) → Slot[]` (6 questions, best split, ≤2 per category), `redeal(slot)`, `iconOf(tag)`. Tests only for the failures a playtest can't see: a deck never holds two identical tags, a re-deal never repeats an asked tag, wild when nothing is left.
2. `questionMatch.ts`: `RoundState.deck`; `applyMatches` asks the slot's tag for every group instead of adding charges; `ask` unchanged; family tree per the owner's pick. Remove `autoAsk`, `canAsk`, `familyTreeQuote` paths that the HUD no longer uses (keep exports `main` still has only if they cost nothing).
3. `gems.ts`: `GEM_OF` becomes slot → board color (6 slots on the same 6 model colors), plus `iconOf`.
4. Board: `clue-board-setup` payload gains `icons: Record<GemType, string>`; a new `clue-board-reskin` event `{ slot, icon }` flips textures (`BoardView.reskin`). `ClueBoardScene` loads the ~30 icon SVGs at boot.
5. UI: `GemLegend.tsx` replaces `ChargeChips` + `SpendPanel`; `MatchSheets` keeps the field guide and family tree sheets, drops the question sheet. `LogEntryText` shows the icon beside each answer.
6. `e2e`: each move, the legend's 6 tags are distinct, every tag on the legend is askable, a 3-match of a slot asks exactly its legend question, and after an answer the slot's icon changed. Artifact: `e2e-artifacts/<run>/report.json` + a screenshot of the legend after the first answer.
7. `docs/CLUE_MATCH.md` rules section for 043, `CONTEXT.md` terms: slot, deck, legend, wild gem.

### Part 2: obstacles (043-2)

`BoardModel.obstacles`, spawn from seed, `BoardView` brush and stone textures (`toyTextures.ts` style, drawn in code), `sfx` for a clear, e2e once a run: a brush is cleared by an adjacent match; a stone needs two.

### Part 3: crates (043-3), only if 1–2 play well.

## Balance (bot, before each version is called done)

`scripts/balance-043.ts` from `balance-041.ts`: players careful (pick the move whose slot splits best, else biggest match), random, worst. Report solved, first try, moves to solve, questions asked, notes, tree steps.

Targets: careful ≥ 90% solved; **random ≤ 60%** (today 73–88%); worst ≤ 40%. Tune with moves (5–7) and deck size (5–6) only; don't tune by changing the animals.

## Not changing

Content files, the pool API, scoring, the journal, the globe, solves table columns, sounds. `main` stays playable at the same URL until the owner decides.

## Open questions for the owner

1. Family tree: tree gem (recommended) or toys? Part 0 shows a big-match rule either swamps the questions (4) or vanishes (5).
2. ~~Icon source~~ Answered 2026-09-30: we draw our own SVGs (see Icons).
3. ~~Moves 6?~~ The bot picked 5 for 043-0.
4. Should Range questions be in the deck (compass icon + region name on the legend) or stay out of the deck so the board only shows picture-able traits?
