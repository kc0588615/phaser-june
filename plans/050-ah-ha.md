# 050: Ah-ha (explain the guesses, show the patterns)

On `main`, over 047-1. Written 2026-10-27. Not started; owner go per step.

## Problem

The game's strength is learning by deducing, but the round ends without the parts that make a fact stick:

- **Pencil marks are guesses, then thrown away.** The round-end card (`RoundEndSheet`, `src/components/animalBoard/AnimalSheets.tsx`) counts them ("guesses right 3/5") and crosses out the wrong ones: "A crossed-out mark was a wrong guess." It never says why. A wrong guess plus a reason is the best moment to learn.
- **Answers are bare yes/no.** "Out at night? NO" teaches a cell, not a fact.
- **Families are in Latin.** The round-end tree reads `Testudines › Emydidae`. `familyTree.*.plain` already holds kid names ("turtles"), but the card doesn't use them.
- **No patterns across rounds.** Look-alikes are close relatives (`animalBoard.ts`, closeness by tree rank), so a trail is full of shared family traits, but nothing points them out. Same idea as learning plants by family: learn the pattern once, then spot the exception.
- **No payoff for meeting an animal again.** The journal knows what you found, but the board doesn't.

## Rules

1. **Point, don't conclude, during play.** Nothing here marks who still fits while a round is on. Steps 1–3 happen at round end or in the journal. Step 4 marks animals by journal status only, never by anything to do with the round's questions.
2. **No new content for 1–2.** Every question tag comes from a clue line, and `Animal.guide` keeps each line with the tags it records (`questionMatchContent.ts`, `buildAnimal`). The reason for a tag is that animal's guide line(s) carrying it. No line, no reason (show the plain answer, as today).
3. **Never show the camera animal's guide line mid-round.** The same line is in that suspect's field guide, so matching the text would give the answer away. "Because" lines are for round end only.
4. **Kid words** (grades 6–12, see memory on tone): plain group names first, Latin small and after.
5. **The mystery pick never looks at the journal.** Today the deal doesn't. Keep it that way, or step 4's marker gives the answer away.

## Steps

1. **Explain wrong guesses (round end).** Pure helper `guessReasons(round, pencil, book)` in `src/clueGame/` lists each wrong pencil mark as {suspect, question, guessed, real, line}. `line` = the suspect's guide line for the real answer: a tag line for yes, the line holding its actual value for that prefix for no (e.g. `activity:night` when asked `activity:day`). The Evidence tab gets a short list above the grid key, at most 3, wrong guesses first: "You guessed the Giant Pangolin is out in the day. It's out at night: _<line>_". Over 3: "+2 more" opens the rest. If none are wrong: one line, "Every guess right."
   E2E: seeded round with planted wrong marks; the list names them, each line is from that suspect's guide, no list when nothing was pencilled. Report + screenshot.
2. **Why the camera said yes or no (round end).** Same helper idea for the mystery's 4 answers: `answerReasons(round, book)`. In the replay grid, tapping a Camera row cell (or a new "Why?" row under the grid at 390px) shows the line: "Out at night? YES: it digs for ants after dark." Answered questions only.
   Content check (`npm run content -- check`): count question tags with no guide line per animal; warn, don't fail. Today's trait-note gaps (birth 1/76, activity 31/62, social 29/56) matter only if the clue lines are missing too.
   E2E: each answered question's reason comes from the mystery's guide and matches its answer.
3. **Family patterns.**
   a. **Round-end tree in kid words.** `Turtles › Pond turtles` with the Latin after in small text (`familyTree.*.plain`, fall back to Latin when plain is null). Same in the journal and the field guide's family line.
   b. **Journal patterns.** Pure `familyPatterns(journal, book)`: for each order or family with 3 or more animals found, the traits all of them share (same value for a prefix), and the one found animal that breaks a trait the rest share. Shown in the journal sheet (`JournalSheet.tsx`) as a "Patterns" section: "You've found 3 poison frogs. All are small and out in the day." / "Except the Suriname toad: its young hatch from its back." The exception line comes from the guide (rule 2). Most surprising first: exceptions, then the biggest groups.
   c. **Round-end nudge.** When a find adds to a pattern or breaks one, one line on the card: "4th pond turtle in your journal: they all lay eggs." Links to the journal section.
   E2E: seed a journal (on-device storage) with 3 of one family; pattern shows, the exception shows, the nudge appears on the next find of that family.
4. **Met before.** A suspect card (board polaroid and field guide header) shows a small journal mark when the animal is already in the journal. There's no count and no stars, and it doesn't care whether you found it or named it. The field guide adds one line: "You found it in Africa, 2 trails ago." The mark is the same for mystery and look-alikes (rule 5).
   E2E: journal with suspect #2 in it; mark on #2 only; the mystery id is the same with and without a journal for the same seed.
5. **Playtest with real players** (not the script). One or two kids, one trail each. Ask after each round: "Tell me something you learned." After step 1: "Why was that guess wrong?" Record in `docs/playtests/`. This decides whether step 3c and 4 are worth keeping.
6. **Docs.** `CLUE_MATCH.md` (round end, journal), `CONTEXT.md` ("Pattern", "Met before"), how-to only if a playtest says it's needed.

Steps 1, 2 and 3a ship without a rules change (no `ANIMAL_RULES.version` bump, no bot run). Steps 3b and 4 change no rules either but add journal reads to the game screen.

## Open (owner)

- **Step 2 placement:** tap a Camera row cell (no new space, hidden) vs. a "Why?" list under the grid (visible, longer card). Default: list, since the card scrolls already.
- **Step 4 leaking pressure:** does "met before" tempt players to guess the new animal? It shouldn't if rule 5 holds, but players may believe it. Default: ship, ask in the playtest.
- **Patterns from finds only, or from named too?** Default: found only (named on a lost round is shakier).

## Later

- **Predict before the board.** At round start, one free pencil guess on the camera animal ("Out at night?"), shown right or wrong when the question completes. Needs a rules change and a bot run.
- **Plants** (see the 2026-10-27 chat): a second content set on the same board, with family traits as questions across mixed families. Wait until the rules settle.
