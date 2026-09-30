# 041: Make Clue Match tactical (ideas)

Written 2026-09-27 from a design talk with the owner. Status: built into the game 2026-09-28 (see Built into the game). The game plays the charges loop with toys and 12 look-alike animals (rules 041-5, part 13). The one-question-a-move versions from parts 8–10 were tried and removed (parts 11–12). Every proposal from the review rounds (Claude, Fable, Codex, Grok): `plans/041-board-reviews.md`.

## Problem

Owner: "just matching randomly and seeing the deduction clues isn't motivating." Why:

1. **Nothing is scarce.** Moves are unlimited and every match reveals a clue. A wasted move costs a few points (`scoreBreakdown`, `src/clueGame/round.ts`), but it never forces a decision.
2. **Knowledge isn't the skill.** The dots on the candidate cards do the deduction. A kid who knows sloths live in South America plays the same as one who doesn't.
3. **You pick a color, not a question.** Each color shows its broadest clue first (`revealNext`), so the only choice is which color the board offers.
4. **Nothing pushes back.** There's no clock, no rival and no cost to guessing late.

Design rule: in a good learning game, **what you know is the skill**. Every idea below is judged on that.

## Ideas, best value first

### 1. Ask your own question (Guess Who + mana). The core bet.
- Matches charge categories instead of revealing clues. For example, 3 blue = 1 Range charge, and a 4-match gives 2.
- Spend a charge to ask a yes/no question built from trait tags: "Does it live in Africa?" (`realm:afrotropical`), "Is it covered in scales?" (`covering:scales`).
- The tactic is Guess Who's: pick the question that splits the field. Example: giant pangolin, Indian pangolin, aardvark, giant anteater, giant armadillo, sloth. "Scales?" splits 2/4; "Americas?" splits 3/3, so it's the better question.
- You learn the candidates' traits in order to choose well.
- Reuse: tags + `fitClue`/`evaluateClue` (`src/clueGame/deduction.ts`), exclusive/complete prefixes (`src/clueGame/traits.ts`). New: question text per tag (plain words, grades 6-12), and a picker UI.
- Open: only offer questions that split the live candidates (never 0/6)? Should the clue text still show after the answer, as the lesson?

