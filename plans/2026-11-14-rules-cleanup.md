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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
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

Read on `agent/rules-cleanup` = `origin/main` `3436aac5` + this plan (fetched 2026-11-14). Line numbers are current. Every Goal site was re-read; every name the Goal deletes has no reader outside its own file (baseline greps hold). `npx tsc --noEmit --noUnusedLocals --noUnusedParameters -p .` exits 0 on this base (run 2026-11-14), so it can serve as the orphan check after the cut.

### Findings (ranked by impact)

**F1 · D14: a field nothing reads can drop a find, and the game waits on a request it doesn't need.** Data-loss bug + fail-fast misapplied (a bad *optional, unread* field rejects the whole entry) + separation of concerns (the game page fetches the globe's place list only to build a write nothing shows).
- `src/clueGame/journal.ts:114` `&& (entry.sightings === undefined || (Array.isArray(entry.sightings) && entry.sightings.every(isSighting)))`: one malformed sighting drops the animal; `tests/clueGame/journal.test.ts:19-22` pins it.
- Written: `journal.ts:18-19` (`sightings?: Sighting[]`), `:24-30` (`Sighting`), `:39`/`:44`/`:55` (`recordSolve`'s `sighting`), `:80`/`:84-90`/`:100` (`mergeServerJournal`'s `placeFor` and sightings), `:117-121` (`isSighting`), `:4` (`import { sightingPoint, type Place }`). Point: `src/clueGame/places.ts:53-72` (`sightingPoint`, `clamp`, `round`; nothing else uses the two helpers).
- Built and fetched: `src/components/animalBoard/AnimalGame.tsx:15` (import), `:198` (`place` from the hook), `:300-303`; `src/components/animalBoard/useAnimalSession.ts:13` (`type Place, type PlacesResponse`), `:34-42` (`loadPlace`, the only `/api/places/` call on `/explore`), `:48`, `:104` (`await loadPlace(requested)` before the first deal), `:119`, `:291`. `src/components/clueGame/useJournal.ts:5,7,18-24,48-56,62,66`; `src/components/globe/GlobeScreen.tsx:22` (`useJournal(data?.places)`).
- Shown nowhere: the globe marks by `journal[animal.scientificName]` (`GlobeScreen.tsx:40`) and draws ranges (`Globe.tsx:155-183`). `JournalEntry` has only ever had `className`, `sightings`, `sharpEyes` as optional fields (`git log` of `journal.ts`), and `className` was only ever written when truthy (a string), so "keep only `JournalEntry`'s fields" loses nothing but `sightings`.
- `/api/clue-game/journal` (`src/app/api/clue-game/journal/route.ts`) imports only the `ServerJournalEntry` type and fills `speciesId` and `placeKeys` itself. After the cut the device reads neither (`speciesId` was read only for `sightingPoint`); both stay in the type so the route doesn't change.
- Docs: `.claude/skills/playtest/SKILL.md:50` ("With `?place=`, a find adds a sighting …"; line 36 is already right, M3/M6). **Missed by the Goal:** `docs/CLUE_MATCH.md:10` "Only continents become sightings: on a fresh device an old solve's country or area adds none (sightings already on a device stay)." becomes false with D14; the audit's M9 entry counts on M7 settling the D14 line of that file. **Decision: delete that sentence in D14.** Also made false by D14: `places.ts:2` "helpers for the globe and the journal" (fixed in the S10 commit).

