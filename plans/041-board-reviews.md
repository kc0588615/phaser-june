# 041 companion: every review proposal (2026-09-28)

Everything Claude, Fable, Codex and Grok proposed in two review rounds on plan 041, with who said it, the numbers, and where it stands. The decisions themselves live in `plans/041-gameplay-tactics.md` (parts 8–10).

**Round 1, "random tapping solves":** the owner's "i can just click on all of them randomly and spend them, and end up with 1 species easily."
**Round 2, "no reason to be a match 3":** the owner's "i could just have deduction questions and picking them. what can make the match 3 gameplay interesting?"

**Reading the numbers:**
- Unless a line says otherwise, they're seeded bot runs on the real rules and board, 200–400 rounds, listed as Africa / Asia / world.
- "Narrowed" means one animal is left before guessing. "Careful" is a bot that always knows the best split, which is an upper bound on a real player. "Random" knows nothing.
- Differences of 2–3 points are noise.

**Status key:**

| Status | Meaning |
|---|---|
| **Built** | in the game |
| **Open** | not decided |
| **Parked** | later |
| **Dropped** | measured and rejected |
| **Removed** | built, then taken out |

Report files (temporary, outside the repo):
- **Round 1:** Claude, Codex and Fable at `/tmp/claude-1000/-home-danby-phaser-june/0e4f1de8-f733-4c87-b92c-938e5ff5e44e/scratchpad/claude-design/{claude,codex,fable}-review.md`.
- **Round 2:**
  - Codex: `/tmp/codex-match3-report.md`
  - Fable: `/tmp/fable-match3/report.md`
  - Grok: `/tmp/grok-match3-report.md`
  - The brief: `…/scratchpad/match3-brief.md`

---

## 1. Diagnoses

### Round 1: why random tapping solved (041-1, charges)
All three reviewers agreed on the first five points.
1. **Answers were cheap.** A round earned about 5 charges, and 8 animals need about 3 good questions. Every question offered could cross something out, so a random tap was never wasted.
2. **The game did the thinking.** Answers crossed animals out automatically, so knowing animals was never needed.
3. **The board was only income.** Any color bought progress.
4. **Three systems did nothing useful:**
   - The bots bought 0.0 family tree steps.
   - Automatic questions fired on about 1% of questions.
   - The last chance added 7–9 points of blind wins for random players (Codex).
5. **A bigger pool alone doesn't help.** Rounds stay at 8 animals. Africa's 20 animals sit in 18 families, so "closest relatives" mostly meant "also a mammal".
6. **Content gaps** (Fable): social, lifespan and activity traits are recorded for only 65–85% of animals, and 7% of Asia rounds couldn't be narrowed at all.
7. **Close relatives with nothing to tell them apart** (Codex): the Indian and Sunda pangolins share all 7 broad traits.

### Round 2: why the board feels pointless (041-3)
The four reviewers saw it differently:
- **Claude:** the board has no goal. You match, then pick from what you got, so it's a menu with friction. The missing classic pieces are a goal on the board, enough moves to plan, specials, obstacles and juice.
- **Codex:** "any match counts" is too simple, since colors do limit the questions. What's weak is the value of *where* a match happens and what it leaves behind: 3 moves with a reset give no setup horizon. The missing pleasure is "I made this board better for my next move."
- **Fable:** the board already carries most of the skill gap; it just doesn't feel like it. Holding good questions fixed, aiming at the right color is worth about 25 points and choosing the question about 14 (careful 70 / 72 / 56, random swaps with best questions 45 / 48 / 38, random 31 / 33 / 25). So this is a feel problem, and dropping the board would drop the bigger half of the skill.
- **Grok ("the bind"):** with today's animals, three perfect questions solve 97% (Africa) and 100% (Asia); two leave a pair (2%). All of the difficulty comes from the board sometimes denying the perfect question, which can feel like a slot machine. Real look-alikes (plan 042) would move the difficulty into the facts.

---

