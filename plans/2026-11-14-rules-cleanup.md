---
mission: rules-cleanup
project: critter-connect
branch: agent/rules-cleanup
status: active
started: 2026-11-14 19:32 UTC
---

# Mission: Rules cleanup: the 041 and 043 rules, the content check, the rules pointers, sightings (Critter Connect, audit M7)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M7 of the codebase audit (vault `research/critter-connect/codebase-audit.md`, read findings D8, S16, S10 and D14 and the M7 entry in full). The audit's M7 also had S18; the owner dropped it (Notes). Quote text when you find a site: the line numbers below are from the pinned commit `4fa92a8e`, and M6, M1, M3 and M4 shift them. When it's done:

1. **D8:** the rules of the 041 and 043 games, and the other leftovers D8 lists, are gone.
   - `src/clueGame/questionMatch.ts` keeps what the 044 game uses: the question categories and their wording (`CHARGE_CATEGORIES`, `GemKind`, `CATEGORY_LABELS`, `PREFIX_CATEGORY`, `FAMILY_TREE_RANKS`, the text tables, `prefixOf`, `categoryOf`, `questionText`, `shortQuestionText`, `columnLabel`), its types (`Animal`, `Source`, `FieldNote`, `Sign`, `RankName`, `Book`), `makeBook`, `poolFor` and `likeness`. Everything under `// ---- Rounds ----` except `likeness` goes, with `GEM_KINDS`, the private helpers only those functions use (`animal`, `canTellApart`, `isOver`, `shuffle`, `PREFIX_ORDER`) and the `hash32` and `neverAsked` imports. Its opening comment ("Question Match rules (plan 041): …") is rewritten to say what the file holds now.
   - **The old rule sets stay:** `Rules`, `FamilyTreeCost`, `RULES_041` and `DEFAULT_RULES`, with their comments. `ClueBoardScene.ts` still reads `DEFAULT_RULES`; mission M8 (D9) removes them.
   - `Animal` loses `redList`, `redListUrl` and `traitSources`. `src/clueGame/questionMatchContent.ts` stops building them (`traitSources`, `redListSource`), and `AnimalInput.redList` goes with its two fill lines in `animalsFromPool` and `animalsFromProfiles`, since nothing reads it after.
   - `src/clueGame/gems.ts` is deleted.
   - `evaluateClue` and `usefulCategories` (`src/clueGame/deduction.ts`), `gemCategory` with `BY_GEM` (`src/clueGame/categories.ts`), the `records`, `find`, `OTHERS` and `matched` exports of `tests/clueGame/testPool.ts`, and `export const startTrail = newTrail;` (`src/clueGame/animalSession.ts`) are deleted.
   - The exported function `pencilBonus()` (`src/clueGame/animalBoard.ts`) is deleted, and its long comment moves onto `scorePencils`. The `AnimalRound.pencilBonus` field and everything that reads it stay.
   - `AGENTS.md` drops `gems` from the rules modules list, and `docs/CLUE_MATCH.md`'s table drops "`gems.ts` (gem color ↔ category)".
2. **S16:** the content check is cut down to what today's game needs.
   - **First**, `tests/clueGame/validatePool.test.ts` gains a case: a species holding two `size:` values gets the one-value error ("… takes one value"). It must pass before the rule below goes.
   - The rule "does not fit its own species" is deleted from `validatePool`, with `fitClue` and `ClueFit` (`deduction.ts`).
   - `GemCategory` and `GEM_CATEGORIES` keep their names and all eight rows, but only the four fields the check reads: `label`, `clueCategories`, `factCategories`, `deduces`. `gem`, `shortLabel`, `question` and `color` go, and so does `CLUE_GAME_GEM_TYPES`, whose one reader, `solveReport.ts`, M6 deleted. The header of `categories.ts` says the table is the content check's groups.
   - The two warnings say: `` `${name(id)}: no tagged ${category.label} clue (every profile needs one)` `` and `` `${name(id)}: no ${category.label} clue or fact (every profile needs one)` ``. Their conditions don't change.