**F2 · S16: a gate rule that can't fail, and a table that describes a dead game.** Fail fast (a check that reads like protection and gives none), KISS.
- `src/clueGame/validatePool.ts:72-77`: `fitClue(clue, clue.speciesId, records) !== 'fits'` → "does not fit its own species". Verified tautological: `buildSpeciesRecords` (`src/clueGame/traits.ts:74-77`) adds every `normalizeTag(tag)` of each clue to its own species' record, `fitClue` (`src/clueGame/deduction.ts:30-43`) compares `clueTags` (the same `normalizeTag`), and `isDeductive` guarantees ≥1 tag, so it returns `'fits'` unless the species is missing, which `validatePool.ts:24` already reports. Only behavior change: that duplicate error goes.
- `src/clueGame/categories.ts:8-22`: `gem`, `shortLabel`, `question`, `color` have no reader (`.(shortLabel|deduces|clueCategories|factCategories)` hit only `validatePool.ts:93-96`); `:35` `CLUE_GAME_GEM_TYPES` has none (M6 deleted `solveReport.ts`); `:37-43` `BY_GEM`/`gemCategory` none (D8). The kept fields' comments also speak of gems ("this gem draws from, merged by reveal order", "used once the clues run out", "this color's clues narrow the candidates"): rewritten with the header.
- `validatePool.ts:96-97`: "so that color never narrows its rounds", "notes at all". No doc quotes them (0 hits).
- Fine: the one-value rule (`:79-86`), the realm rule, the completeness loop's conditions, `tagOutcome` (read by `signs.ts:281`) and `isDeductive`.

**F3 · D8: more than half of `questionMatch.ts` is an unreachable game.** Dead code (KISS, SRP: the file mixes the live question vocabulary with two dead rule engines).
- `src/clueGame/questionMatch.ts:252-589` (`// ---- Rounds ----`): besides the Goal's list it holds `standing`, `Removal`, `Question`, `ask`, `guess`, `revealStep`, `settleFamilyTree`; all go with the section (common words, so not in the final grep; typecheck and the orphan check prove them). `likeness` (`:312-321`) stays: `animalBoard.ts:151` reads it. Helpers: `animal` (`:241-245`), `PREFIX_ORDER` (`:30`), `canTellApart`, `isOver`, `shuffle`; imports `hash32` (`:9`), `neverAsked` (`:10`). `GEM_KINDS` (`:16`). `REGIONS`/`ContinentKey` stay (question text, `Animal`, `poolFor`).
- `Animal.redList`/`redListUrl` (`:47-48`), `traitSources` (`:52-53`); builder `src/clueGame/questionMatchContent.ts:67` (`AnimalInput.redList`), `:78`, `:80`, `:88`, `:101`, `:141`, fills `:159`, `:188`. Only readers were `ask`/`revealStep`. `unsourced` (`:150`, from `species.redlistUrl`) and `sourceOf` (`:176-179`, `profile.redList.url`) are other things and stay.
- `src/clueGame/gems.ts` (6 lines, no importer). `deduction.ts:45-61` (`evaluateClue`, `usefulCategories`). `categories.ts:37-43`. `tests/clueGame/testPool.ts:58-65` (`records`, `find`, `OTHERS`, `matched`; importers take `clue`, `pool` only). `src/clueGame/animalSession.ts:122` `export const startTrail = newTrail;`. `src/clueGame/animalBoard.ts:474-476` `pencilBonus()` (comment `:465-473`).
- **Consequential import removals the Goal doesn't list** (each becomes unused): `animalSession.ts:5` `newTrail`; `deduction.ts:3` `SpeciesClueCategory`, then (S16) `allTraits` and `type SpeciesRecords` from `:5`; `categories.ts:3` `GemType`; `testPool.ts:2` `buildSpeciesRecords`, `:4` `GemType`.
- Docs: `AGENTS.md:54` "`regions`, `gems`;", `docs/CLUE_MATCH.md:21` ", `gems.ts` (gem color ↔ category)".