## 2. Core loops

| Loop | From | How it plays | Numbers | Status |
|---|---|---|---|---|
| **Charges** (041-1) | original plan | Matches bank charges; spend them any time on questions or family tree steps | careful solves 99 / 99 / 95, random 95 / 95 / 90 | **Built**; the game again since part 11 (owner: the pick versions were too clunky) |
| **One question a move, bonus pick** (041-2) | Codex, Fable, Claude (round 1) | Each move earns one question from the colors matched; a 4+ match earns a second pick or a family tree step | first try: careful 99 / 97 / 95, random 80 / 78 / 77 | **Removed** (part 12); the owner found the bonus pick "too distracting" |
| **041-3** | Claude (part 9) | As 041-2, plus 3 moves, look-alike rounds, a 4+ match saves a note, and a family tree that fills in by itself | narrowed: careful 70 / 70 / 56, random 34 / 33 / 25; first try 84 / 84 / 72 vs 54 / 57 / 48 | **Removed** (part 12): the owner went back to charges |
| **Pick, then earn it** (041-4) | Claude (round 2) | Pick the question first; a match of its color asks it; 8 moves, at most 3 answers; the aim stays until asked; built bot: careful 74 / 77 / 57, careful questions with random swaps 47 / 52 / 36, random 25 / 22 / 19; 55% of careful moves ask nothing | 79 / 75 careful+aim, 48 / 54 careful+random swaps, 56 / 50 random question+aim, 36 / 32 random (Claude; Codex reproduced it). Grok: 85 / 78, 52 / 53, 64 / 53, 32 / 28. The aimed color is matchable on only 44–47% of turns, and about half of all swaps ask nothing. | **Removed** (part 12): the owner found it "too clunky, selecting each one is too much work". Codex had backed it with safeguards; Fable and Grok advised against it. |
| **One match, one question in its own color** | Fable (round 1) | One question per move from the move's own color; 4+ gives two; cascades give points | narrowed careful 86 / 78 / 77, random 50 / 54 / 47 | Measured; folded into 041-2/3 |
| **Cap of 3 information actions** | Codex (round 1) | At most 3 questions or tree steps a round | careful 84 / 82 / 83, random 68 / 58 / 62; tree-first 90 / 85 / 85 (a tree step is too strong) | Informed the 041-4 cap |

### Pick, then earn it: details and arguments

**What the reviewers found:**
- **Codex's safeguards:**
  - Show the contract: "8 moves. Up to 3 answers. Choose a question, then match its symbol."
  - Lock the aim during a move.
  - At most one answer per move, and no leftover color credit.
  - A "No record" answer refunds the color.
  - Without the cap, random players get more than 3 answers in 36% of rounds; the cap drops their narrowed rate from 61 / 56 to 32 / 30.
- **Waiting** (Codex): the aimed color can't be matched directly on 56–60% of turns, and 63% of rounds include a wait of 3 or more moves.
- **Planning helps** (Codex): sampled setup lookahead adds about 10 points (91 / 87). Fable measured lookahead at 86 / 88 / 81, Grok's 1-move lookahead at 93 / 89.
- **Free switching collapses the design.**
  - Codex: switching to a matchable color gives 81 / 81 in about 3.2 moves, and most of the planning horizon disappears.
  - Fable: a free re-pick gives 98 / 98 / 93, with random questions at 97 / 96 / 85.
  - Committing costs about 5 moves of nothing (Fable).
- **The board outweighs the animals** (Grok): the gap between aimed and random swaps (33 points) beats the gap between good and random questions (21). In 041-3 it's the other way round (29 vs 21).
- **"Just match something" doesn't help** (Grok): after the longest match, the missing color appears next turn only 33% of the time. A 1-move lookahead gets 66%, and that isn't a grade-6 skill.
- **Making the color reliable deletes the game** (Grok): on 7×7 with 4 colors, careful play narrows 100% and random swaps 90%.
- **The last question stings** (Grok): waiting two empty swaps to ask the one fact that separates the last pair.