3. **S10:** the docs stop calling the 044-0 paper "the rules", and the glossary lines and comments are true.
   - **The paper is frozen, not rewritten.** One line at the top of `docs/ANIMAL_BOARD_PAPER.md` says it is the dated 2026-10-01 paper for rules 044-0 plus the notes under it, and that the current rules are summarised in `docs/CLUE_MATCH.md` and `CONTEXT.md`, with the numbers in `ANIMAL_RULES`. Nothing else in the paper changes.
   - The four pointers send readers to `docs/CLUE_MATCH.md`'s summary and `CONTEXT.md` instead: `docs/CLUE_MATCH.md` "rules in `docs/ANIMAL_BOARD_PAPER.md` and `plans/044-animal-board.md`" and "The full rules, a worked example and why random play fails: `docs/ANIMAL_BOARD_PAPER.md` §2–3 …", `AGENTS.md` "rules: `docs/ANIMAL_BOARD_PAPER.md`", and the playtest skill's "in full `docs/ANIMAL_BOARD_PAPER.md` §2". Each may still name the paper as the design paper for 044-0.
   - `CONTEXT.md`: the pencil line ("The game never checks it during play.") says a right name scores the pencil marks and the grid shows a pencilled guess right or wrong once the answer is scouted; the name line ("Right is a find worth one star") adds the second star for Sharp eye; the journal line ("(and synced when signed in)") says the journal is kept on the device and sign-in only merges solves saved under an account before October; the Source line ("Players can open it to check …") says where players see sources today, read from `AnimalSheets.tsx` and the journal.
   - The comments: `animalBoard.ts` "Shared by the balance bot (scripts/balance-044.ts) and, later, the game."; `questionMatchContent.ts`'s header (no prototype, no trait sources, "Question Match rules (plan 041)"); `places.ts` "a round shows 8 of them" (a round has 5 suspects); `profiles.ts` "Fun notes, shown once a color's clues run out and on the reveal card." (say where facts show now, from `questionMatchContent.ts`); `categories.ts`'s header; `journal.ts`'s header "A signed-in player's solves are also on the server"; `questionMatch.ts` "Two-line versions for the gem legend (rules 043)." (they label the board's gems now); and the bot's usage line in `scripts/balance-044.ts`: `[--order 24]` becomes `[--order 20]` and `[--stars 6,13]` becomes `[--stars 8,14]`. M6 already fixed `places.ts`'s "Unit-tested in tests/clueGame/places.test.ts." header: skip it.