**F4 · S10: the docs send readers to a paper frozen at 044-0, and nine comments describe things that are gone.** Docs truth; no code effect.
- Pointers: `docs/CLUE_MATCH.md:3`, `:51`, `AGENTS.md:51`, `.claude/skills/playtest/SKILL.md:40`. Paper top: `docs/ANIMAL_BOARD_PAPER.md:1-3`.
- Glossary: `CONTEXT.md:97` (pencil), `:124` (name it), `:140` (journal), `:144` (source). Sources today (read from code): the round-end card's "Field notes" list, all of the mystery's notes with sources (`AnimalSheets.tsx:711-721`, `FactsWithSources`), and the Field Journal's key facts with sources plus a Red List link (`JournalSheet.tsx:71-75`, `pool.ts:124 keyFacts`); no screen shows a trait's source.
- Comments: `animalBoard.ts:12-13`; `questionMatchContent.ts:1-6`; `places.ts:35`; `profiles.ts:60`; `categories.ts:1-2`; `journal.ts:1-3`; `questionMatch.ts:160` (`shortQuestionText` now names each clue gem for screen readers, `useAnimalSession.ts:205` → `ClueBoardScene.ts:123`, and is `columnLabel`'s fallback); `scripts/balance-044.ts:9` (a `//` comment, so the comment-only check holds; defaults at `:239,241` are `ANIMAL_RULES`' 20 and 8,14). `places.ts:3` is already fixed (M6). **Missed by the Goal, same stale fact:** `questionMatchContent.ts:172` "The prototype's and the bot's door" (the doors are the bot's and `tests/clueGame/animalBoard.test.ts:23`'s); fixed in the S10 commit.