### 2. Move budget, and early guesses pay more.
- For example, 8 moves per mystery. A correct guess scores more the more candidates are still live.
- Push-your-luck: "I'm pretty sure it's the tapir, guess now?" Knowing animals means guessing sooner.
- Nearly a rule change: `session.ts` + `scoreBreakdown`. Pairs with #1.
- Open: budget value (the 2026-09-25 playtest's clues-to-solve median was 6-9, p90 14-16); what happens at 0 moves (forced guess?).

### 3. Players cross out cards themselves.
- The dots become a check, not the answer. You flip cards down yourself; tapping a card shows its traits. Flipping the real answer costs points or the streak.
- Forces reading. It could be a "Ranger mode" setting if it's too hard for grade 6.

### 4. Animal powers from the Field Journal (educational Morphosis relics).
- Each found animal gives a power from a real trait: pangolin "Roll up" (a wrong guess keeps your streak), chameleon (recolor a gem), aardvark "Dig" (clear a column), bat "Echolocation" (peek at a clue before paying), elephant "Memory" (see an old clue again).
- Bring 3 per session: light deck-building, and the journal gets a use.
- Needs a `power` field on some profiles; not every animal needs one.

### 5. Special gems as field tools.
- 4-match makes a Camera Trap (clears a row). 5-match makes a Drone: you pick *which* clue of a category you get, instead of the broadest.
- Classic match-3 juice (still the open gap from earlier iterations) tied to question choice. Board side: `BoardModel.ts`, `BoardView.ts`.
- Names follow the copy rules: outdoor-tech, no weapons or medical words.

### 6. Daily Mystery + class challenge.
- `?seed=` already replays a session exactly. Add a daily seed and a Wordle-style share line ("🟦🟧🟩 → 🦥 in 4").
- A teacher gives the class one seed. Cheap, social, motivating.

## Slay the Spire / Match Morphosis direction

Borrow the **structure**, not the **combat**. Spire's fun is each fight's decisions; the map only raises the stakes. Combat was dropped twice (Match Battle, then the urgency meter), so no HP or enemy attacks. Here the "enemy" is **uncertainty + a limited budget**.

Once #1 + #2 are fun, a light run could be an expedition through one place:
- 5-7 mysteries on a branching trail.
- Leftover moves carry over as "battery."
- Ranger stations to swap powers (#4) and a "tough case" with more look-alikes.
- A final "rare sighting": a Critically Endangered animal.

## Prototype of #1 + #2 (2026-09-27)

`src/clueGame/PROTOTYPE-041-question-match.html`: open it in a browser, no server needed. It has real animals and traits, a 7x7 board with 6 category colors, and fixed scenario rounds (Termite eaters, Frog pond, Big and heavy, Tight budget). The designer view (bottom) has knobs, a mystery peek, question splits and a session table. Rebuild the data after content changes with `node scripts/run-typescript.mjs scripts/prototype-041-question-match.ts`. Throwaway: don't ship the page; the rules module in its second `<script>` is the liftable part.

Balance finding, from a bot playing 120-300 seeded rounds (first valid swap each move; moves to solve at median/p75/p90):

| Setup | Best questions | Random | Worst |
|---|---|---|---|
| 6 animals, 1 charge per question | 3/3/4 | 3/4/5 | 3/4/5 |
| 12 animals, 1 charge per question | 3/4/5 | 4/6/7 | 6/8/9 |
| 9 animals, 2 charges per question | 7/9/10 | 8/11/13 | 11/13/16 |

- With 6 candidates, question choice barely matters: every offered question rules someone out, and 3 good ones solve it. So skill needs **more candidates** (Guess Who has 24) or pricier questions.
- The prototype defaults to 12 animals, 1 charge per question and 6 moves: good askers finish with moves to spare, random ones scrape by, poor ones run out.
- ~~Catch: 12 candidates needs a bigger pool than one place.~~ In today's code a place only limits which animal can be the mystery; the other cards come from all animals (`createRound`, `src/clueGame/round.ts`). The new design changes that: every card comes from the place (Review fixes, 8).
- The bot matches blindly. A player aiming at colors they want will need fewer moves.

Owner verdict (2026-09-27): "much more enjoyable, and I have to consider the matches more critically now." But some questions are too detailed (yes/no about one country); try narrower choices or a question type other than yes/no.

## Decisions (grilling, 2026-09-27)

- **Scope: replace.** Question-asking replaces today's loop, where each match reveals its color's next clue. There is one game, no separate mode.
- **Out of moves: forced guess.** At 0 moves the board locks; the player can still spend the charges they have, then must guess. A wrong guess then ends the round: the animal is revealed, 0 points, streak lost. (Changed by review fix 4: first version lost the last move's charges.)
- **"No record" answers: refund.** If the mystery has no recorded value for the asked trait, the answer says so and the charge comes back.
  - **Later (content):** fill the missing shared traits in `db/content/animals/*.json` so fewer questions come back "no record". Missing today (of 62): social 20, lifespan 15, activity 13, young 12, size 9, diet 1.
- **Names: "charge" and "moves"** (for example "+2 Range charges", "4 moves left").
- **Questions: yes/no, broad only.** No country or genus questions. ("What" questions were measured: "What family?" leaves 1.4 of 12 animals, so it would solve the round in one question.)
- **Field notes gem.** The Status and Key facts gems merge into one Field notes gem. A match shows the next hand-written clue about the mystery animal; it rules nothing out by itself. ~~That makes 7 colors.~~ Now 6 colors: the red Family tree gem is gone (see the ladder below).
- **Scoring.** Solved 50, +10 per move left, +10 per other animal still standing (was +20; review), +25 first try, plus today's streak bonus (+10 per solve in a row, max 100). A wrong guess costs 30 points and 2 moves and breaks the streak; a wrong guess at 0 moves ends the round with 0.
- **Saved rounds:** every round end is saved, solved or not (review fix 5).
- **Board: 7×7** (picked for 7 colors: about 7 valid swaps per board; stuck after 1% of moves). Recheck with 6 colors in the prototype: 6×6 then has about 7 valid swaps and bigger gems.
- **12 animals per round**, all from the place. ~~Keeping today's look-alike ramp~~ Ramp dropped (review): with about 20 animals per continent, look-alikes show up anyway.
- **Places: no countries.** A place is a broad area whose animals are the round's whole pool (mystery and all candidates). A country is never the pool (and there's no trail card for now). This needs a much bigger animal pool.
  - The IUCN range files on disk (`~/data/iucn/shp`) already cover about 15,000 species: 5,642 land mammals, 144 freshwater mammals, 3,494 frogs, 754 salamanders, 138 turtles, 23 crocodilians and 4,860 lizards and snakes. So ranges aren't the bottleneck; sourced profiles (traits plus field notes) are.
- **Field notes:** the mystery's hand-written clues in file order, then its fun facts. No matching dots on cards. 3/4/5+ matches give 1/2/3 notes.
- **Answers cross out cards automatically.** Idea #3 (kids cross out cards themselves) stays for later.
- **Phone flow:** tap a card to open its field guide with a Guess button; tap a charge chip to open that category's questions.
- **Name: Critter Connect everywhere players look.** Players never see the word "clue"; they see answers and field notes. "Clue" can stay in file names, code and database columns.
- **Growing the pool: its own plan (042, to write).** First, a research pass on open trait databases for mammals, amphibians and reptiles (license, coverage, how their values map to our traits). Then fill shared traits from them, plus IUCN habitats and ranges. An animal is playable only once it has at least 3 hand-written field notes. Plan 041 can ship with the continents that already have enough animals.
- **Sources for players:** every answer and field note shows where it comes from, so a player can check it and read more. The animal files already cite a source for every trait, clue and fact.
- ~~**Taxonomy mode** (a setting with a genus bonus row).~~ Dropped: replaced by the family tree.
- **Clear, understandable language comes first** in everything players see. The game is Critter Connect, at play.critterconnect.org.
- **Places are continents.** A continent is playable once it has 12 animals; smaller ones show "coming soon". Today that's Africa (20) and Asia (19). Goal: 20 each.
- **Range questions ask about regions inside the continent** ("Does it live in East Africa?"), from each animal's countries and the UN regions, in kid wording (`src/clueGame/regions.ts`: "Central Africa", not "Middle Africa"; Madagascar counts as East Africa). South America is a single UN region, so it will need its own split before it opens.
- **No trail card for now.** Naming a spot would give away where the animal lives.
- **Sources:** a small "Source: Animal Diversity Web" line under each answer and field note opens that page in a new tab. The reveal card lists every source for the animal.
- **Latin stays as it is today** in the field guide, the reveal card and the journal, and appears on the family tree. Genus is never a question category: it narrows the animals too fast.
- **Page address: play.critterconnect.org/explore.** The old /clue-match links keep working.
- **6 moves per animal.** Bot test on 12 animals from Africa or Asia (moves to solve, median/p75/p90): careful asker who aims matches 4/4/5, random asker 5/6/8, worst asker 7/9/10. Saved solves will show if kids run out too often; if so, go to 7.
- **No continent chosen** (a direct link): animals come from the whole world.
- **Genus bonus: rethinking.** The chip design either gives the answer away or turns into reading. Owner idea: an expensive **family tree** paid with charges of any color (no gem of its own), revealing the mystery's kingdom → phylum → class → order → family → genus one step at a time. Measured: revealing class leaves about 6 of 12 animals, order about 2, family about 1. A round of 6 moves earns about 7 charges (about 8 with 6 colors).
- **The family tree** replaces the red Family tree gem and its yes/no questions. The board has 6 colors: Body, Habits, Habitat, Range, Life cycle and Field notes.
  - Shown free from the start: Kingdom Animalia › Phylum Chordata › ?
  - Bought one step at a time, in order, with charges of any color: **class 1, order 2, family 3** (tuned by the bot; history: 2/3/4 agreed, 2/4/6 after the Fable review, 1/3/4, then 1/2/3 after the Codex review made the bot fair). A step that can't rule anything out fills in free.
  - Genus and species fill in on the reveal card, so every round ends with the whole tree.
  - Paying: tapping "Buy" shows which charges it will use (colors with no useful question left first, then the biggest piles), for example "Uses 2 Habitat, 1 Body, 1 Range. Buy?"; one more tap confirms.
  - Each step reads rank, Latin name and plain name ("Order Pholidota: pangolins"). Write plain names for families that lack one (the aardvark's, the red panda's).
- **Genus bonus and its setting: dropped** (the ladder teaches taxonomy to everyone).
- **Next: update the prototype to this design** (12 animals from Africa or Asia, region questions, Field notes gem, ladder, forced guess, 6 moves). The owner plays it to settle the ladder prices and the board size before the real build.

## Review fixes (Fable review, 2026-09-27; all agreed by the owner)

1. **Family tree too strong.** Class + order for 5 charges solved about 45% of rounds with no questions. Target: climbing the family tree alone should do about as well as asking random questions, and clearly worse than asking good ones. Start at class 2, order 4, family 6; a step that can't rule anything out fills in free; tune the prices with the bot.
2. **Field notes gave answers away** (about 112 of 822 name their animal; 78 name a country). A note that names the animal (a word from its common name that no other animal's name has), its genus or species name, or one of its countries or regions is shown on the reveal card only. `npm run content -- check` warns about these so notes can be reworded ("Tigers can't purr" becomes "It can't purr"). Then recount animals with at least 3 usable notes.
3. **Repeatable numbers.** The rules live in one pure module, `src/clueGame/questionMatch.ts`, used by the prototype, the bot (`scripts/balance-041.ts`, seeded, prints the table) and later the game.
4. **Last move's charges.** At 0 moves you can still spend charges, then must guess (Decisions updated).
5. **Save every round:** solved or not, moves left, questions and answers, family tree steps bought, notes seen, animals standing at the guess, and a rules version. Update the privacy page wording.
   - **How (Codex review):** add an `outcome` column (`solved` or `lost`) to `clue_match_solves`; existing rows are backfilled as `solved`. The journal and progress readers (`src/app/api/clue-game/journal/route.ts`, sightings, best moves, place progress) count only `solved`, so a lost round never shows as a discovery. E2E covers syncing both solved and lost rounds.
6. **One source for geographic labels (owner's rule).**
   - Each animal's countries come from IUCN **countries of occurrence**, with an explicit presence and origin rule (to settle when the data arrives; likely extant or probably extant, native or reintroduced). Its continents and regions come from those countries (`src/clueGame/regions.ts`).
   - The range polygons stay the authority for where the globe places encounters.
   - The content build flags every disagreement between the country list and the map for review.
   - The labels are written into the animal files during the content build. It needs a database connection only if it reads those records from the database.
   - **Owner task:** download the IUCN countries of occurrence for the game's animals (a Red List search export with `countries.csv`, or an API token). Neither the disk nor the database has them. Until then the prototype uses today's country lists, which come from the range maps and may disagree (the database view puts the cheetah and African spurred tortoise in Asia; three animals have no countries at all).
7. **Phone layout, no scrolling:** top bar, square board, one row of charge chips, one family tree line, 12 animals as a 4×3 grid of photo tiles. Questions and the field guide open as bottom sheets. The latest answer shows on one line, and the full list opens in a sheet. The e2e "no page scroll" check stays.
8. **Every card comes from the place** (code change in `createRound`).
9. **Sources:** add source columns to the pool data. A question's answer cites the trait's source; region answers link the animal's Red List page; family tree steps cite IUCN.
10. **Minor, agreed:**
    - Standing bonus +10 per animal (was +20).
    - When field notes run out, a match shows "No more field notes".
    - Keep the "No record for: …" line, and offer only questions that can rule something out.
    - Every chip, question, step and source link is a keyboard-reachable button, and answers are read out in the live region.
    - E2E gains `__cc.ask()` and `__cc.buy()`. New invariants: charges never below zero, the guess is forced at 0 moves, the mystery is never crossed out.
    - The globe shows continents only; old country sightings count toward their continent.
    - A lost round shows the reveal card with "Out of moves: it was the …!" and 0 points.
    - Remove the word "clue" everywhere players see it: TopBar, HowToPlay, GemLegend, ClueFeed, GlobeScreen links and the privacy page.

## Built 2026-09-27 (after the review)

- **Rules module:** `src/clueGame/questionMatch.ts` (pure). `src/clueGame/questionMatchContent.ts` turns profiles into its data (traits, regions, family tree names, round-safe and reveal-only field notes, sources). `src/clueGame/regions.ts` maps every country to a UN region, with kid names, and a continent (from Natural Earth; checked in).
- **Field-note filter:** notes naming the animal (its full common name, a name word no other animal has, its genus or species name, or one of its countries or regions) wait for the reveal card; 138 of 822 notes. Every animal keeps at least 4 notes that are safe during a round.
- **Bot:** `node scripts/run-typescript.mjs scripts/balance-041.ts [--moves 6] [--prices 1,2,3] [--rounds 400]`. Every strategy plays the same seeded rounds and boards (real board code, 7×7, 6 colors). It ends with a line per continent: **on target** means the family tree alone solves within 5 points of random questions, and careful questions beat both. Solved rate (Africa / Asia, 400 rounds, fair bot):

  | Moves, prices | Careful | Random | Worst | Family tree only | Target |
  |---|---|---|---|---|---|
  | 6, 1/3/4 | 100 / 99% | 93 / 95% | 80 / 80% | 86 / 92% | off (Africa −7) |
  | 6, **1/2/3** | 100 / 100% | 95 / 96% | 83 / 85% | 94 / 94% | on |
  | 5, 1/2/3 | 99 / 99% | 92 / 87% | 75 / 76% | 91 / 91% | on |
  | 5, 2/3/4 | 98 / 96% | 90 / 85% | 73 / 75% | 74 / 76% | off (−16 / −8) |

  - **1/2/3 is the default:** on target at both 6 and 5 moves, and the price still rises each step.
  - **Owner call:** 6 moves is generous (random askers solve 95–96%). 5 moves gives more tension (random 87–92%, worst 75–76%) at the same prices. ~~5 moves with 2/3/4~~ was off target once the bot was fair.
- **Prototype rebuilt** on the shared rules and the real board code, with the phone layout from review fix 7. It fits a 390×844 screen without scrolling.
  - Knobs: moves, animals, family tree prices, standing points, board size.
  - Interim geography: today's country lists; Darwin frog, Livingstone's flying fox and Hispaniolan solenodon have no region yet (review fix 6).

## Built into the game (2026-09-28)

The prototype, with every tweak above, is now the game at `/explore` (docs/CLUE_MATCH.md, Rules). It uses the same rules file and board code as the prototype and bot.
- **Content comes from the database pool.** `animalsFromPool` in `questionMatchContent.ts` builds the same data as `animalsFromProfiles` (checked: 62 animals, 0 differences apart from source names). Hand-written clues are told apart by `isHandWrittenClue` (0 misclassified of 1,928), so no schema change was needed. The pool now sends each clue's source and each fact's id.
- **Board:** 5×5, 5 colors plus the glowing note gem; a fresh seeded board each animal.
- **UI:** charge row (🔒 notes, 🌳 tree), latest answer, 4×2 animal tiles, sheets for questions, field guide, family tree, notes and log, the spend panel over the board, and a new reveal card (whole family tree, saved notes, every source).
- **Globe:** continents only, "coming soon" under 12 animals. `/clue-match` redirects to `/explore`.
- **Saved rounds (review fix 5):** migration applied to the production database (additive; the old app still works): `outcome`, `rules_version`, `moves_left`, `standing_at_guess`, `notes_saved`, `tree_steps`, `questions`. The journal counts only solves; `db/schema.sql` and `07_solve_stats.sql` are updated.
- **Checks:** `npm run e2e` 103/103, including a careless round covering a wrong guess and a last-chance solve; typecheck, lint and `npm test` (18) pass. The old round, session and selector code and its tests are gone; the content validation test is kept (`tests/clueGame/content.test.ts`).
- **Not done:**
  - IUCN countries of occurrence (review fix 6, owner download); countries still come from the range maps.
  - Plan 042: grow the pool in family groups.
  - South America needs its own region split before it opens.
  - Confirm 4 moves.
  - Nothing committed or deployed; the prototype can move to a throwaway branch at commit time.

## Part 14 (2026-09-29): fixes from the code review of 041-5

Codex started the review and ran out of credits; Fable finished it (`/tmp/fable-review-041-5/report.md`). Typecheck, lint, tests and the bot numbers all reproduced. Owner: "yes" to fixing the four bugs and the docs, and to pooling the toy payout with a callout.

**Bugs fixed:**
1. **A move kept animating on the next animal's board** (a phantom toy, gems that didn't match the model) when the player named the animal and tapped Next animal while gems were still falling. It had been possible since 041-1; toys made cascades longer.
   - Fix: `BoardController` counts boards (`resetInput` bumps it), and `resolve` stops at the next pause once the board is replaced.
   - New e2e check: start the next animal mid-move, then compare every sprite's texture (`state().view`) with the model. It fails with the fix turned off (checked) and passes with it on.
2. **Two-toy combos drew in the wrong place:**
   - a cross showed one beam on the wrong line;
   - the 5×5 showed a 3×3 ring.

   Fix: a combo is now one `Fire` with `combo: 'cross' | 'square' | 'board'` and the whole clear as its cells, and the other toy is used up rather than set off again. `BoardView.animateFires` draws from the shape. Unit tests for all four combos were written before the change (32 tests).
3. **Sound left on stayed silent on iOS until toggled.** Fix: `sfx.wakeOnFirstGesture` resumes audio on the page's first tap or key press.
4. **The dev bridge listed only matching swaps,** so the e2e never played a color gem or a combo and could stall on a board whose only move was a color gem. Fix: `validMoves()` lists every move, with `trigger` for toy-only swaps, and the e2e plays one when it shows up.

**Toy payout (was 0.07 charges a round):** every 3 gems a toy clears outside a match, all colors together, earn 1 charge of the color cleared most, with a "+1 charge" callout. Bot, Africa / Asia / world:
- first try: careful 94 / 94 / 83, random 79 / 78 / 62;
- solved: careful 98 / 98 / 91, random 88 / 88 / 73;
- about the same as before the change.

**Also:**
- the fire effect's pause is a tracked tween, so a new board ends it;
- labels read charges from `Rules.perMatch`;
- one answer sound per update, even when several answers are asked at once;
- docs: the color + blast combo rule, "all 12 are mammals", a leftover 041-4 line, and the playtest skill.

**Checks:** e2e 106/106; typecheck, lint, `npm test` 32.

**Open:** "blast gem" is borderline against the no-violent-words rule. Owner's call (another name: "burst gem").

## Owner changes, part 13 (2026-09-28): toys, feel, and 12 look-alikes (041-5)

The owner shared two notes.
- **What makes match-3 fun:** one swap then the board keeps going; a big match leaves a toy; setting a toy off is the best moment; a goal you can see; the place you match matters; the pop feels good. The note found our board missing three of these: toys, a visible goal, and sound.
- **An industry guide to match-3 games.** Owner choices: build feel plus toys now; gems a toy clears earn charges, then rebalance; sound off by default.

**From the guide, used:** specials and combos; quick animations; clear, simple pieces; difficulty from the board and the round rather than just fewer moves; not interrupting play.
**From the guide, not used:** its money side: near-miss levels built to sell extra moves, streaks built to scare players into paying, fake ads, and "a casino behind the scenes". This is a game for grades 6–12 with no store, and knowing animals is the skill.

**Built:**
- **Toys** (`BoardModel`: `Special`, `ExplodePhase.made/fired/cleared`, `canSwap`, `loadBoard`):
  - A straight 4 leaves a line gem (clears its row or column), an L or T a blast gem (clears the 3×3), a straight 5 a color gem (swap it with any gem to clear that color; it never matches).
  - Two toys swapped together make a big clear (a cross, a 5×5, or the whole board), and a toy in another toy's clear goes off too. Toys fall with their gems and survive a reshuffle.
  - Gems a toy clears outside a match earn 1 charge per 3 of a color (`Rules.perBlast`).
  - Looks: `toyTextures.ts` draws bars and arrows, a ring, and a five-color disc over the gem icons. Effects: a beam, a ring, sparks.
  - Board rules tests (`tests/game/boardModel.test.ts`) were written before the code and list 11 ways toys could break (28 tests in all).
- **Feel:**
  - Every match pops, higher through a chain, with a "Chain ×2!" callout; big matches and toys shake the board.
  - Animations run about 25% faster.
  - Synthesized sounds (`sfx.ts`: pops, toys, answers, wrong guess, solve) sit behind a speaker button in the top bar. Off by default, remembered on the device.
- **Rebalance (rules 041-5):** 12 look-alike animals a round (the tiles get smaller photos past 8, so 12 fit on a phone), still 4 moves so toys have room.
- **How to play** explains toys (key v6).

**Bot** (400 rounds; Africa / Asia / world). Toys alone barely changed the economy (charges a round about 4.4–4.8, as before), because a round makes about one toy.

| Rules | First try: careful | First try: random | Solved: careful | Solved: random |
|---|---|---|---|---|
| 041-1 + toys, 8 relatives | 97 / 95 / 93 | 90 / 88 / 83 | 99 / 98 / 97 | 95 / 96 / 91 |
| … 12 animals | 95 / 91 / 87 | 82 / 82 / 73 | 98 / 97 / 94 | 89 / 88 / 82 |
| … 3 moves | 87 / 90 / 84 | 78 / 80 / 73 | 95 / 95 / 91 | 88 / 90 / 82 |
| **041-5: 12 look-alikes, 4 moves** | **94 / 94 / 83** | **78 / 79 / 65** | **98 / 98 / 91** | **88 / 89 / 75** |

**Checks:** e2e 107/107: each round has 12 animals, the sound button starts off and works, a big match leaves a toy, matching a toy sets it off, no page scroll. Typecheck, lint and `npm test` (28) pass.

**Not built yet** (the owner chose feel plus toys first):
- a goal you can see move: an animals-left meter and a "Last move!" warning;
- a streak reward: a toy on the next board after 3 solves in a row;
- blockers.

## Owner changes, part 12 (2026-09-28): the other versions removed

Owner: "yes, delete these" (041-2, 041-3, 041-4).
- **Removed from the code:**
  - the pick and earn loops and their rule fields (`loop`, `bigMatch`, `cascadeColors`, `answers`, `aimLock`), `RULE_SETS` and `?rules=`;
  - the pick panel, the aim line and sheet, and the chip dots;
  - the board events `clue-board-settled`, `clue-board-options` and `clue-board-highlight`, and the board dimming;
  - the "nothing to ask" log entry;
  - the bot's `--rules`, `--big-match`, `--own-color`, `--answers` and `--aim`;
  - the e2e's `E2E_RULES`.
- **Kept:**
  - the charges loop (041-1), unchanged;
  - leaving out an animal no question can tell apart from the mystery;
  - the "No record" wording;
  - the `last_chance` column;
  - the bot's first-try and last-chance columns and its "careful questions, random swaps" player;
  - the `--look-alikes` bot flag, for trying look-alike rounds on the charges loop.
- **Saved rounds** in the database keep their `rules_version`: rows from e2e runs of 041-2 to 041-4 are still there.
- **The design history** stays in parts 8–10 and `plans/041-board-reviews.md`.

## Owner changes, part 11 (2026-09-28): back to charges

Owner, after playing 041-4: "this is too clunky, selecting each one is too much work. i like the charge system we had. revert the game back to the charge system."

- **The default rule set is the charges loop again** (041-1, as built in part 7): 4 moves; matches bank charges (1/2/3 for a match of 3/4/5+); questions any time; a family tree step for one charge of each color; automatic questions when there's no choice; the spend panel at 0 moves; closest-relative rounds.
- **Kept from later parts,** because they apply to every rule set:
  - an animal no question can tell apart from the mystery is left out of a round;
  - "No record" reads "the field guide doesn't say";
  - saved rounds record `last_chance`;
  - the bot reports first-try and last-chance solves, plus a "careful questions, random swaps" player.
- **041-2, 041-3 and 041-4 stayed playable** at `?rules=` until part 12 removed them.
- **How to play** shows once more (key v5).
- **Checks:** e2e on the default (charges) 104/104; typecheck, lint, `npm test` pass.
- **Open from the reviews:** the original complaint that random tapping solves (careful 99 / 99 / 97, random 95 / 96 / 92). Ideas that fit the charges loop are listed in `plans/041-board-reviews.md`:
  - show weak questions too;
  - 12 animals;
  - a 4+ match gives the move back;
  - a 6×6 board;
  - specials as field tools;
  - reading notes before the final guess.

## Owner changes, part 10 (2026-09-28): pick, then earn it (041-4, to try)

Owner: "build pick then earn as 041-4", after the round-2 reviews (`plans/041-board-reviews.md`). Codex backed it with safeguards; Fable and Grok advised against it. It's built as its own rule set, `/explore?rules=041-4`. The default stays 041-3 until the owner compares them.

**The rules:**
- **Pick a question first** (the aim): tap a color, then **Aim** on one of its questions. The board stays locked until you aim.
- **A match of the aimed color** anywhere in the move (falling gems too) asks it when the board settles. Other colors ask nothing.
- **The aim stays until it's asked** (`aimLock`). With free re-aiming the board stops mattering: careful questions with random swaps narrow 76 / 76 / 65, almost the same as careful play at 81 / 82 / 66.
- **8 moves, at most 3 answers** (Codex, Grok). The round moves to the guess screen when the answers run out, when nothing is left to ask, or when one animal is left ("No answers left!", "Nothing left to ask!", "One animal left!").
- **"No record" answers:** the match still counts, so a new aim of the same color is asked at once.
- **As in 041-3:** a match of 4 or more saves a field note; look-alike rounds; the family tree fills in by itself.

**On screen:**
- The aim line under the color chips: "🎯 Is it huge (over 300 kg)? Match Body gems to ask it. 3 answers left."
- The board dims every other color.
- The aimed chip glows, and a green dot marks each color a swap can match right now. The board reports these after every move (`clue-board-options`).
- No panel covers the board.

**Bot** (`--rules 041-4`, 400 rounds; Africa / Asia / world):

| Player | Narrowed to one | First try | Moves that asked nothing |
|---|---|---|---|
| Careful (aims its swaps) | 74 / 77 / 57% | 86 / 88 / 73% | 55% |
| Careful questions, random swaps | 47 / 52 / 36% | 68 / 69 / 60% | about 70% |
| Random | 25 / 22 / 19% | 45 / 41 / 42% | 70–72% |
| *041-3, for comparison: careful* | 70 / 70 / 56% | 84 / 84 / 72% | 6–11% |
| *041-3: careful questions, random swaps* | 42 / 47 / 35% | 67 / 71 / 59% | |
| *041-3: random* | 34 / 33 / 25% | 54 / 57 / 48% | |

- **Difficulty:** about the same as 041-3 for a careful player, and harder for random play.
- **Board skill** is worth about 25 points in both.
- **Wasted moves:** more than half of a careful player's moves ask nothing (Fable and Grok's main warning), against 6–11% in 041-3.
- **Notes:** big matches over 8 moves save about 3.4 notes a round, so the last chance is almost always there.
- **Other settings tried:**
  - 6 moves: too hard (careful 52 / 53 / 44).
  - A 6×6 board with 6 moves: about 041-3's difficulty with fewer wasted moves (careful 71 / 74 / 54, careful questions with random swaps 32 / 27 / 21, random 17 / 18 / 16). It needs board-size plumbing, since the board is 5×5 everywhere today.

**Checks:**
- e2e `E2E_RULES=041-4`: 147/147 on seed 7 and 165/165 on seed 11 (last-chance solves and losses). Each move: at most one answer, a matched aim is asked, never more than 3 answers, and the mystery never crossed out. Aiming unlocks the board and shows the question, and the aimed color stands out.
- 041-3 still passes 120/120.

**For the owner to judge:** play `/explore?seed=1&rules=041-4` against `/explore?seed=1`.
- Keep 041-4 if lining up the aimed color feels like a puzzle.
- Drop it if the dead moves feel like waiting ("the game won't give me green").
- If it's close, try 6×6 or Codex's reposition tool (swap two neighbors without a match) next.

## Owner changes, part 9 (2026-09-28): a quieter big match, harder rounds

Owner, after playing 041-2 and 041-1: "bonus pick is too distracting. have it do something low quality that isn't that helpful but is nice for the player", and "i am still getting to 1 critter very easily."

**Why rounds were easy:** in 041-2 a careful bot narrowed to one animal in 97 / 95 / 91% of rounds (Africa / Asia / world), with only 2.3 questions. Four moves plus bonus picks gave a thoughtful player answers to spare. The candidates also come from different families (Africa's 20 animals sit in 18), so each question splits them cleanly.

**What changed (rules 041-3, the default):**
- **A big match saves a field note.** It's automatic and crosses nothing out; the notes are there for a last chance and show whole on the reveal card. No more "Pick 2".
- **3 moves.**
- **Look-alike rounds:** after the closest relatives, the animals that share the most traits with the mystery. This is the nearest the current content gets to the owner's "deduction between close relatives".
- **Every round can be narrowed to one.** An animal no question can tell apart from the mystery is left out. This applies to every rule set; Fable found about 7% of Asia rounds couldn't be narrowed.
- **The family tree fills in by itself** (free steps) and shows whole on the reveal card. Playing with it moves to the family tree challenge side mode (Later).
- 041-2 stays playable at `?rules=041-2`.

**What we tried** (bot, how often a careful player narrows to one; Africa / Asia / world):

| Rules | Careful narrows to one |
|---|---|
| 041-2 (bonus pick, 4 moves) | 97 / 95 / 91% |
| Big match saves a note, 4 moves | 94 / 88 / 83% |
| … + look-alikes | 90 / 89 / 74% |
| … 12 animals, 4 moves | 79 / 77 / 69% |
| … only the move's own color (cascades add none), 4 moves | 89 / 84 / 80% (more wasted moves; dropped) |
| … 3 moves | 72 / 66 / 66% |
| **… 3 moves + look-alikes (041-3)** | **70 / 70 / 56%** |

**041-3** (bot, 400 rounds, 8 animals; Africa / Asia / world):

| Player | Narrowed to one | First try | Solved (last chance included) |
|---|---|---|---|
| Careful | 70 / 70 / 56% | 84 / 84 / 72% | 95 / 97 / 89% |
| Random | 34 / 33 / 25% | 54 / 57 / 48% | 75 / 75 / 66% |
| Worst | 24 / 26 / 26% | 41 / 42 / 41% | 52 / 57 / 51% |

- **The gate passes for the continents.** The first-try gap is 24–31 points. A careful player finds nothing to ask on 6 / 6 / 11% of moves: "Anywhere" (the whole world) is just over 10%, because its look-alike rounds are very similar animals.
- **Checks:** e2e 120/120 (seed 7) and 126/126 (seed 11, with last-chance solves and losses); 041-2 141/141; 041-1 104/104.

**Open:**
- **The last chance with two animals left is a free second guess.** After one wrong guess only one animal is left, so the saved notes don't get read. Option (Codex): open the notes at 0 moves, before the final guess, so reading them decides it.
- **Another "nice" big match:** a fun fact about an animal you already crossed out. It helps nothing and teaches something.
- **"Anywhere" wasted moves** (11%).

## Owner changes, part 8 (2026-09-28): one question a move

**Why.** Owner: "when i unlock a lot of clues, i can just click on all of them randomly and spend them, and end up with 1 species easily. so there was no real strategy required." Fable, Codex and Claude reviewed the game on their own and agreed on why:
- **Answers were cheap.** A round earned about 5 charges; 8 animals need about 3 good questions. Every question offered helps, and the game crosses animals out for you.
- **The board was only income:** any color bought progress.
- **Some rules did nothing useful:**
  - The bots almost never bought a family tree step (one of each).
  - Automatic questions fired on about 1% of questions.
  - The last chance added 7–9 points of blind wins for random play.
- **A bigger pool alone doesn't fix it,** because rounds stay at 8 animals. Africa's 20 animals also sit in 18 families, so "closest relatives" mostly means "also a mammal" until plan 042.

**What changed (rules 041-2, the default):**
- **One question a move.** Each move earns one question, picked from the colors it matched once the board settles (cascades add colors). Nothing is banked, so this loop has no charge counts, spend panel or automatic questions.
- **Bonus pick.** A match of 4 or more earns a second pick: another question, or the next **family tree** step. This replaces "one charge of each color".
- **No choice, no tap.** When the questions on offer fit in the picks, they're asked for the player (part 7's rule, kept).
- **Nothing to ask.** A move whose colors have no useful question left says so: "Nothing to ask: no Range question can cross out an animal left. Match another color next time." Each color chip shows how many of its questions can still cross out an animal, so a player can aim.
- **Out of moves,** the panel over the board lists what the round found out, for the guess.
- **Field notes and the last chance stay** (part 5). Saved rounds now record whether a solve came on a last chance (`last_chance`), and the bot reports first-try solves separately.
- **Copy:** "No record" now reads "the field guide doesn't say, for this animal". Codex pointed out that "scientists haven't recorded that" claims more than the guide knows.
- **The first build stays playable** for comparison at `/explore?rules=041-1`, and so does the prototype file.

**Bot** (`balance-041.ts`, 400 rounds, 8 animals; Africa / Asia / world):

| Rules | First try: careful | First try: random | Solved: careful | Solved: random | Solved: worst | Narrowed to 1: random |
|---|---|---|---|---|---|---|
| 041-1 charges, 4 moves | 97 / 93 / 92 | 91 / 86 / 83 | 99 / 99 / 95 | 95 / 95 / 90 | 85 / 90 / 88 | 82 / 76 / 70 |
| **041-2, 4 moves** | 99 / 97 / 95 | 80 / 78 / 77 | 100 / 100 / 97 | 92 / 91 / 88 | 75 / 82 / 73 | 70 / 62 / 63 |
| 041-2, 3 moves | 93 / 93 / 89 | 63 / 65 / 62 | 97 / 98 / 95 | 77 / 79 / 76 | 61 / 66 / 60 | — |

- **The gate (Codex's) passes.**
  - Careful beats random by 15+ points on first-try solves: 18–20 points.
  - A careful player finds nothing to ask on under 10% of moves: 3 / 7 / 9% (random players 10–12%).
- **Random still solves about 90%** because the last chance rescues 11–14% of random rounds. Without note gems, random solves 84 / 81 / 74%.
- **Family tree steps a round:** careful 0.4, family tree fans 0.6 (who solve as often as careful players), random 0.1.
- **Aiming matters now.** In the throwaway sims, swaps aimed at the color whose question you want beat random swaps with the same good questions by 6–21 points; chasing big matches helped little.

**Owner to test:** play 10 rounds of each, `/explore?seed=1` and `/explore?seed=1&rules=041-1`. Keep 041-2 if choosing a color and a question feels like thinking, and pick 4 or 3 moves.

**Open (from the reviews, not built):**
- **"You cross them out"** (Guess Who; Fable and Claude): answers stop crossing animals out, and the player flips the tiles.
  - Fable's bot: success tracks knowledge. Knowing 30% of traits narrows to one about 40% of the time; knowing 90% comes close to the best possible play.
  - Risk: a beginner reads about 9.5 field guides a round. Try it next, as an optional mode.
  - Codex would instead keep automatic crossing out and add one "which of these two lays eggs?" question a round.
- **A move with nothing to ask** could save a field note instead (Fable).
- **Notes as riddles** (Fable): spend a pick on a field note instead of a question. About 3 notes a round point only at the mystery.
- **"Connect the animals"** (Codex): pick 3 animals that share a trait; the trait is the match rule. Paper test first.
- **Content, needed for any design:**
  - Fill missing social, lifespan and activity traits. In Asia, 7% of rounds can't be narrowed to one animal.
  - Close relatives need facts that tell them apart: the Indian and Sunda pangolins share all 7 broad traits.
  - Plan 042 grows the continents in family groups.

## Owner changes, part 7 (2026-09-28): automatic questions when there's no choice

- **A color's questions are asked for the player** when its charges cover every useful question of that color, with one charge to spare while the family tree still needs one of each color. Once the tree is complete, exactly enough is enough. The answer line says "(Asked for you: your Range charges covered every Range question.)"
- It applies after every match, answer, family tree step and wrong guess. Answers shrink other colors' lists, so it chains, and it stops as soon as no question of that color can cross anything out. Example: 5 Range questions and 6 charges: 2 answers were enough, and 4 charges stay.
- Rules: `autoAsk()` in `questionMatch.ts`, `Rules.autoAsk` (on). Bot (400 rounds, Africa / Asia solved): careful 99 / 99%, random 95 / 95%, worst 85 / 90%.

## Owner changes, part 6 (2026-09-28): a spend panel when moves run out

- **Out of moves, the board turns into a "Spend your charges" panel**, same size and place as the board, so the animal tiles stay on screen. It lists every question the player can still pay for, grouped by color with its charge count, one tap each, plus the family tree button when a set is ready. It ends with "Nothing left to spend. Tap an animal below to guess."
- **On a last chance, the same panel shows the opened field notes** (the notes sheet no longer pops up).
- Real build: the Phaser board can stay mounted underneath; the panel is React over the board's area.

## Owner changes, part 5 (2026-09-28): field notes are a last chance

- **Note gems save field notes, sealed** (the chip shows "🔒 2"). They aren't read during the round.
- **Last chance:** if the final guess (at 0 moves) is wrong and at least one note was saved, the round doesn't end. The saved notes open (with blanks, source links still locked) for one more guess. Wrong again: the round is lost. No notes saved: a wrong final guess ends the round as before. A wrong guess with moves left still just costs 2 moves.
- **A last-chance solve scores 50 only** ("Solved on a last chance"): no bonuses for moves or animals left; the wrong guess already cost 30 points and the streak.
- Solved without them? The saved notes show whole on the reveal card, so they still teach.
- Bot (4 moves, 8 animals, one of each; its last chance is a blind second guess): solved Africa / Asia: careful 99 / 99%, random 96 / 94% (was 90 / 87%), worst 85 / 90% (was 81 / 80%). More forgiving; points still separate skill (careful 86–87, random 80–82, worst 73–77). If it's too forgiving: require 2 saved notes, or make the last chance a pick from 2 animals.
- Rules: `RoundStatus` gains `'last-chance'`; `RoundState.notesCollected`; `guess()` opens the notes.

## Owner changes, part 4 (2026-09-28): field notes with blanks

- **Field notes blank out every word that would name the animal** (owner: "words like 'frog' … are not present"), fill-in-the-blank style: "It lives in a pack, but each ____ hunts on its own." Blanked words:
  - its common-name words (not generic ones like "giant" or "tree");
  - its group words from its order and family plain names (frogs, toads, cats, wolves, pangolins, primates…), plus mammal, amphibian or reptile, in singular and plural, including -let and -ling forms (froglets);
  - its Latin names (genus, species, family, order, class);
  - its countries and regions.
- A note with more than 2 blanks waits for the reveal card (9 of 822). 216 notes show with blanks and 597 are clean; every animal keeps at least 6 notes for rounds. After the round, the log and the reveal card show every note whole, so a kid can check the missing word. This replaces the earlier hold-back filter (review fix 2), except for the too-many-blanks case.
- Code: `censor()` in `src/clueGame/questionMatchContent.ts`; `FieldNote.full` carries the whole note.

## Owner changes, part 3 (2026-09-28): one of each, locked source links

- **The family tree costs one charge of each color per step** (Body, Habits, Habitat, Range, Life cycle). It's a set to collect, not a pile to save: the family tree line shows what's still missing ("Order · need 🗺️🥚"), which pushes players to match every kind of clue, and it fits the theme (every kind of evidence places an animal in its family tree). The 8-charge and big-match options stay as a rules setting and a designer-view switch. Bot (4 moves, 8 animals, 400 rounds, Africa / Asia solved): careful 97 / 94%, random 90 / 87%, worst 81 / 80%. Family tree fans solve 91 / 85% with about 0.4 steps per round; nobody else buys one.
- **The family tree is a small 🌳 chip** in the charge row (progress like "3/5" colors collected; it glows when a step is ready). Tapping it opens a sheet with the tree so far, what's next and the button to reveal it. There's no family tree row anymore, which frees space on a phone.
- **Free steps are marked as free** ("Class Mammalia (mammals): every animal left is one, so it came free"). A round of close relatives is often all mammals, so class fills in at the start. That tells the player the mystery is a mammal, but every card on the board is one, so it narrows nothing. The sheet says so, so it doesn't read as a clue.
- **Source links open only after the round** (owner rule). Source pages name the animal (for example `animaldiversity.org/accounts/Canis_simensis/`), so during a round answers and field notes show the source's name with no link at all (not even an address to hover over). The reveal card and the log link out once the animal is named or the round is lost. This applies to the real build too.

## Owner changes, part 2 (2026-09-28): note gems, an expensive family tree

- **Field notes are a rare gem.** It never matches by itself; it's collected when a match happens next to it (up, down, left or right), giving one field note per gem. About 5% of new gems are note gems (a few per board); rounds give about 1–2 notes. The board has 5 matching colors (Body, Habits, Habitat, Range, Life cycle) plus the note gem. This is in the real board code as an option: `BoardModel.newBoard(seed, colors, { type, chance })`; the real game doesn't use it, so its boards are unchanged (e2e 46/46).
- ~~**The family tree costs 8 charges of any color per step**~~ (superseded by part 3: one of each; owner's first idea): about a round and a half of charges. Only a player who saves for it gets a step, and it costs them. Bot at 5 moves: family tree fans get about 0.5 steps per round but solve 83–84% (others 89–100%) and score about 66 points (others 84–97). Normal players never buy one. Alternatives kept as a rules setting (`familyTree.cost`) and a prototype switch:
  - **one charge of each color:** a set to collect; fans get about 0.7 steps per round and solve 89–93%;
  - **a big match (4+):** was too easy (0.3–0.6 steps per round without trying).
- **4 moves** (owner to confirm): the 5-color board makes more matches, so 4 moves now gives the tension 5 gave before. Bot, 8 animals, Africa / Asia solved: careful 97 / 94%, random 90 / 87%, worst 81 / 80%; family tree fans 87 / 84% with about 0.3 steps per round.
- Defaults in `DEFAULT_RULES`: 4 moves, 8 animals, family tree 8 charges. Bot: `--tree one-of-each|charges|match --tree-charges 8 --notes-chance 0.05`.

## Owner changes (2026-09-28): rare family tree, small board, fewer and closer animals

- ~~**Family tree: earned, not bought.**~~ (Superseded by part 2: too easy.) Any match of 4 or more gems (any color, cascades included) reveals the next step (class, then order, then family). Charges only buy questions. Steps that can't rule anything out still fill in free. Rare by design: about 0.2 earned steps per round when matching at random, 0.5–0.6 when aiming for 4-matches. (A special family tree gem you trigger yourself is the fancier version; it belongs with idea #5, special gems.)
- **Board 5×5**, 6 colors: about 4 valid swaps per board; it runs dry and reshuffles after about 7% of moves; a 4+ match on about 6% of moves.
- **8 animals per round, closest relatives first:** same family, then same order, then same class (ties at random), all from the place (`pickRound`).
- **Same-family rounds are the goal, and they need content.** Today only 3 of Africa's 20 animals share a family (tortoises) and 2 of Asia's 19 (pangolins). Plan 042 should grow the pool in family groups (all four African pangolins, both African elephants, a family of frogs…). Plan 040's next-batch list already starts on this (Temminck's pangolin, African savanna elephant).
- **Moves: 5 recommended** (owner to confirm; the prototype uses 5). Fair bot, 400 rounds, 8 animals, 5×5, solved rate Africa / Asia:

  | Moves | Careful | Random | Worst |
  |---|---|---|---|
  | 6 | 99 / 96% | 97 / 92% | 89 / 86% |
  | **5** | 97 / 94% | 91 / 86% | 80 / 81% |
  | 4 | 93 / 92% | 78 / 80% | 68 / 74% |

  With 6 animals the skill gaps shrink to 2–6 points (choosing well stops mattering); with 10 they widen, but rounds get longer.
- Superseded: the 12-animal round, the 7×7 board, and buying family tree steps with charges (prices 1/2/3). Review fix 1's target ("the family tree alone about as good as random questions") no longer applies, since the family tree can't be bought.

## Codex review (2026-09-28; all six fixed the same day)

Report: `/tmp/codex-review-041-report.md` (from the brief with every changed file). Verdict before fixes: "revise before merging the production swap change or treating prototype balance as final".

1. **Resizing mid-swap locked the real board.** Phaser destroys a killed tween without calling onComplete, so an awaited swap never finished. Fix: `BoardView` tracks its tweens and resolves their promises when it stops them. Checked in headless Chrome with Codex's repro (a non-matching and a matching swap, each resized mid-animation), then `npm run e2e` 46/46.
2. **Two notes still named their animal** (red panda, giant panda). Fix: the full common name is also a giveaway.
3. **A wrong guess didn't fill in free family tree steps.** Fix: `guess(book, state, id)` settles after a wrong guess that doesn't end the round.
4. **Range questions left the continent** (Asia rounds asked about Australia and New Guinea). Fix: rounds carry their place; Range questions only ask about its regions (world rounds: all).
5. **Saving losses would break the journal.** Plan updated (review fix 5): an `outcome` column, and readers count only solves.
6. **ISO codes:** Natural Earth uses `SDS`/`PSX` for South Sudan/Palestine. Fix: ISO aliases (SSD, PSE, ESH, ALA, XKX), and `animalsFromProfiles` warns about countries with no region instead of dropping them silently.

Plus the bot: shared deals per strategy and an explicit target tolerance (see Built).

## Later: side modes

### Family tree challenge (owner: "i like it", 2026-09-28)
A Metazooa-style side mode about the family tree:
- Guess any animal from the continent; there's no 8-animal round.
- Each guess shows how closely it's related to the mystery: its lowest shared rank (same class, same order or same family).
- Every animal that doesn't fit grays out. Find the mystery in a few guesses.

**Measured** (throwaway sim, about 5 guesses, whole-continent pool): best play finds it 85% of the time in Africa vs 72% for random guesses; 89% vs 77% in Asia; 54% vs 41% for the whole world. Showing five comparisons per guess instead made it too easy (about 2 guesses whatever you do). It gets harder, and rewards knowledge more, as plan 042 grows the continents in family groups.

**Why it fits:** it makes the family tree the whole game (the owner wanted taxonomy to be "a powerful deduction thing"). It reuses the family tree data, the photos, the globe's continents and the reveal card.

**Open:**
- Do matches earn the guesses, or does the mode drop the board?
- How to show the tree: maybe a diagram of the guesses that grows as you go.
- A daily version (`?seed=`).

Other side-mode ideas from the reviews: riddle rounds (field notes first), a daily "Field Kit" puzzle (a dealt hand of questions), and a two-player "Guide your partner" mode.

## Order

1. ~~Throwaway prototype of #1 + #2.~~ Done 2026-09-27; owner found it more fun.
1b. ~~Update the prototype to the agreed design.~~ Done 2026-09-27. Owner plays it and settles moves (6 or 5) and board size (7×7 or 6×6).
2. ~~Build it into the game; playtest; e2e.~~ Done 2026-09-28. Plan 042 (grow the animal pool) runs alongside; continents open as they reach 12 animals.
2b. ~~One question a move (parts 8–10).~~ Tried and removed (parts 11–12). ~~Toys, feel, 12 look-alikes (part 13).~~ Built 2026-09-28. Next: a goal you can see move (animals-left meter, last-move warning) and a streak toy; then pick from `plans/041-board-reviews.md`. The family tree challenge comes later (Later: side modes).
3. Then #5 and #4, then #6. The run structure goes last.

Keep it simple (AGENTS.md): add one mechanic at a time and cut what doesn't earn its place.