4. **D14:** the journal no longer builds, stores or checks sightings, and every journal already on a device keeps every find.
   - **First**, a fixture `tests/clueGame/old-journal.json`, written by today's code on the fresh `origin/main` before any change: `recordSolve` with a sighting, a `className` and a Sharp eye for at least two real animals from `db/content/animals/` (their scientific names), plus one entry, added by hand, whose `sightings` holds a malformed item (`[{ "placeKey": "x" }]`, as the current test has). A unit case in `tests/clueGame/journal.test.ts` loads it with `parseJournal` and expects every entry, with `timesSolved`, `bestMoves`, both dates, `className` and `sharpEyes` unchanged. It must fail on today's code (the malformed entry is dropped) and pass after.
   - In `src/clueGame/journal.ts`: the `Sighting` type, the `sightings` field, `isSighting`, and `recordSolve`'s `sighting` parameter go. `parseJournal` returns each entry with only `JournalEntry`'s own fields, so an old `sightings` (well-formed or not) or any other unknown field is left out and never drops the entry. The rule that a bad `sharpEyes` drops the count, not the animal, stays. The test "a malformed sighting drops the entry" is deleted: it pins the old behaviour.
   - **`mergeServerJournal` keeps its rule** (the larger count, the lower best, the earliest and latest dates, the local `commonName`, `className` and `sharpEyes`). Only its sightings lines and its `placeFor` parameter go, with the doc sentence about places.
   - **`className` stays** in `JournalEntry` (owner: keep the entry's other fields, for the journal transfer to come). Its comment stops saying it colors the globe's markers.
   - **`ServerJournalEntry` keeps `placeKeys`,** so `/api/clue-game/journal` doesn't change. The device stops reading it; its comment says so.
   - `sightingPoint` and the two helpers only it uses (`clamp`, `round`) are deleted from `src/clueGame/places.ts`.
   - `AnimalGame.tsx` records a find without a sighting and stops taking `place` from the hook. `useAnimalSession.ts` loses `loadPlace`, the `place` in `Content` and in what it returns, so `/explore` makes no request to `/api/places/`.
   - `useJournal` takes no `places` argument (its comment loses the sightings sentence), and `GlobeScreen.tsx` calls `useJournal()`.
   - The playtest skill's "With `?place=`, a find adds a sighting for that continent to the journal." says what `?place=` does instead. If M6 left the skill's "they come from the journal's sightings in localStorage" line, correct it too: markers come from the journal's finds.
   - **The E2E proves it:** a new check, on its own page load after the existing ones, so their counts stay as they are: with `clue-match:journal:v1` set to the fixture before the page loads, the Field Journal counts every fixture animal, and after one find every fixture entry is still in storage with the same `timesSolved`, `bestMoves`, dates, `className` and `sharpEyes`, the found animal's count aside. Another new check: on a fresh load of `/explore/?place=continent:<the run's continent>`, the CDP `Network` events the E2E already listens to (`scripts/e2e.mjs`, near its top) show no request to `/api/places/`. Don't use Resource Timing: it keeps only 250 entries, and the E2E runs under `next dev`. **Both new checks must fail on the unchanged code first**; record that in the plan.
   - The fixture check's details:
     - The fixture holds at least three real animals from the run's pool, because `JournalSheet.tsx` counts pool species only. The malformed entry must be one of them.
     - Load with `?seed=`. Set storage with `evaluate`, then navigate, the way the existing journal check does (`scripts/e2e.mjs`, the `localStorage.setItem` near its end). Don't use `addScriptToEvaluateOnNewDocument`, which would reset storage on every load.
     - If the animal found is in the fixture, expect only `timesSolved + 1` and the same `firstSolvedAt` for it. Its `lastSolvedAt`, `bestMoves` and `sharpEyes` may change.
     - Record in the plan how many `check()` calls the two new checks add. The final E2E's check count is the baseline's plus that number.
5. **`ANIMAL_RULES.version` stays `'055-0'`.** Read from the code: the saved game (`savedGame.ts`) holds `Omit<AnimalSession, 'book'>`, so no `Animal` or `Book`, and the journal is a separate key whose old values the new parser accepts. Nothing this mission changes is in a type the saved game holds (`AnimalSession`, `AnimalRound`, `Trail`, `WitnessNote`, `FieldNote`, `Source`, `SavedBoard`).

### Why

Every rules change opens `questionMatch.ts`, and more than half of it is a game players can't reach. The content check reports a rule that can't fail and describes an eight-color game that's gone, and the paper agents are sent to for "the rules" gives numbers the game dropped a month ago. Sightings are written on every find, shown nowhere, and make every game from a continent wait for the whole place list before its first round. The journal parser is the one change here that can lose player data, so it gets the strictest proof.

### Scope

In:
- `src/clueGame/`: `questionMatch.ts`, `questionMatchContent.ts`, `gems.ts` (deleted), `deduction.ts`, `categories.ts`, `validatePool.ts`, `animalSession.ts`, `animalBoard.ts`, `journal.ts`, `places.ts`, `profiles.ts` (one comment)
- `src/components/animalBoard/AnimalGame.tsx`, `src/components/animalBoard/useAnimalSession.ts`, `src/components/clueGame/useJournal.ts`, `src/components/globe/GlobeScreen.tsx`
- `tests/clueGame/`: `testPool.ts`, `validatePool.test.ts`, `journal.test.ts`, the new `old-journal.json`
- `scripts/e2e.mjs` (the two new checks), `scripts/balance-044.ts` (the usage line only)
- `docs/ANIMAL_BOARD_PAPER.md` (the top line), `docs/CLUE_MATCH.md`, `CONTEXT.md`, `AGENTS.md`, `.claude/skills/playtest/SKILL.md`

Out:
- **The balance bot's rule switches (S18, dropped by the owner).** `scout`, `wander`, `wanderToy`, `toyScout` and `doubleBonus` in `AnimalRules`, the branches for their off positions in the rules, `useAnimalSession.ts`, `ClueBoardScene.ts`, `BoardModel.ts` and `EventBus.ts`, and the bot's `--scout`, `--wander`, `--toy`, `--toyscout` and `--double` flags with their help text all stay as they are.
- **The board engine** (`src/game/`): the "+N charges" labels, `DEFAULT_RULES`'s reader and the comment there naming `applyMatches` are D9, mission M8.
- **Sign-in.** Clerk, `/login`, `/api/clue-game/journal` and its route code stay. Mission M11 removes them. `mergeServerJournal` and `useJournal` change only as D14 says.
- **The database and content.** No table, view, grant or row changes, live or dev copy, no content build, and no file under `db/` changes.
- `src/lib/places.ts`, the `/api/places/` routes and `PlaceCard.tsx` (M6's), and every other audit finding.
- Rewriting the paper's sections for 055-0.

### Definition of done

- **Baseline, before any change:**
  - **M6 has merged.** If `src/clueGame/solveReport.ts` still exists on a fresh `origin/main`, stop and add a handoff item: S16 needs it gone.
  - **Fresh greps.** On a fresh `origin/main`, re-run the greps under "Roots checked" and "Prove it's safe first" in D8, S16, S10 and D14, and record their output in the plan. If a new reader of a name this mission deletes has appeared, stop that part and note it.
  - **Bot.** Save the output of `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 100 --seed 44` to `/srv/critter-ai/agent-state/missions/rules-cleanup/bot-before.txt`. It reads `db/content/` only.
  - **Content check.** Run `npm run content -- check` once in the dev-copy block below (in place of the E2E line), and save its output to `…/rules-cleanup/content-check-before.txt`.
  - **Tests.** Record `npm test`'s pass count.
  - **Baseline E2E.** Run `npm run e2e:fresh` once with the dev-copy block below, and copy its artifact to `…/rules-cleanup/baseline-e2e/`. Record its check count.
- **After deleting `gems.ts`**, run `rm -rf .next .next-e2e .test-dist` before the typecheck: `tsconfig.json` includes the generated `.next-e2e` types, and stale generated files can fail typecheck and the pre-push hook.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint` and `npm test` exit 0. `npm test` passes the baseline's count plus the new cases, minus the deleted sighting case.
  - The bot, run with the same arguments, prints exactly `bot-before.txt` (`diff` is empty; save it as `bot-after.txt`).
  - `npm run content -- check` in the dev-copy block prints the same summary line and the same error and warning counts as `content-check-before.txt`. That alone proves little, because the real content has 0 errors and 0 warnings. So S16's real proof is a unit case in `tests/clueGame/validatePool.test.ts`, **written first, on today's code**. It uses a small pool with gaps: missing categories, a category with only one value, a clue that can't deduce. It pins the full list of warnings by species, label and kind, matching the stable starts of the messages (`: no tagged <label> clue`, `: no <label> `), not their whole text. The same case passes, unchanged, after S16.
  - **`mergeServerJournal` gets a unit case first** in `tests/clueGame/journal.test.ts`. It pins the rule (the larger count, the lower best, the earliest and latest dates, the local `commonName`, `className` and `sharpEyes`), and passes before and after the change. The E2E can't sign in, so this is its only test.
  - S10's comment edits in `src` and `scripts` are one commit of their own, made after the D8, S16 and D14 code changes (so each comment describes the final code), and for it `git diff -U0 <commit>^ <commit> -- src scripts | grep -E '^[+-]' | grep -v -E '^(\+\+\+|---)' | grep -v -E '^[+-]\s*(//|/?\*)'` prints nothing.
  - `ANIMAL_RULES.version` is `'055-0'`, and `git diff origin/main -- src/components/animalBoard/savedGame.ts` is empty.
  - This prints nothing:
    ```
    git grep -n -E '\b(pickRound|newRound|chargesEarned|applyMatches|familyTreeQuote|buyFamilyTreeStep|questionsFor|splitOf|canAsk|scoreSolve|RoundState|RoundStatus|LogEntry|MatchedGroup|FamilyTreeQuote|ScorePart|GEM_KINDS|GEM_OF|evaluateClue|usefulCategories|gemCategory|BY_GEM|fitClue|ClueFit|CLUE_GAME_GEM_TYPES|startTrail|traitSources|redListUrl|loadPlace|isSighting|sightingPoint|Sighting)\b|\.sightings\b|clueGame/gems|gems\.ts|pencilBonus\(|never narrows|does not fit its own species' -- . ':!plans' ':!docs/research' ':!docs/playtests' ':!db/content' ':!src/game/ClueBoardScene.ts' ':!tests/clueGame/old-journal.json' ':!tests/clueGame/journal.test.ts'
    ```
    `autoAsk` and `leadQuestions` aren't in it: they stay as fields of `Rules` and `RULES_041`, and typecheck proves the functions are gone. The word "sighting" in prose (a test name, a comment saying old journals' sightings are ignored) is allowed. The exclusions: `plans/` and `docs/research`, `docs/playtests` are records; `db/content` has an animal fact with the word "sightings"; `ClueBoardScene.ts` has the comment naming `applyMatches` that M8 deletes; the fixture and its unit case hold the old field on purpose.
- **`npm run e2e:fresh` passes**, with the baseline's check count plus the new checks' count, **against the dev copy `phaser_june_dev`, never `.env.local`, with no content build**:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/rules-cleanup/final-e2e/`.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy is reverted). Just before the merge, record from the live site, in the plan: the `key` list of `/api/places/`; the lengths of `species`, `clues` and `facts` in `/api/clue-game/pool/`; and the status codes of `/`, `/explore/` and `/api/clue-game/journal/`. No server code changes, so after the deploy each must match that record exactly:
  - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
  - `/api/places/` has the same keys, `/api/clue-game/pool/` the same three lengths, and `/`, `/explore/` and `/api/clue-game/journal/` the same status codes.
- **The Summary** lists the deleted files and names, the bot and content-check comparisons, the test counts, the E2E runs (with the two new checks) and the smoke results, and says that `ANIMAL_RULES.version` stayed `055-0` and why. It says that no production content build is needed.

### Decision rules

- Delete only what Goal names. Anything else that looks dead is a note in the plan, not an edit.
- If a change would alter a type the saved game holds (Goal 5), don't bump the version: stop that part and add a handoff item.
- If the new fixture case passes on today's code before the parser changes, the fixture isn't today's shape: fix the fixture, not the test.
- If the bot's output or the content check's counts differ, find out why before going on. They must match; a difference is a bug in the cut.
- A test that pinned only deleted code goes with it. Any other failing test is a bug in the change, not a test to update.
- **Flaky E2E steps:** audit A10 records three timing checks that fail by themselves (the globe spin among them). If a local E2E fails only outside the new checks, rerun it once. Never waive a new check.
- If the release rebase brings in changes to `db/content/` or the rules, retake the bot and E2E baselines on the new base before comparing.

### Notes

- **Owner answers (Danby, 2026-11-14).** Q5: keep the balance bot's rule switches; they're how rule experiments get tested, so S18 is dropped. D14 goes ahead: old journals with `sightings` must load with every find kept. A later mission will add a journal transfer by QR code or link that merges two journals, so `JournalEntry`'s other fields and `mergeServerJournal`'s rule stay. Sign-in goes in M11. Bump the rules version only if what a saved game holds changes. The game isn't released to the public yet.
- **What merged first.** M2 (PR #71, `2aa3bd2c`), then M6 (server-cleanup: deletes `POST /api/clue-game/solves`, `solveReport.ts`, `player.ts` and the Drizzle models, and makes `/api/places/` continents only, deleting `PLACE_KIND_LABELS`, `groupPlaces`, `groupLabel` and `REALM_NAMES` from `places.ts`), M1 (Next.js), M3 (agent files: it may have rewritten `AGENTS.md` and the playtest skill) and M4 (toolchain). Re-read every site on a fresh `origin/main`.
- **Who reads what (checked on `2aa3bd2c`):** thirteen files import `questionMatch.ts`, and none takes a name that goes. `redList`, `redListUrl` and `traitSources` are read only by `ask` and `revealStep`. `profiles.ts`'s `redList` is the content profile's, another thing; it stays. `GlobeScreen.tsx` marks finds by `journal[animal.scientificName]` and colors them from the place list, not from the journal. The journal route imports only the `ServerJournalEntry` type and fills `placeKeys` itself. `scripts/connect.ts` loads `.env.local` with dotenv, which doesn't override an exported `DATABASE_URL`, so the content check in the dev-copy block reads the dev copy.
- **The E2E's journal.** It counts the Field Journal's "N of" text and compares the globe's markers with the journal's keys, which is why the fixture check runs on its own page load after the others, and why the fixture uses real animals.
- **Chrome for the E2E:** the shared wrapper `~/.local/bin/chrome-nosandbox` (named in `~/AGENTS.md`). Don't write a copy.
- **Tests first** is the repo's rule (`AGENTS.md`, Testing): both new unit cases are written, and seen to do what Goal says, before the code they guard changes.
- **The pre-push hook** runs typecheck and lint.
- **Size:** about 13 sessions (the audit's 15, less S18).

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `fb6864d0` (= `origin/main` `3436aac5` + mission start), 2026-11-14. State folder `S=/srv/critter-ai/agent-state/missions/rules-cleanup`.

- **M6 merged:** `src/clueGame/solveReport.ts` absent on `origin/main`. OK.
- **Install:** `npm ls --depth=0` clean (deps already installed). No migrations (schema baseline only; no DB change in scope).
- **typecheck / lint:** exit 0 / exit 0.
- **`npm test`:** 61/61 pass (`$S/test-before.txt`).
- **Bot:** `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 100 --seed 44` -> `$S/bot-before.txt` (28 lines, rules 055-0, exit 0, ~56 s).
- **Content check (dev copy, guard passed):** `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.` / `0 errors, 0 warnings.` -> `$S/content-check-before.txt`.
- **Baseline E2E (dev copy):** `npm run e2e:fresh` **1575/1575 checks**, seed 7, place `continent:africa` (27 animals), 4 rounds. Artifact `$S/baseline-e2e/` (log `$S/e2e-baseline.log`).
- **Fresh greps** (all on `origin/main`, full output `$S/baseline-greps.txt`): the D8, D14, S10 and S16 "Roots checked" / "Prove it's safe first" greps plus a `-w` grep per deleted name (`. ':!plans' ':!docs' ':!src/clueGame/questionMatch.ts'`). **No new reader of any name this mission deletes.**
  - `clueGame/questionMatch'` importers: 13 files (balance-044, animalBoard, animalSession, gems, questionMatchContent, signs, AnimalSheets, CategoryMark, EvidenceGrid, useAnimalSession, FactsWithSources, ClueBoardScene (`DEFAULT_RULES` only), animalBoard.test (`makeBook`, `poolFor`)); none takes a name that goes.
  - Non-TS reach (`*.mjs *.cjs *.js *.json *.yml *.sh Dockerfile .github .githooks deploy .claude .agents .kiro`): 0 hits.
  - 0 outside hits: pickRound, newRound, chargesEarned, familyTreeQuote, buyFamilyTreeStep, questionsFor, splitOf, canAsk, scoreSolve, RoundState, RoundStatus, LogEntry, MatchedGroup, FamilyTreeQuote, ScorePart, GEM_KINDS, autoAsk, leadQuestions, revealStep, canTellApart, isOver, PREFIX_ORDER.
  - Only own-file hits: `applyMatches` (ClueBoardScene.ts:284 comment, M8's), `GEM_OF` (gems.ts:6), `pencilBonus(` (animalBoard.ts:474), `evaluateClue`/`usefulCategories` (deduction.ts:45,53), `gemCategory`/`BY_GEM` (categories.ts:37-40), `CLUE_GAME_GEM_TYPES` (categories.ts:35), `startTrail` (animalSession.ts:122), `OTHERS` (testPool.ts:61), `redListUrl`/`traitSources`/`redListSource` (questionMatchContent.ts:78-141). `testPool.ts` is imported only by `citations.test.ts` and `validatePool.test.ts`, both for `clue` and `pool`. `hash32`/`neverAsked` have other importers (animalBoard.ts, seededRng, useAnimalSession, bot): only questionMatch.ts's imports go.
  - `fitClue|ClueFit`: deduction.ts:13,30,45,46, validatePool.ts:5,74. `GEM_CATEGORIES`: categories.ts:24,35,37, validatePool.ts:4,92. `.(shortLabel|deduces|clueCategories|factCategories)`: validatePool.ts:93-96 only. `never narrows|notes at all` in docs/AGENTS.md: 0.
  - Sightings in code: journal.ts (4,19,25,39,44,55,78,84-89,100,114-118), places.ts:57 `sightingPoint`, AnimalGame.tsx:15,300-303, useAnimalSession.ts:39, useJournal.ts:5,22,62, journal.test.ts:20. Non-TS: 0. Docs: `.claude/skills/playtest/SKILL.md:50` ("With `?place=`, a find adds a sighting …") and `docs/CLUE_MATCH.md:10` ("Only continents become sightings: …", **not named in Goal**; for the architect). M6/M3 already removed the skill's "journal's sightings in localStorage" line.
  - `ANIMAL_BOARD_PAPER` pointers: `AGENTS.md:51`, `docs/CLUE_MATCH.md:3`, `docs/CLUE_MATCH.md:51`, `.claude/skills/playtest/SKILL.md:40` (line numbers shifted from the audit's).

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 19:47 UTC · Baseline: greps clean (no new readers), typecheck/lint 0, test 61/61, bot + content check saved, E2E 1575/1575 (dev copy).

## Summary
