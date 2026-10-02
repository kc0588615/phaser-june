# The Animal Board: How It Plays, How to Play It Well, and What It Teaches

*Critter Connect, rules 044-0 (branch `variant/044-animal-board`, plan `plans/044-animal-board.md`). Written 2026-10-01 from the built rules, the playable graybox at `/explore`, and the balance bot's results. Every success rate in this paper comes from simulated players, not from children; section 6 says what a human study should measure.*

## Abstract

Critter Connect is a phone-first match-3 game for grades 6 to 12 about real animals. In the animal board design, a mystery animal hides among five look-alike suspects that sit on the game board as photo tiles. Matching picture gems fills four clue orders; a full order answers one yes/no question about the mystery. The answers never eliminate anyone on their own. The player compares each suspect's own traits with the answers, marks the ones that cannot be the mystery, and then clears gems next to those tiles to release them from the board. Releasing every look-alike finds the mystery; marking the mystery by mistake lets it escape and loses the round. Earlier versions let the game do the reasoning and could be won by matching at random 70 to 90 percent of the time. In this design a simulated player who never reasons finds nothing, a player who marks at random wins about one round in five, and a careful player wins 95 to 97 percent. The paper explains the rules in full, describes strategies at the level of individual moves and whole sessions, and weighs the design's educational strengths against its risks.

## 1. Why the game is built this way

Critter Connect has been through several designs. In the versions before this one (rules 041-5 and 043-0), every match earned a "charge" that bought a question, and the game crossed out every animal the answer contradicted. The deduction happened inside the game. A player could match gems without reading anything and still watch the list of animals shrink to one. The balance bot, which plays thousands of seeded rounds with the real rules on the real board, measured this:

| Version | Careful player solves | Random player solves |
|---|---|---|
| 041-5 (12 animals, charges, 5×5 board, 4 moves) | 96 to 98% | 87 to 91% |
| 043-0 (gems ask their color's question, 7×7, 5 moves) | 91 to 93% | 71 to 72% |
| 044-0 (the animal board, this paper) | 95 to 97% | 0% (a random marker: 20%) |

The project owner set a clear goal: winning should require thinking, and random play should fail. The animal board meets that goal by moving the two decisions that matter, *who is ruled out* and *acting on it*, from the game to the player.

## 2. How a round works

### 2.1 Setup

1. **Five suspects.** The game picks a seed animal from the chosen continent and adds its four closest look-alikes: relatives first (same family, then order, then class), then the animals that share the most traits. If two candidates could never be told apart by any question the game can ask about this group, the second is skipped for the next look-alike. Only two pairs among today's 76 animals can never be told apart at all (the Dyeing and Golden Poison Frogs; the Saola and the Sumatran Orangutan, whose records barely overlap).
2. **Four clues.** The game deals four yes/no questions about traits that all five suspects have a record for, chosen so that every suspect has a different pattern of answers. The clues therefore always contain enough information to identify any of the five. They are chosen from the group alone, before the mystery is picked, so the choice of clues never hints at the answer. The deal prefers a mix of strong clues (splitting the five 2 against 3) and weak ones (1 against 4) and clues from different categories, and it never deals two clues with the same picture.
3. **The mystery.** One of the five is chosen at random.
4. **The board.** A 7×7 grid. The five suspects are pinned to cells at least three steps apart and never in a corner. Every other cell holds a gem.

The five suspect cards sit above the board. How to play frames each round with a neutral prompt that hints at nothing: "Our camera trap caught a blur. It was one of the 5 animals on the board."

### 2.2 The board

There are five gem types and one rare gem.

- **Four clue gems**, one per clue. Each keeps a distinct shape and color (ball, triangle, leaf, hexagon) and shows its clue's picture: an ant for "Eats mostly bugs?", a leafy green for "Eats only plants?", an arrow pointing east for "Lives in East Africa?". In the current graybox the pictures are emoji; drawn art comes later.
- **The pebble**, a plain gem that matches but belongs to no clue.
- **The witness gem**, a glowing purple sparkle (3% of new gems). It never matches by itself; a match next to it collects it.

The standard match-3 rules apply. Swapping two neighboring gems is a move only if it lines up three or more of a kind (or sets off a toy); any other swap slides back for free. Cleared gems fall and new ones drop in. Chains of matches that form as gems fall (cascades) are free.

**Toys** come from big matches: four in a line makes a *line gem* that clears its row or column; an L or T shape makes a *blast gem* that clears the 3×3 around it; five in a line makes a *color gem* that, swapped with any gem, clears every gem of that color. Two toys swapped together go off as one larger clear.

**Animal tiles** are pinned. They never move, never match, and cannot be swapped. Gems fall past them, behind the photo frame. A line gem's clear passes behind a tile without removing it.

### 2.3 Clue orders

Under the board, each clue has an **order tile**: its gem, its question, and a progress bar. Every clue gem cleared counts toward its order, whether it was cleared by the player's match, a cascade, or a toy. When an order reaches **24 gems**, the mystery's answer is stamped on the tile: *Yes* or *No*. The question's exact wording is kept ("Eats **mostly** bugs?"), because the qualifier matters: a chimpanzee eats some insects but mostly fruit.

After its answer, a clue's gems still match and still count as clears next to animals; they just add nothing more to the order.

### 2.4 The evidence a player can read

- **Answer chips on each suspect card.** Each card shows that animal's own answer to each of the four clues, as the clue's picture with a check or a cross. This is a small truth table: five rows of animals, four columns of clues.
- **The field guide.** Tapping a card opens the animal's field guide: its answers written out, its **signs** (short phrases from its record such as "digging claws" or "raids termite mounds"), and the written descriptions of its body, habits, habitat, range and life cycle.
- **Witness notes.** Each witness gem collected shows one hand-written clue from the mystery's own profile, with any word that would name it blanked out, and a count: "It digs into ant nests and termite mounds with its strong, spade-like claws. *The field guides of 2 of the 5 say this too.*" Only notes that fit two to four of the suspects are used, so a single note never names the animal. Working out *which* suspects fit is the player's job, by comparing the note with the signs.

### 2.5 Ruling out and releasing

The core action is **Rule out**, a button in each suspect's field guide. Marking is free, instant and reversible until the animal leaves the board. A ruled-out animal wears a red stamp on its card and a red ring on its tile.

**Only ruled-out animals can be released.** A ruled-out animal is released, and hops off the board, when any gem next to its tile (up, down, left or right) is cleared, by any means: the player's match, a cascade, or a toy. Unmarked animals are never released, whatever happens around them. Its cell then becomes an ordinary cell that fills with gems.

Before committing a swap, the player can tap a gem: the board outlines in amber every ruled-out animal that a swap from that gem would release. This **release preview** shows consequences, never correctness.

**If the mystery is ruled out and then released, it escapes and the round is lost.** This is the only way to lose a round through play, and it always traces back to a wrong conclusion, never to a stray swipe.

### 2.6 Winning, losing and scoring

- **Found:** every look-alike has been released; the last animal on the board is the mystery.
- **Escaped:** the mystery was ruled out and released. Lost.
- **Out of moves:** after 30 moves with look-alikes still on the board, the round is lost. The player may still name the animal; a right name is recorded in the journal, but it saves no heart and earns no star. (A blind guess among five wins one time in five no matter what happens on the board, so naming cannot be what wins a round.)

A find earns stars by the moves left: ★ for a find, ★★ with 6 or more moves left, ★★★ with 13 or more. Points are 50 per star, 10 per move left, and a streak bonus of 10 per find in a row (up to 100).

### 2.7 The trail

A session is a **trail of five rounds** with **three hearts**. Each lost round costs a heart. The trail ends after the fifth round or when the hearts run out. Finishing all five rounds with a heart left means at least three finds.

### 2.8 After the round

The round-end card shows the mystery's photo, its scientific name, its full family tree (Animalia, Chordata, class, order, family, genus), and all of its field notes in full. The family tree is no longer part of play; it is learned here, by review. A found animal is added to the player's field journal, which also places it on the globe.

### 2.9 A worked example (real data, Africa)

Suspects: Okapi, Aardvark, Giant Pangolin, Black Rhinoceros, Hirola. The mystery is the Aardvark. The rules deal these four clues, shown with each suspect's own answer:

| Suspect | Covered in fur? | Lives alone? | Lives in shrubland? | Lives in Southern Africa? |
|---|---|---|---|---|
| Okapi | yes | yes | no | no |
| Giant Pangolin | no | yes | no | no |
| Aardvark | yes | yes | yes | yes |
| Black Rhinoceros | no | yes | yes | yes |
| Hirola | yes | no | yes | no |

Witness notes available for the Aardvark in this group: the long sticky tongue (fits 3: Okapi, Aardvark, Pangolin), the spade-like claws digging into termite mounds (fits 2), rarely drinking (fits 2), resting in a burrow it digs (fits 2).

A good round might go like this:

1. The player chases the fur order, a strong clue. After several moves, "Covered in fur? **Yes.**" The Pangolin (scales) and the Rhino (bare skin) cannot be the mystery. The player rules them out.
2. Ordinary play continues. Clears next to the two marked tiles release them, some from the player's matches, some from cascades.
3. A witness gem is collected: "It digs into ant nests and termite mounds with its strong, spade-like claws. The field guides of 2 of the 5 say this too." The signs show *digging claws* and *raids termite mounds* only on the Aardvark and the Pangolin. The Pangolin is already out, so it must be the Aardvark. The player rules out the Okapi and the Hirola.
4. The player aims clears next to those two tiles. When the last one leaves, the Aardvark is found.

The danger in this round is a hasty mark. A player who, right after the fur answer, rules out the Okapi and the Hirola on a hunch is right this time; had the mystery been the Hirola, releasing it would have lost the round.

## 3. Why random play fails

The design closes off every way to win without reasoning.

- **Answers do nothing on their own.** Information has no effect until the player acts on it.
- **Only marks release.** A player who never marks never releases anyone, so never finds the mystery. The simulated random player finds 0% of rounds.
- **Blind marking is a coin with five sides.** A player who marks four suspects at random wins only when the unmarked one happens to be the mystery: one time in five. The simulated "guesser" wins 20 to 22% of rounds and escapes in about 80%.
- **The trail compounds it.** A player who wins one round in five finishes a five-round trail with a heart left only about 6% of the time; a player who wins 85% of rounds finishes 97% of trails.
- **Naming at the end saves nothing.** Out of moves, a correct name only goes in the journal, so a player cannot skip the board and guess.

**Simulation results** (balance bot, 400 rounds per continent, a held-out random seed, about ±2 to 5 percentage points):

| Player | What it does | Finds |
|---|---|---|
| Careful | reasons from answers and notes, marks what they rule out, aims every move | 95 to 97% |
| Reader | reasons and marks exactly like Careful, but makes random moves | 68 to 80% |
| Guesser | marks four suspects at random, then aims well | 20 to 22% |
| Random | random moves, never marks | 0% |
| Oracle (diagnostic) | knows the answer from the start | 99 to 100% |

Two results matter for learning. First, the gap between Reader and Careful (15 to 27 points) shows that board skill matters on its own: knowing the answer is not enough without the moves to act on it. Second, the Oracle shows every round can be won within the moves, so a loss is never the board's fault. A careful player uses about 16 to 19 of the 30 moves and identifies the mystery about two moves before finding it, so most of a round is spent gathering evidence, not grinding out releases.

## 4. Strategies of play

### 4.1 Read the round before the first move

Look at the four order tiles and the answer chips on the five cards. For each clue, count how many suspects answer yes. A clue that splits the five **2 against 3** is strong: whatever the answer, it rules out at least two. A clue that splits **1 against 4** is weak: it either names one suspect at once or rules out only one. In the worked example, "Covered in fur?", "Lives in shrubland?" and "Lives in Southern Africa?" are strong; "Lives alone?" is weak.

A quick way to compare clues is the number of suspects you expect to be left. For a 2/3 split it is (2/5 × 2) + (3/5 × 3) = 2.6; for a 1/4 split it is (1/5 × 1) + (4/5 × 4) = 3.4. Lower is better.

### 4.2 Chase one order at a time

Orders need 24 gems. Spreading matches across all four colors fills none of them for a long time. Pick the strongest clue and favor its gems. Switch when the board clearly offers more of another useful clue, or when an answer makes a clue useless (if every suspect still standing gives the same answer, its order can no longer help).

### 4.3 Make the board work for you

- **Big matches fill orders faster** and leave toys.
- **Toys count.** Gems cleared by a line or blast gem count toward their orders by color.
- **The color gem** clears every gem of one color. Swapped with a gem of the clue you are chasing, it can fill a third or more of that order in one move.
- **Matches low on the board** cause more cascades, and cascades are free gems.
- **Set up before you spend.** A move that lines up a four-in-a-row or an L for the next move can be worth more than a small match now.

### 4.4 Collect witness gems

Witness notes are strong evidence: a note narrows the field to the two to four suspects it fits, and two notes often overlap in just one animal. When a purple witness gem sits next to a possible match, take it. Read each note against the suspects' **signs**, not their names: the note says "spade-like claws", the field guide says "digging claws".

### 4.5 Rule out only what the evidence rules out

This is the heart of the game, and the only way to lose a round through play.

- Rule out a suspect when **its own answer contradicts a stamped answer**, or when it **does not fit a witness note** (the mystery always fits its own notes).
- Never rule out on a hunch, a photo, or a name that "feels" wrong. A wrong mark is harmless until the tile is released, and then it costs the round.
- Combine evidence. Each answer and each note leaves a set of possible suspects; the mystery is in the overlap of all of them.
- Undo is free. If you are unsure about a mark, take it back before a clear reaches that tile.

### 4.6 Release efficiently

- Once an animal is ruled out, every clear next to its tile releases it, including cascades and toys. You do not have to release it with your own match.
- **Tap before you swap** to see the release preview when you want to be sure which tiles a move will reach.
- A **line gem** fired along a row or column clears every gem in it, and releases every ruled-out animal next to any of those gems. A **blast gem** does the same for its 3×3.
- Releasing early has a small cost and a benefit: the freed cell becomes playable, which opens up the board.

### 4.7 Tempo and stars

Stars reward finding the mystery with moves to spare (13 or more for ★★★). Strong clues first, collecting witness gems, and releasing with toys rather than one tile at a time are what save moves. Because answers can come from cascades, a lucky board can shorten a round; plan for the average, not the luck.

### 4.8 Managing the trail

Three hearts across five rounds allow two losses. With a heart to spare, a player can afford to finish a round slightly late; with one heart left, every mark should be certain. If the moves run out, name your best candidate: a right name still goes in the journal.

### 4.9 Common mistakes

- Matching whatever is available instead of the clue you need.
- Ruling out the "odd one out" by looks.
- Treating a weak clue's "no" as if it ruled out more than one animal.
- Forgetting that cascades release ruled-out animals too, so a careless mark can be punished by a move you did not aim.
- Ignoring witness gems.

## 5. Educational analysis

### 5.1 What a player practices

| Skill | Where it happens in play |
|---|---|
| Deductive reasoning and elimination | comparing answers with each suspect's traits; combining several pieces of evidence |
| Reading a data table | the answer chips form a five-by-four truth table |
| Precise scientific language | qualifiers such as "mostly" and "only"; "no record" is not the same as "no" |
| Evidence from text | matching a witness note's description to an animal's signs |
| Comparative biology | rounds are built from close relatives and look-alikes, so the differences are the lesson (okapi vs. hirola, aardvark vs. pangolin) |
| Geography | Range clues ask about regions within a continent; finds are placed on a globe |
| Taxonomy | the full family tree on every round-end card |
| Planning and resource management | which order to chase, when to set up toys, how to spend 30 moves |

These map onto widely used science-education practices, notably *analyzing and interpreting data* and *engaging in argument from evidence* (NGSS Science and Engineering Practices), and onto middle-school life-science ideas about similarities and differences among living organisms (for example NGSS MS-LS4-2). The game does not claim to teach these on its own; it gives repeated, low-stakes practice of them with real data.

### 5.2 Strengths

1. **The learning is the game, not a reward for playing it.** Research on *intrinsic integration* found that children learned more from a game whose core mechanic carried the learning content than from the same content attached to a game as a separate task (Habgood & Ainsworth, 2011). In this design the decision that wins or loses a round is a biological inference. Earlier versions did that inference for the player; this one does not.
2. **Errors carry meaning.** A loss is always traceable to a specific wrong conclusion ("I ruled out the Hirola, but it was the Hirola"). Errors that are understandable and followed by feedback can support learning (Kapur, 2008, on productive failure).
3. **Commitment makes thinking visible.** Ruling out is an explicit, revocable claim. That supports metacognition: players learn to ask "do I actually know this?" before acting.
4. **Retrieval and spaced exposure.** Look-alike groups recur across rounds and trails, and the journal and round-end card invite review. Retrieving information during play tends to strengthen memory more than rereading it (Roediger & Karpicke, 2006).
5. **Real, sourced content.** Every trait and note comes from cited sources (IUCN Red List, Animal Diversity Web and others). The round-end card shows the full record, the family tree, the range and the sources.
6. **Desirable difficulty.** The player has to do the work of comparison, which is harder in the moment but tends to produce more durable learning (Bjork, 1994).
7. **Motivation without trivializing.** Match-3 supplies familiar, satisfying action and long Candy Crush–style rounds; the deduction supplies the challenge. The bot data show the challenge is real: thinking, not luck, decides the result.
8. **Low reading barrier to start.** The answer chips and pictures let a player begin reasoning before reading full descriptions; the field guide offers depth for those who want it.

### 5.3 Weaknesses and risks

1. **Split attention and cognitive load.** The board's spatial puzzle competes with the reasoning for working memory (Sweller, 1988). Younger or struggling players may focus on matching and treat the clues as decoration. The 30-move rounds spend most moves on gem collection, so the density of reasoning per minute is lower than in a quiz.
2. **Pattern matching instead of biology.** The answer chips make comparison easy: a player can match a picture with a check against a picture with a cross without learning what the trait means. The game may train table lookup more than knowledge of animals.
3. **Pictures can mislead.** Emoji and icons simplify: an ant stands for "mostly eats insects and other small bugs"; a hand stands for "bare skin". Qualifiers live in the text, not the picture. Some players will over-generalize ("it eats bugs" for a chimpanzee).
4. **Biology is not binary.** Traits are reduced to categories (diet: plants, meat, insects or mixed; size bands). Real animals vary by season, age and population. The game teaches the categories as facts.
5. **Missing records are not absence.** A suspect "fits" a witness note only when its record carries the same tag. An animal that does share the trait but was never tagged counts as not fitting. With incomplete data, the "N of 5" count can be wrong in the student's favor or against it.
6. **Witness notes can short-circuit reasoning.** In testing, two or three notes sometimes identified the mystery within five to ten moves, without a single clue answered. That rewards luck in finding witness gems.
7. **Small pools repeat.** Oceania's six animals produce only two different groups; North America's thirteen produce eight. Repetition can turn reasoning into memorized answers.
8. **Harshness and motivation.** Losing a heart when time runs out, even with a correct name, may feel unfair to a younger player. Losing a round to a wrong mark is fair, but repeated losses can discourage players with less background knowledge, who are the ones the game most wants to reach.
9. **Extrinsic rewards.** Stars, points and streaks can pull attention toward efficiency over understanding. Including irrelevant but engaging elements can reduce learning (Harp & Mayer, 1998, on seductive details).
10. **The family tree moved out of play.** Taxonomy is now learned only on the round-end card, which a hurried player can skip.
11. **Teachers cannot yet see the reasoning.** Rounds are not saved in this build, and even when saved, the data will show marks and outcomes, not the reasoning behind them.

### 5.4 Mitigations and design recommendations

| Risk | Recommendation |
|---|---|
| Split attention | Start new players with four suspects and fewer moves; keep the release preview; consider a pause that dims the board while a field guide is open. |
| Pattern matching | Offer a harder mode that hides the answer chips, so players read the field guide instead; ask a one-question recall on the round-end card ("Which clue ruled out the Okapi?"). |
| Misleading pictures | Keep the exact wording visible next to every picture; teach qualifiers explicitly in How to play. |
| Binary traits | Use the field-guide text to show nuance ("mostly fruit, plus insects"); highlight such cases on the round-end card. |
| Missing records | Word counts as "the field guides of N say this too", never "N animals do this"; keep filling shared traits in the content. |
| Witness notes too strong | Tune the witness gem rate (now 3%) after human playtests; consider requiring one clue answer before notes appear. |
| Repetition | Grow the pools (plan 040's content batches); prefer groups not seen recently. |
| Harshness | Consider a gentler first trail (more hearts) and encouraging copy on losses that names the evidence that would have helped. |
| Extrinsic rewards | Tie bonus points to evidence use (for example, a bonus for a find with no wrong marks) rather than speed alone. |
| Family tree | Make the optional recall question about the family tree, with a small streak reward. |
| Teacher visibility | When saving rounds, record marks with the evidence available at the time; offer a class view of common wrong marks. |

### 5.5 Suggestions for classroom use

- **Think aloud in pairs.** One student plays, the other must agree to every Rule out. This makes the inference explicit and catches hunches.
- **Debrief losses.** After an escape, ask which answer or note was misread. The round-end card has everything needed.
- **Daily trail.** A shared seed (`?seed=`) gives the whole class the same animals, which supports discussion of strategy.
- **Extend from the journal.** Students pick one found animal and research a trait the game simplified.

## 6. Evidence status and open questions

All success rates in this paper come from simulated players. The careful bot reads witness notes perfectly through their tags and never misjudges a trait, so it is an upper bound on reasoning; real students will be slower and will make errors the bot cannot. A human playtest, and later a classroom study, should measure:

- whether students can explain why a suspect is ruled out (the key learning claim);
- how often losses come from wrong marks versus running out of moves;
- whether the answer chips help reasoning or replace it;
- whether 30-move rounds stay engaging after the mystery is known;
- learning gains on the traits and families seen, compared with a reading-only control;
- differences between grade bands and between students with more and less background knowledge.

## 7. Conclusion

The animal board turns Critter Connect from a matching game that happens to show animals into a deduction game that needs matching. Its central rule, that answers never eliminate anyone and only the player's marks can release an animal, makes every win depend on a correct inference and every loss traceable to a wrong one. Simulations show that random play cannot win and that both reasoning and board skill matter. The educational case is strongest where the game makes students compare real animals on real evidence and commit to a conclusion; it is weakest where icons, binary traits and incomplete records simplify the biology, and where the match-3 board competes for attention. The recommendations above aim to keep the first and soften the second. Human playtests are the next step.

## Appendix A: Rules at a glance (044-0)

| Setting | Value |
|---|---|
| Suspects per round | 5 (one is the mystery) |
| Clues per round | 4 yes/no questions, all five suspects with a record, every suspect a different answer pattern |
| Board | 7×7; animal tiles pinned at least 3 apart, never in a corner |
| Gem types | 4 clue gems, 1 pebble; witness gem 3% of new gems |
| Clue order size | 24 gems |
| Moves per round | 30 |
| Release rule | only ruled-out animals; any cleared gem next to the tile (matches, cascades, toys) |
| Win | every look-alike released |
| Loss | the mystery released (escape), or out of moves (naming fills only the journal) |
| Stars | ★ found; ★★ 6+ moves left; ★★★ 13+ moves left |
| Points | 50 per star + 10 per move left + streak (10 per find in a row, up to 100) |
| Trail | 5 rounds, 3 hearts |

## Appendix B: Simulation details

The balance bot (`scripts/balance-044.ts`) plays seeded rounds with the real rules (`src/clueGame/animalBoard.ts`) on the real board (`src/game/BoardModel.ts`). Every simulated player gets the same groups, mysteries and boards. Players may preview a move's first clear, as the release preview does, but never see future gems or answers not yet earned (except the diagnostic Oracle, which knows the mystery). Results on a held-out seed, 400 rounds per place:

| Place (animals, distinct groups) | Careful (★★★) | Reader | Guesser | Random | Oracle | Moves Careful uses | Trails finished: Careful / Guesser |
|---|---|---|---|---|---|---|---|
| Africa (26, 23) | 95% (53%) | 77% | 20% | 0% | 99% | 16 | 100% / 6% |
| Asia (20, 17) | 95% (42%) | 68% | 20% | 0% | 99% | 19 | 100% / 6% |
| North America (13, 8) | 97% (52%) | 80% | 22% | 0% | 100% | 17 | 100% / 6% |
| South America (14, 10) | 96% (53%) | 76% | 20% | 0% | 100% | 16 | 100% / 5% |
| Oceania (6, 2) | 95% (55%) | 72% | 20% | 0% | 100% | 16 | 100% / 6% |
| Whole world (76, 45) | 97% (52%) | 79% | 20% | 0% | 100% | 17 | 100% / 6% |

Reproduce with `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 400 --seed 4401 --places africa,asia,north-america,south-america,oceania,world`. Print any dealt round's clue table and notes with `--explain N`.

## References

- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. P. Shimamura (Eds.), *Metacognition: Knowing about knowing* (pp. 185–205). MIT Press.
- Habgood, M. P. J., & Ainsworth, S. E. (2011). Motivating children to learn effectively: Exploring the value of intrinsic integration in educational games. *Journal of the Learning Sciences, 20*(2), 169–206.
- Harp, S. F., & Mayer, R. E. (1998). How seductive details do their damage: A theory of cognitive interest in science learning. *Journal of Educational Psychology, 90*(3), 414–434.
- Kapur, M. (2008). Productive failure. *Cognition and Instruction, 26*(3), 379–424.
- NGSS Lead States. (2013). *Next Generation Science Standards: For states, by states.* The National Academies Press.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science, 17*(3), 249–255.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science, 12*(2), 257–285.