**How it could frustrate a 12-year-old** (all three):
- "The game won't give me green."
- Setup moves fail on the random refill.
- Kids pick a color they can already reach anyway.
- There are two panels per answer.

### Grok's version of pick-first (Grok §5, owner-informed)
Grok designed the loop to paper-test if the owner wants the active choice back:
- **The question stays on screen.** Eight photos stay up, and one line in a gem color sits under the board: "Does it have scales?" Nothing covers the board.
- **Choosing the question:** tap a color chip to switch the line to that color's question; tap the line to cycle to the next question of that color. This replaces spending a charge.
- **Board hints:** gems of the lit color brighten, and a dot on a chip means a swap of that color exists right now.
- **Asking:** only the lit question is asked, even if a cascade matches another color. A swap that misses asks nothing, and the line says to line that color up or pick another question.
- **The player turns the photos.** A wrong tap bounces. Guessing is a separate control, and crossing the mystery out by mistake bounces.
- **5 swaps, at most 3 answers;** a 4+ match saves a note.
- **Paper test:** keep it if players say the reason out loud ("pangolin stays, it has scales"); drop it if the empty swaps feel like waiting.

---

## 3. Other directions for the board (round 2)

| Direction | From | How it plays | Numbers | Cost | Main risk |
|---|---|---|---|---|---|
| **A 4+ match gives the move back** | Fable (#1); Puzzle Quest, Gems of War, Match Morphosis | "A match of 4 or more doesn't use up a move"; no panel | careful 81 / 82 / 70 (from 70 / 72 / 56), random 38 / 44 / 31; free moves 0.68 vs 0.34 a round | tiny (`bigMatch: 'move'`) | must stay quiet. Grok measured a free second swap at 65 vs 67: no gain. |
| **6×6 board** | Fable (#2), Codex | Colors on offer go from 2.5 to 3.1 | Fable: careful 82 / 82 / 66, random unchanged at 30 / 32 / 27; with the free move 91 / 91 / 77 vs 43 / 40 / 27. Codex (pick-then-earn, cap 3): good+aim 89 / 91, good+random 55 / 56, random q+aim 35 / 35, random 22 / 23 | small (`--board 6` exists; gems about 60 px) | phone layout |
| **No-refill 6×6** ("this board is all you get") | Fable (#3, bold) | Nothing refills; plan your three moves; `?seed=` becomes a daily puzzle | planner 73 / 77 / 62, greedy 65 / 71 / 54, random 40 / 41 / 31. 5×5 no-refill gets stuck (greedy 32%). A visible refill row gives +4. | medium | loses the juice of falling gems |
| **Specials as field tools** (**Built** as toys in part 13: line, blast and color gems; toy clears pay charges) | Claude, Fable (#4), Codex | See section 4 | Fable: on 5×5 no change in narrowing; 6×6 86 / 86 / 66, with the free move 91 / 90 / 77 vs 44 / 50 / 38. Codex's line tool was earned 0.72 times a round but used only 0.12. | medium to high | "too distracting" |
| **Set up your next observation** | Codex (#1) | 6×6, 8 moves, 3 answers, aim before acting, plus one tool slot: swap two neighboring gems even without a match (costs a move; a 4+ match refills it); show where gems land before confirming | tool not simulated yet | medium | kids always switch to an easy color |
| **Aim before matching** | Codex (#2, small) | Keep 041-3's 3 moves; pin a question before swapping; matching its color asks it, otherwise today's choice | not simulated | small | cosmetic only |
| **Bring the observation home** | Codex (#3) | Pin a question; its token enters at the top; clear beneath it to deliver it to an exit | Fable measured a version: 16 / 17 / 9% narrowed | medium to large | a longer toll |
| **Build the match** | Codex (#4, bold) | Place colored pieces from a visible queue of two instead of swapping | not simulated | large | a block puzzle with a quiz attached |
| **Show the fact on the color before the swap** | Grok (#1, do first) | Each chip shows its best question in kid words; tapping a chip pulses that color; no rule change | careful 67 / 65, random questions 38 / 39, random swaps 46 / 49, random 27 / 30 | low | the words become an answer key. Kill it if a player's narrowing jumps toward 100%. |
| **Keep the tax until the animals are similar** | Grok (#2) | Change nothing until plan 042 adds real look-alike families | Confirmed when 3 perfect questions narrow well under 90% | content work | feels like ignoring the question |
| **The gems are the questions, redrawn every turn** | Grok (#3) | After each answer, the 4–5 best remaining questions become the gem colors, with their words on the gems | A hand dealt once went stale: 53 vs 43, and all three perfect questions were in the opening hand in only 11% of rounds | medium | text on gems on a phone; waits for plan 042 |
| **Pricing questions by how well they split** | proposed, Fable | — | leaks which question is good | — | **Dropped** |
| **Only the move's own color** (cascades add none) | Claude | — | 89 / 84 / 80 at 4 moves; more wasted moves | — | **Dropped** |
| **Question price of 6–9 gems** | Claude | — | too slow: about 4.2 moves per answer, 36 / 34% narrowed | — | **Dropped** |
| **Trait gems** ("the match is the question") | Claude (round 1) | — | best ≈ random (43 vs 38) | — | **Dropped** |
| **Fewer colors** (4) | Codex, Fable sensitivity tests | — | 98 / 98; knowledge stops mattering | — | **Dropped** |
| **More colors** (6) | Codex | — | 48 / 44; 40–50% of rounds end with an unfinished aim | — | **Dropped** |
| **Setting up the best color when it's far away** | Grok | — | worse: 62 vs 67 | — | **Dropped** |
| **Seeing cascades before you swap** | Grok | — | 71 vs 67; not worth teaching | — | **Dropped** |

### What classic match-3 has that ours lacks
**Claude's five:**
1. a goal on the board (orders, jelly, ingredients);
2. enough moves to plan (15–30);
3. specials and combos;
4. obstacles;
5. juice.

**Added by the reviewers:**
- **Specials you keep and fire later** (Codex; Royal Match). Creating, keeping, positioning and triggering a tool are all decisions.
- **A 4+ match gives an extra turn** (Fable, Grok; Puzzle Quest, Gems of War). Match Morphosis charges energy for a 3-match and makes 4+ free.
- **Board literacy:** setups, orientation, saving a special (Fable). It's impossible when the board resets every animal and lasts 3 moves.
- **Big orders**, so every move contributes (Fable). A one-match order is all or nothing.
- **Drop objectives**, spatial goals such as ingredients (Fable, Grok): where the gems land is the puzzle.
- **Refusing the obvious match** to set up a better one (Grok). This needs a horizon.
- **Rules you can read before you swap:** what will this match do (Grok)?
- **Denial,** needing a rival (Fable).
- **Deterministic puzzle modes** (Fable).
- **Modes:** Bejeweled's Classic, Zen, Lightning and Quest (Codex).

**Juice** (all four, with different weight; **Built** in part 13: pops rising through a chain, chain callouts, shake, faster animations, synthesized sounds off by default):
- **Explain cause and effect** (Codex): preview which gems fall, show a tool's reach, tell a planned match from a lucky cascade, and connect the earned answer to the animals it crosses out.
- **Keep the board and the aim visible together** (Codex, Grok).
- **Call out the category on every match** ("Habitat"), count chains ("2 in a row"), and keep a bigger ring for a 4+ match (Grok).

---

## 4. Specials as field tools
**The rule every reviewer gave:** a special may widen access (more colors, moves, or gems moved) but must never answer a question, reveal a trait or cross an animal out (Fable, Codex, Grok).

| Classic special | Field-tool name | Board effect | Information limit | Views |
|---|---|---|---|---|
| 4 in a row: striped / line | **Binoculars** | clears a row (Fable: row and column) | the pick may offer every color it cleared; no fact | Codex: the rescue version was barely used. Grok: a line that *asks* is a free question; one that only moves gems needs a board where position matters. |
| L or T: wrapped / bomb | **Camera trap** | clears 3×3; collects note gems in reach (still sealed) | notes stay sealed | Codex: later, only with a positional goal. Grok: finishes the goal sooner and makes rounds easier. |
| 5 in a row: color bomb | **Field guide** | clears a chosen color; this move's pick can come from any category | never reveals the animal; at most one answer | Fable: rare (about 1 in 20 aiming rounds). Grok: if it asks, it's a perfect question, which on the last turn *is* the round. |
| Free adjacent swap | **Reposition tool** | swap two neighbors without making a match; costs a move | same aim, same answer cap | Codex: the best first tool experiment. Show where gems land before confirming. |
| Extra turn | **"Doesn't use a move"** | the move comes back | none: pure economy | Fable #1. Grok: 65 vs 67, no gain, and a 4+ match can't be aimed at (22% vs 23%). |
| Note gem as a relief valve | **Compass** (Fable's idea) | this move's pick may come from any color | none | open |
| Two Dots square | — | upgrade one color ("choose which Body question") | — | Grok: a large new input for little gain |
| Relic that recolors a gem | animal power (plan idea #4) | hands you the perfect question's color | solves today's rounds | Grok: park until plan 042 |

**Don't build:**
- specials that reveal a trait or a family tree step;
- a drone that picks the question;
- a peek at the answer;
- a second question per big match;
- recursive tool farming.

**Implementation notes:**
- A special should be kept on the board and fired later, not fire itself (Codex).
- `BoardModel.findMatches` reports horizontal and vertical runs separately, so L and T detection has to merge them (Codex).
- Copy words: "clears / frees / collects", never "bomb" (Fable).

---

## 5. What a 4+ match should do
| Option | From | Verdict |
|---|---|---|
| Bonus pick: a second question or a family tree step | 041-2 | owner: "too distracting"; removed (part 12) |
| Saves a sealed field note | Claude (041-3) | **Built**. Codex: "a note for if you fail later does little for this turn's setup." |
| Gives the move back | Fable | top recommendation; see section 3 |
| A fun fact about an animal you already crossed out | Claude, Grok (#4) | open. Crosses nothing out and teaches something; the bot's narrowing must stay within 3 points or it's leaking. |
| Bonus points | Claude | alternative; nice but generic |
| A family tree step on a 5+ match | Claude | too rare (about 0.05 a round) |
| Refills the reposition tool | Codex | part of Codex #1 |

---

## 6. Field notes and the last chance
- **Built:** note gems (and, in 041-3, 4+ matches) save sealed notes. A wrong final guess with notes opens a last chance.
- **The problem** (Codex, Claude): the last chance adds blind wins (random 88 / 85 / 81 → 95 / 93 / 90). With two animals left it's a free second guess, so the notes never get read.
- **Open:** open the notes at 0 moves, *before* the final guess, so reading them decides it (Codex).
- **Open:** notes as riddles. Spend a pick on a field note instead of a question (Fable). About 3 notes a round point only at the mystery (7.7 notes per mystery; 72% carry a trait tag; 55% of those are unique among the 8).
- **Open:** a "Field notebook" round (Codex): six curated animals, and the player chooses which observation to read next.
- **Open:** when a move has nothing to ask, save a note instead (Fable).
- **Parked:** riddle rounds (Claude).

---

## 7. Making knowing animals the skill (round 1)
| Idea | From | Numbers | Status |
|---|---|---|---|
| **You cross them out** (Guess Who, "Ranger mode"): answers stop crossing animals out; the player flips tiles, and a wrong flip bounces or costs | Fable, Claude; Grok §5 folds it in | Success tracks knowledge: knowing 0% of traits narrows 10 / 14 / 9, 30% gives 38 / 46 / 40, 60% gives 73 / 66 / 60, 90% gives 88 / 79 / 79 (the best possible is 88 / 80 / 78). A beginner reads about 9.5 field guides a round. | Open (the next candidate). Codex: "twelve manual flips are not twelve decisions." |
| **Predict one contrast** ("which of these two lays eggs?"), once a round | Codex | A blind pick is right 50% of the time | Open |
| **Notes as riddles** | Fable | see section 6 | Open |
| **Compare with an animal** (Metazooa / Mastermind): pick a reference animal and one trait lens | Codex, Claude | Showing every trait of a lens is too easy (random 97–99%); one trait at a time is today's questions with an extra step | **Dropped** as the main loop |
| **Family tree challenge side mode:** guess animals from the whole continent; each guess shows the lowest rank it shares with the mystery | Claude; owner liked it | about 5 guesses: best 85 vs random 72 (Africa), 89 / 77 (Asia), 54 / 41 (world) | **Parked** (plan 041, Later) |
| **Connect the animals** (Codenames-like): pick 3 animals that share a trait; the trait is the match rule | Codex (bold) | paper test first | Parked |
| **Guide your partner** (co-op on one phone) | Codex | — | Parked |
| **Field Kit** daily puzzle (a dealt hand of question cards) | Fable | curated hands: a sure plan exists in 75% of Africa deals, greedy 83%, random 26%; Asia only 40% of deals | Parked |
| **Rival ranger** (a quiet bot racing you) | Fable | — | Parked (pressure mechanics were cut twice) |
| **Stars for efficiency** (Wordle's "in 3") | Claude | weak lever: careful keeps only about 0.4 more charges than random | Dropped |

---

## 8. Tuning levers measured along the way
- **Offer useless questions:** the worst player drops sharply; random barely moves (Codex: "don't just dump them in").
- **No automatic questions:** hardly matters; they fired on about 1% of questions.
- **3 moves:** the strongest single lever (041-3).
- **10–12 animals:** harder for everyone. 12 animals, 4 moves and the note rule: careful 79 / 77 / 69. **Built** on the charges loop in part 13 as 12 look-alikes (041-5): first try careful 94 / 94 / 83, random 78 / 79 / 65.
- **Look-alike rounds:** a small lift (Africa 72 → 70, world 66 → 56 at 3 moves). Built.
- **Leave out animals no question can tell from the mystery:** fixes unwinnable rounds. Built.
- **One charge a color for any size of match:** no effect (Codex).

---

## 9. Content (needed by every direction)
- **Fill missing traits** (social, lifespan, activity). This removes Asia's 7% of rounds that can't be narrowed (Fable).
- **Add facts that tell close relatives apart** (Codex).
- **Plan 042: grow each continent in family groups.**
  - Grok's test: run the no-board oracle on the new families. Board work pays off once 3 perfect questions narrow well under 90%.
  - Fable's principle: a small cast met many times, so kids learn the aardvark.

---

## 10. Where they agree and disagree
**Agree:**
- keep answers scarce, about 3 a round;
- a special never gives information;
- try 6×6 before adding specials;
- no combat, urgency meters or charge banks;
- test with the owner playing 10 seeded rounds, plus a short check with kids.

**Disagree:**

| Question | Claude | Codex | Fable | Grok |
|---|---|---|---|---|
| Pick first, then earn it? | yes, as 041-4 | yes, with a 3-answer cap, a visible aim and a reposition tool | no: keep "match, then pick", add the free move and 6×6 | no, not on today's animals; try "show the fact on the chip" first |
| First experiment | 041-4 | 6×6 + 8 moves + 3 answers + reposition tool | the free move, then 6×6 | the chip line, 10 rounds |
| 4+ reward | a note (built) | refill a tool | the move back | a fun fact |
| Last chance | keep for now | read the notes before the final guess | keep | keep the sealed note |
| Why the board feels pointless | no goal on the board | no setup horizon | a feel problem; the skill is already there | today's animals are too easy to tell apart |