**Goal 5 holds.** `savedGame.ts:18` stores `Omit<AnimalSession, 'book'>`; `AnimalSession`, `AnimalRound`, `Trail`, `WitnessNote`, `FieldNote`, `Source`, `SavedBoard` are untouched (`AnimalRound.pencilBonus` stays; `roundStillFits` compares notes, which the `Animal` cut doesn't touch). `ANIMAL_RULES.version` stays `'055-0'`.

**Seen, not edited (Decision rule 1; notes for later missions):** `questionMatch.ts:14` `GemKind`'s comment ("What a gem color gives: charges …") and `CATEGORY_LABELS.notes` (every reader indexes by `ChargeCategory`); `Rules`' comments "see autoAsk" / "see leadQuestions" and `RULES_041`'s "Kept for the balance bot." (kept with the rule sets; M8); `docs/CLUE_MATCH.md:7` "glow on the globe where you found them" (the globe draws ranges) and `:55` "deleted from the code" (S11, M9); `CONTEXT.md:134` Star line doesn't mention a Sharp eye's second star; `ServerJournalEntry.speciesId` unread on the device (M11 removes the route).

### Target design

No new modules or abstractions. Delete-only except `parseJournal`'s entry builder and the rewritten comments and doc lines. The unit cases and E2E checks the Brief requires come first (Steps).

**D8 (code commit; docs with it)**
- `questionMatch.ts`: delete `:9-10`, `:16`, `:30`, `:47-48`, `:52-53`, `:241-245`, and `:252-589` except `likeness`, which moves up under `// ---- Looking animals up ----` after `poolFor`. Keep `:12-15`, `:18-29`, `:32-46`, `:49-51`, `:54-224`, `Book`, `makeBook`, `poolFor`. Header `:1-6` becomes:
  ```text
  // The questions the animal board (animalBoard.ts) asks, from plan 041's Question Match: the five question
  // categories and the trait prefixes each asks about, each question's full, short and column text, the Animal
  // type the content builds (questionMatchContent.ts), the book that looks animals up, poolFor and likeness.
  // Rules, RULES_041 and DEFAULT_RULES are the 041 and 043 rule sets, read now only by the board's "+N charges"
  // labels (ClueBoardScene.ts). Pure: no DOM, no Phaser.
  ```
- `questionMatchContent.ts`: delete `:67`, `:78`, `:80`, `:101`, `:159`, `:188`; `:86-89` becomes `for (const tag of askable) (traits[prefixOf(tag)] ??= []).push(tag);`; `:141` becomes `continents, traits, familyTree, notes, revealNotes, guide,` after `photo: input.photo,`.
- Delete `gems.ts`; then `rm -rf .next .next-e2e .test-dist` before typecheck (Brief).
- `deduction.ts`: delete `:45-61` and the `SpeciesClueCategory` import.
- `categories.ts`: delete `:37-43`.
- `testPool.ts`: delete `:58-65` and the `buildSpeciesRecords`, `GemType` imports.
- `animalSession.ts`: delete `:122` and `newTrail` from `:5`.
- `animalBoard.ts`: delete `pencilBonus` (`:474-476`) and its one-line pointer doc on `scorePencils` (`:478`); the long comment (`:465-473`, unchanged) sits on `scorePencils`, ending with one added line: ` * Returns the bonus with how many pencils counted and how many were wrong (Sharp eye: enough, none wrong).` `scorePencils` stays private.
- `AGENTS.md:54` → "… `signs` sign vocabulary + checks, `regions`; plus glossary, …". `docs/CLUE_MATCH.md:21` drops ", `gems.ts` (gem color ↔ category)".

**S16 (code commit)**
- `validatePool.ts`: delete `:72-77`; `:5` becomes `import { isDeductive } from '@/clueGame/deduction';`. `:96-97` become (conditions unchanged):
  ```ts
  if (category.deduces && !deducesHere) warnings.push(`${name(id)}: no tagged ${category.label} clue (every profile needs one)`);
  if (!hasClues && !hasFacts) warnings.push(`${name(id)}: no ${category.label} clue or fact (every profile needs one)`);
  ```
- `deduction.ts`: delete `ClueFit` with its doc (`:7-13`) and `fitClue` (`:30-43`); `:5` becomes `import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, clueTags, prefixOf } from '@/clueGame/traits';`. Left: header, `TagOutcome`, `tagOutcome`, `isDeductive`.
- `categories.ts`: `GemCategory` = `label`, `clueCategories`, `factCategories`, `deduces` (the deleted fields' comments go with them); delete `:35` and the `GemType` import. Rows, values copied exactly:
  ```ts
  { label: 'Family tree', clueCategories: ['taxonomy'], factCategories: [], deduces: true },
  { label: 'Body', clueCategories: ['morphology'], factCategories: [], deduces: true },
  { label: 'Behavior & diet', clueCategories: ['behavior', 'diet'], factCategories: ['behavior', 'diet_prey', 'diet_flora'], deduces: true },
  { label: 'Habitat', clueCategories: ['habitat'], factCategories: [], deduces: true },
  { label: 'Range', clueCategories: ['geography'], factCategories: [], deduces: true },
  { label: 'Life cycle', clueCategories: ['reproduction'], factCategories: ['life_description'], deduces: true },
  { label: 'Conservation', clueCategories: ['conservation'], factCategories: ['threat'], deduces: false },
  { label: 'Key facts', clueCategories: ['key_fact'], factCategories: ['key_fact'], deduces: false },
  ```

**D14 (code commit; docs with it)**
- `journal.ts`: delete `:4`, `:18-19`, `:24-30`, `:117-121`; `recordSolve(journal, species, moves, at, sharp = false)` without `:44`/`:55`; `mergeServerJournal(journal, entries)` without `:84-90`/`:100`, the rule otherwise byte-for-byte. `isEntry` and the `.map` in `parseJournal` become one query that builds the entry from `JournalEntry`'s fields, with the same required-field rules and the `key === scientificName` rule:
  ```ts
  /** A stored entry with only JournalEntry's fields, or null when one it needs is missing or wrong. Old and unknown fields (sightings, before 2026-11) are left out; a bad badge count or class drops that field, not the animal. */
  function toEntry(value: unknown): JournalEntry | null {
    if (!value || typeof value !== 'object') return null;
    const { scientificName, commonName, timesSolved, bestMoves, firstSolvedAt, lastSolvedAt, className, sharpEyes } = value as Record<string, unknown>;
    if (typeof scientificName !== 'string' || typeof commonName !== 'string' || !Number.isInteger(timesSolved) || (timesSolved as number) <= 0
      || typeof bestMoves !== 'number' || !Number.isFinite(bestMoves) || typeof firstSolvedAt !== 'string' || typeof lastSolvedAt !== 'string') return null;
    return {
      scientificName, commonName, timesSolved: timesSolved as number, bestMoves, firstSolvedAt, lastSolvedAt,
      ...(typeof className === 'string' ? { className } : {}),
      ...(Number.isInteger(sharpEyes) && (sharpEyes as number) > 0 ? { sharpEyes: sharpEyes as number } : {}),
    };
  }
  // parseJournal: Object.fromEntries(Object.entries(parsed).flatMap(([key, value]) => { const entry = toEntry(value); return entry && entry.scientificName === key ? [[key, entry]] : []; }))
  ```
  **Decision:** a non-string `className` drops the class, not the animal (no version ever wrote one; copying any value would put junk into a typed field).
  Comments: `:16` → `/** e.g. 'MAMMALIA'. Kept with each find; no screen reads it. */`; `:71` → `/** Globe places it was solved in. The route still sends them; the device has ignored them since sightings went (2026-11). */`; `:75-79` loses "Places become sightings when `placeFor` knows them." (keeps "… the earliest and latest dates. Safe to repeat.").
- `places.ts`: delete `:53-72`.
- `useAnimalSession.ts`: delete `loadPlace` (`:34-42`), `Content.place` (`:48`), `:104`, `place: continent ? place : null,` from `:119`, `:291`; `:13` becomes `import { MIN_PLACE_ANIMALS } from '@/clueGame/places';`. `getJson` stays (pool).
- `AnimalGame.tsx`: delete `:15`, `place` from `:198`, `:300-301`; `:302` → `record(species, done.movesUsed, { score: session.score, streak: session.bestStreak }, sharpEye(done));`; deps `[session, end, speciesById, record, recordedRound]`.
- `useJournal.ts`: `useJournal()`; `record(species, moves, session, sharp = false)`; merge effect `mergeServerJournal(previous, saved)` with deps `[saved]`; drop the `Sighting` and `Place` imports. Doc `:18-23` → "The Field Journal and personal bests in localStorage. Storage can be unavailable (private mode); play still works. A signed-in player's solves saved before 2026-10-01 are merged in."
- `GlobeScreen.tsx:22` → `const { journal } = useJournal();`.
- `tests/clueGame/journal.test.ts`: delete `:19-22`. The fixture case reads `tests/clueGame/old-journal.json` as a string (`readFileSync(path.join(process.cwd(), …), 'utf8')`, as `contentPool.ts` does) and passes it straight to `parseJournal`, exactly what `useJournal` gets from localStorage. The `mergeServerJournal` case calls it with two arguments (valid before and after) and gives an entry a `placeKeys` value.
- `scripts/e2e.mjs` (the Brief's two checks): one more branch in the existing `browser.on` listener (`:115-127`), `Network.requestWillBeSent` → push `params.request.url`. The check takes the array's length just before its `goto` and filters what came after by `new URL(url).pathname.startsWith('/api/places')`. `requestWillBeSent` also fires for HTTP-cache hits. The E2E's own in-page `fetch('/api/places/')` calls (`:432`, `:2308`) fall outside that window. The fixture check reads the same JSON file (one source, DRY). Neither check names `sightings`/`Sighting` in code: the final grep doesn't exclude `e2e.mjs`. Compare the kept fields by name.
- Docs: `SKILL.md:50` → "- With `?place=continent:<name>`, every suspect lives on that continent (one with fewer than 12 animals plays everyone) and Range questions name only its regions; a find goes in the journal as it does from Anywhere." (`useAnimalSession.ts:106-108`, `animalBoard.ts:93`). `docs/CLUE_MATCH.md:10`: delete the "Only continents become sightings: …" sentence.

**S10 (one comment-only commit in `src`/`scripts`, after the three above; docs in the same or their own commit)**
- `animalBoard.ts:12-13` "… Shared\n// by the balance bot (scripts/balance-044.ts) and, later, the game." → "… The game\n// (useAnimalSession.ts) and the balance bot (scripts/balance-044.ts) both play it."
- `questionMatchContent.ts:1-6`:
  ```text
  // Content -> the Animal records the animal board plays with (questionMatch.ts): the traits
  // questions can ask about, regions and continents, family tree names, field guide lines,
  // signs, and field notes (with blanks where a word would name the animal) with their sources.
  // Two front doors, one builder: animalsFromPool for the game (database rows from
  // GET /api/clue-game/pool) and animalsFromProfiles for the balance bot and the unit tests
  // (db/content/animals/*.json). Pure.
  ```
  `:172` → `/** The bot's and the unit tests' door: the animal files, with the source registry for source names. */`
- `places.ts:2` "… plus small pure helpers for the globe and the journal." → "… plus small pure helpers for the globe."; `:35` → `/** A continent opens once it has this many animals (plan 041); a round's suspects (5) are drawn from them. */`
- `profiles.ts:60` → `/** Fun facts. They become field notes after the hand-written clues: listed with sources on the round-end card, the key_fact ones in the Field Journal; never witness notes (no tags). */`
- `categories.ts:1-2` →
  ```text
  // The content check's groups (validatePool.ts warns when a playable animal has no clue or fact in a
  // group, or no tagged clue in a group that `deduces`). The eight rows began as the first clue game's
  // gem colors; no screen reads them now.
  ```
  Field comments: `clueCategories` "`species_deduction_clues.category` values in this group."; `factCategories` "`species_facts.category` values in this group (never deductive)."; `deduces` "Whether the group needs a tagged clue (false: notes to learn from)."
- `journal.ts:1-3` →
  ```text
  // The Field Journal: animals this player has identified, kept on their device.
  // Keyed by scientific name so it survives database id changes. Nothing is saved to the
  // server now; mergeServerJournal folds in the solves an account saved before 2026-10-01.
  ```
- `questionMatch.ts:160` → `/** Short versions: what the board calls each clue gem (screen readers), and columnLabel's fallback. */`
- `balance-044.ts:9`: `[--order 24]` → `[--order 20]`, `[--stars 6,13]` → `[--stars 8,14]`.
- This commit adds and removes no blank lines and no line with code: an empty `+` line fails the Brief's grep.
- `docs/ANIMAL_BOARD_PAPER.md`: one line after the title (line 2 blank, then this, then a blank line, then the byline):
  ```text
  > **A dated paper, not kept current.** This is the 2026-10-01 paper for rules 044-0, with the notes below for later rules up to 053-1. The current rules are summarised in `docs/CLUE_MATCH.md` (Rules) and `CONTEXT.md`; the numbers are in `ANIMAL_RULES` (`src/clueGame/animalBoard.ts`).
  ```
- `docs/CLUE_MATCH.md:3` → "> `/explore` plays the plan 044 animal board (five suspects pinned on the board, clue orders, Rule out and release; rules under Rules below and in `CONTEXT.md`; design `plans/044-animal-board.md` and the frozen 044-0 paper `docs/ANIMAL_BOARD_PAPER.md`). `npm run e2e` checks that game."
- `docs/CLUE_MATCH.md:51` → "The rules version is `ANIMAL_RULES.version` (bumping it drops a game saved in the tab); the numbers are in `ANIMAL_RULES`, `src/clueGame/animalBoard.ts`. The current rules are summarised below; terms: `CONTEXT.md`. A worked example and why random play fails: `docs/ANIMAL_BOARD_PAPER.md` §2–3, the 044-0 design paper (frozen at 044-0, with notes up to 053-1). Design and decisions: `plans/044-animal-board.md`, `plans/045-scout-the-suspects.md`."
- `AGENTS.md:51` "Guide: `docs/CLUE_MATCH.md`; rules: `docs/ANIMAL_BOARD_PAPER.md`; design and decisions: `plans/044-animal-board.md`; terms: `CONTEXT.md`." → "Guide: `docs/CLUE_MATCH.md` (its Rules section: the current rules in short); terms: `CONTEXT.md`; design and decisions: `plans/044-animal-board.md` and the frozen 044-0 paper `docs/ANIMAL_BOARD_PAPER.md`."
- `SKILL.md:40` "Rules: `docs/CLUE_MATCH.md` (Rules), in full `docs/ANIMAL_BOARD_PAPER.md` §2." → "Rules: `docs/CLUE_MATCH.md` (Rules) and `CONTEXT.md` (terms); `docs/ANIMAL_BOARD_PAPER.md` §2 is the frozen 044-0 design paper." (the rest of the line unchanged).
- `CONTEXT.md:97` → "The player's own guess written in a hidden answer (yes or no). Once that answer is scouted, the grid shows the guess right or wrong; a right name scores the pencil marks (the pencil bonus)."
- `CONTEXT.md:124` → "… Right is a find worth one star, two with a Sharp eye (a big pencil bonus with no pencil wrong); wrong loses the round."
- `CONTEXT.md:140` → "The player's record of the animals they've found or named, kept on the device. Signing in only merges in the finds an account saved before October 2026; nothing new is saved there."
- `CONTEXT.md:144` → "Where a trait's or witness note's fact comes from, such as the IUCN Red List or Animal Diversity Web. Players see sources after a round: the round-end card's field notes and the Field Journal's facts each end in a source number that opens the full citation under Sources. No screen shows a trait's source."

### Rejected alternatives

- Strip only `sightings` (`const { sightings, ...rest } = entry`): keeps unknown junk fields; the Brief asks for `JournalEntry`'s fields only.
- Keep `isEntry` and add a pick step in `.map`: two passes over one entry, with a cast; `toEntry` does both in one query.
- Copy `className` unchecked: puts non-strings into a typed field. Treating it like `sharpEyes` (drop the field, keep the animal) matches the rule the Brief keeps.
- Validate and keep well-formed sightings: keeps a field nothing reads; the owner chose to drop it.
- Remove `placeKeys`/`speciesId` from `ServerJournalEntry`: changes the route's contract; the route is M11's.
- Bump `ANIMAL_RULES.version`: nothing a saved game holds changes (Goal 5).
- Rename `GEM_CATEGORIES` or move `likeness` into `animalBoard.ts`: churn outside the Brief, which keeps both.
- A separate script or env switch for the two new E2E checks: the Brief puts them in `e2e.mjs`, and a one-off run proves they fail first.

### Risks and checks

- **Orphans:** after each code commit (and after `rm -rf .next .next-e2e .test-dist`), `npm run typecheck` and `npx tsc --noEmit --noUnusedLocals --noUnusedParameters -p .` exit 0 (0 at baseline). The second catches every private helper and import the cut leaves behind (`animal`, `shuffle`, `PREFIX_ORDER`, `clamp`, `round`, `newTrail`, `GemType`, `allTraits`, `SpeciesRecords`, `SpeciesClueCategory`, `buildSpeciesRecords`, `Place`, `PlacesResponse`, `Sighting`). Lint exits 0.
- **D8:** the bot run with the same arguments prints exactly `bot-before.txt`. It runs `animalsFromProfiles`, `makeBook`, `poolFor`, `likeness` and the 044 rules, so it would show any slip. The E2E plays rounds through everything that stays. The final grep prints nothing.
- **S16 (risk: a dropped row or category quietly weakens the warnings):** (a) the Brief's warnings-pin unit case, written first, passes unchanged; (b) exhaustive proof: a scratch script (relative imports, not committed) prints `JSON.stringify(GEM_CATEGORIES.map(({ label, clueCategories, factCategories, deduces }) => ({ label, clueCategories, factCategories, deduces })))` before the change to `$S/categories-before.json` and after it, and `diff` is empty; (c) the content check on the dev copy prints the same summary and counts (`content-check-before.txt`); (d) the one-value unit case passes before and after.
- **D14 (risk: lost finds):** the fixture case fails on today's code (malformed entry dropped) and passes after. The `mergeServerJournal` case passes before and after. Both E2E checks fail on unchanged code, then pass. `git diff origin/main -- src/components/animalBoard/savedGame.ts` is empty. Intended behavior changes: entries with a malformed sighting now load; at the next journal save, every stored entry loses `sightings` (and any unknown field); a non-string `className` is dropped; `/explore/?place=` deals without waiting on `/api/places/` and can no longer log that request's error.
- **S10:** the Brief's comment-only grep on that commit prints nothing. Read the three glossary lines against `starsFor` (`animalBoard.ts:528-533`), `PENCIL_POINTS`, `animalSession.ts:33` and the journal route.
- **Tests:** `npm test` = 61 + 4 (one-value, warnings pin, merge, fixture) − 1 (malformed sighting) = **64**, if each is one `test()`.
- **Content build and live data:** nothing the content build or `/api/*` runs changes (`validatePool` writes nothing; `signs.ts`' use of `deduction.ts`/`questionMatch.ts` names stays). No production content build needed. No DB change.

### Open questions

None.

## Architecture review (Fable)

Advisor (Fable 5.2), 2026-11-14, on the Architecture section and the files it cites (`journal.ts`, `useJournal.ts`, `deduction.ts`, `categories.ts`, `validatePool.ts`, `traits.ts`, `AnimalGame.tsx`, `useAnimalSession.ts`, `scripts/e2e.mjs`, `journal.test.ts`). Each point checked against the code:
- F1 real (`journal.ts:114` drops the animal on one bad sighting). F2 real: `buildSpeciesRecords` adds `normalizeTag(tag)` and `clueTags` uses the same `normalizeTag`, so `fitClue(clue, clue.speciesId)` is `'fits'` whenever the species exists. `toEntry` keeps today's required-field rules; `className` is only ever written truthy and has no reader (`rg` over `src`). A journal the new code saves (no `sightings`) still loads in the old code, so a revert after a failed deploy is safe.
- Final Definition-of-done grep, dry-run on the unchanged tree: every hit is on a line the design deletes or rewrites (`docs/CLUE_MATCH.md:21`, `AnimalGame.tsx:15,300`, `useAnimalSession.ts:34,104`, `useJournal.ts:5,62`, plus the in-scope `src/clueGame/` files). No hit in `docs/ANIMAL_BOARD_PAPER.md`, `CONTEXT.md`, `.agents/` or `scripts/e2e.mjs`.
- Old message texts (`does not fit its own species`, `never narrows`, `notes at all`): only `validatePool.ts:75,96,97`; no test or script pins them, so the 64-test count holds.
- `/api/places` callers in `src`: `useAnimalSession.ts:36` (goes), `GlobeScreen.tsx:30` and `Globe.tsx:199` (globe only, not on `/explore`).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. **Commit order and `GemType`:** D8 before S16 (`evaluateClue` calls `fitClue`). F3 lists `categories.ts`'s `GemType` import as a D8 removal, but `GemCategory.gem` and `CLUE_GAME_GEM_TYPES` use it until S16; follow the Target design (S16 removes it), not F3.
2. **Network check:** assert only after the first round is dealt (on old code `loadPlace` runs after the pool fetch, so an early assert passes for nothing). The `/api/places` prefix also matches `/api/places/outline`; fine, nothing on `/explore` calls it.
3. **Fixture check resume:** the fixture load must deal a new round, not resume the tab's saved game, or the `recordedRound` guard (`AnimalGame.tsx:294`) skips the find and the check fails for the wrong reason. Pick the fixture animals from the dev copy's `/api/clue-game/pool/` (CI's data), and from the run's continent pool if the journal counts only that.
4. **Fixture unit case pins "left out":** also assert each parsed entry's key set (no `sightings`, no unknown field). It still fails first on today's code.
5. **Doc claims and extras:** read "fewer than 12" against `MIN_PLACE_ANIMALS` (12, holds), "no screen reads" `className` (holds), and the "source number that opens the full citation" wording against `AnimalSheets.tsx`/`JournalSheet.tsx` when writing. The `docs/CLUE_MATCH.md:10` deletion and the `questionMatchContent.ts:172`, `places.ts:2` comment fixes go beyond Goal's list: record them under **Decisions** when made.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER: none

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 19:47 UTC · Baseline: greps clean (no new readers), typecheck/lint 0, test 61/61, bot + content check saved, E2E 1575/1575 (dev copy).
- 2026-11-14 20:12 UTC · Architecture: `architect` wrote findings + target design (D14 > S16 > D8 > S10; delete-only except journal `toEntry`; extra stale comments + `docs/CLUE_MATCH.md:10` added; open questions none). Plan-only; typecheck 0.
- 2026-11-14 20:06 UTC · Fable review: APPROVE_WITH_CHANGES, MUST-FIX none, MISSED none, 5 SHOULD-CONSIDER (for Steps). Final grep dry-run: all hits on lines the design changes; old messages pinned by no test. Plan-only.
- 2026-11-14 20:30 UTC · Astra review: APPROVE, MUST-FIX none, SHOULD-CONSIDER none. Plan-only.

## Summary
