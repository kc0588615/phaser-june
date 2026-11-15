---
mission: screens-cleanup
project: critter-connect
branch: agent/screens-cleanup
status: active
started: 2026-11-15 12:15 UTC
---

# Mission: Screens cleanup: earlier games' leftovers, the OAuth logo, the data font, saved games and the journal across tabs, the game guide (Critter Connect, audit M9)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M9 of the codebase audit (vault `research/critter-connect/codebase-audit.md`: read findings D22, D23, O1, A16, A17 and S11, the keeps K2 and K5, the M9 entry and "What every mission shares" under "## Proposed follow-up missions", in full). The owner's answers in Notes override the audit where they differ. Quote text when you find a site: line numbers here are from `origin/main` at `af4b0453`, and M4, M7, M8, M10 and M5 merge before this mission and shift them. When it's done:

1. **D22: the screens hold nothing from earlier games or finished rollouts.** Nothing a player sees changes.
   - `src/styles/globals.css`: `.roster-cross`, `.cm-shake`, `.cm-pop-in` and `.cm-countdown` are gone with their keyframes (`roster-cross-in`, `cm-shake`, `cm-pop-in`, `cm-countdown`) and their three names in the `prefers-reduced-motion` list. `.cm-range-ping`, its keyframes and its place in that list stay. The comment "/* Clue Match (cm-*, roster-cross: the unrouted 043 game, plus the range map's ping) */" becomes `/* The range map's ping (RangeMap) */`.
   - `src/components/clueGame/RangeMap.tsx`: the `caption` prop, the `{range && caption && (` figcaption ("Range about … km²", "Map: IUCN Red List") and `const area = new Intl.NumberFormat(...)` are gone. `JournalSheet.tsx` stops passing `caption={false}`. The journal's map credit line ("Range maps: IUCN Red List", which M10 extends with One Earth's citation) stays exactly as you find it.
   - `src/components/animalBoard/useAnimalSession.ts`: the fallback under "// A pool cached from before citations shipped (max-age 60 + stale 600) has none: treat as empty." becomes one line, `const pool = await getJson<CluePool>('/api/clue-game/pool/');`. The pool always sends `citations` (`poolFromRows` in `src/clueGame/pool.ts`).
   - Props no caller passes are gone: `size` on `AnimalCard`, and then `size` on `SuspectPhoto` (its only caller is `AnimalCard`; the image asks for 120, as now); `children` on `TrapCard` with the comment's "`children`: what sits on it (the player's own mark count)" and the then-unused `ReactNode` import; `itemClassName` on `FactsWithSources`; `width` on `SpeciesPortrait` (it asks for 120, as now); `className` on `PhotoCredit`. Typecheck proves no caller passed one.
   - `type Pencil = …` in `AnimalGame.tsx` goes; it imports `type Pencil` from `@/clueGame/animalBoard`.
   - `HOLD_MS` (450) is declared once, in `src/game/constants.ts`, with a doc comment saying it is the long press on an animal for both the board's tiles and the grid's rows. `BoardController.ts` and `EvidenceGrid.tsx` import it; their own declarations and EvidenceGrid's comment "the board's tiles use the same (BoardController)" go. The value stays 450 (M8 keeps it fixed too).
   - In `EvidenceGrid.tsx`, `` className={`ev-missed absolute right-xxs top-px ${fresh ? 'is-fresh' : ''}`} ``, which stands inside `guess && !called && fresh &&`, becomes `className="ev-missed is-fresh absolute right-xxs top-px"`. If M8 rewrote that line, make the change only if the class is still inside a `fresh &&` condition.
   - The audit's dry run of all of this is `/srv/critter-ai/agent-state/missions/critter-connect-audit/audit/area-6/dryrun.patch` (on `4fa92a8e`; it predates M7's removal of `sightingPoint` and `loadPlace`). Use it as a guide, never `git apply` it.
2. **D23: the OAuth logo and its note are gone from `public/`.** `git rm public/branding/critterconnect-oauth-logo.png public/branding/critterconnect-oauth-logo.prompt.txt`. Nothing moves to `docs/brand/`: git history keeps the PNG. The two wordmarks in `public/branding/` stay.
3. **O1: the data font's two files hold only the characters the game draws with it.**
   - **The list comes from the source first.** Every element with the `font-data` class (`git grep -n -w font-data -- src`: 20 lines in 6 files at `af4b0453`) and everything rendered inside it, including the values passed in (the trail sheet's `stats`, `Stat`'s `value`, the grid's `${have}/${size}` and its `?`). Record each line with the characters it can draw in the plan. Read at `af4b0453`, the union was: the space, `+ . / ? 0-9`, the letters `C a b e f i l m n o s t u v` ("Clue 2 of 4", "3 of 5", "best 12 moves", "40 animals"), `×` (U+00D7, the journal's "×3") and `−` (U+2212, a negative pencil bonus). Re-derive it on the fresh `origin/main`. The ten digits are always in it, whatever the source shows.
   - `public/fonts/open-runde/OpenRunde-Regular.woff2` and `OpenRunde-Bold.woff2` are each cut from **the original files on the fresh `origin/main`** (never from a cut file) with fontTools, run through `uvx` so nothing is installed: `uvx --from 'fonttools[woff]' pyftsubset <original> --unicodes=<the list> --layout-features='*' --name-IDs='*' --name-languages='*' --flavor=woff2 --output-file=<file>`. `--layout-features='*'` keeps `tnum`, which `tabular-nums` needs and the default feature set leaves out; the name table keeps the font's copyright and licence notice. Record fontTools' version.
   - If Open Runde has no glyph for a character on the list (U+2212 is unchecked), leave that character out of the cut and of `unicode-range`. It falls back to the next font, as it does today. Record it.
   - Both Open Runde `@font-face` rules get a `unicode-range` listing exactly the characters in the cut. Their comment says the files hold only those characters, that a new character drawn in `font-data` needs both files cut again from the full ones (last in git at this mission's base commit, named in the comment) and both ranges updated.
   - `public/fonts/open-runde/OFL.txt` and every other file under `public/fonts/` are unchanged (K5).
   - The two files together are under 40 KB (154,604 + 162,468 bytes today). Record both sizes.
4. **A16: a saved game that can't be resumed is dropped, and a new game starts.**
   - The load resumes a save only when all of these hold:
     - today's guard holds: the same `requested`, the same `ANIMAL_RULES.version`, and `roundStillFits`;
     - **it has every field today's code writes.** Compare it with the session the load would deal for round 1 (its `book` aside). The saved `session`, `session.round`, `session.round.rules` and `session.trail` must each hold every key the fresh one holds with a defined value. Each such value must be of the same JSON kind (object, array, string, number or boolean), and a `null` on either side matches anything. Arrays aren't looked inside: their items have optional fields, and `roundStillFits` already reads the orders and the notes. This catches a field added to the session, the round, the rules or the trail without a rules version bump (the audit's case: `rowOrder`, 2026-11-04);
     - nothing in the guard, the comparison or the restore throws.
   - The comparison is a pure function, `fitsShape(saved, fresh)`, exported from `src/components/animalBoard/savedGame.ts`.
   - **Dropping** means: `clearSavedGame()` at once; one `console.warn` (never `console.error`) giving the reason; then the fresh round 1 that today's code deals for the saved seed, or for a new random seed when the saved one isn't an integer from 1 to `0xffff_ffff`. The new game's save then replaces the old one, as usual. A drop never shows "Could not load the animals. Check the connection and reload.": that message stays for a pool that fails to load.
   - The existing checks keep their behaviour: a save from another continent is passed over, and a save whose witness notes no longer fit deals a fresh round 1 from its seed.
   - `SavedGame` keeps `v: 1`, and `ANIMAL_RULES.version` doesn't change: what a save holds is the same.
   - **No error boundary.** React reports a caught render error with `console.error`, which the E2E's "no console errors" check counts. A boundary that restarts the game could also loop on a bug in a fresh game.
5. **A17: a second tab can't erase finds or bests.** Every write of `clue-match:journal:v1` and `clue-match:records:v1` merges into what storage holds at that moment. M7's end state is the base: no sightings, `recordSolve(journal, species, moves, at, sharp)`, `useJournal()` with no argument, and `mergeServerJournal(journal, entries)`.
   - **`mergeJournals(local, other)`**, new in `src/clueGame/journal.ts`, is the one merge rule. It takes every animal in either journal. For an animal in both, it keeps the larger `timesSolved`, the lower `bestMoves`, the earlier `firstSolvedAt` and the later `lastSolvedAt`. It takes `local`'s `commonName`, and `local`'s `className` or else `other`'s. It keeps the larger `sharpEyes`, and leaves the field out when neither journal has one. This is the rule `mergeServerJournal` has (owner: keep it). `mergeServerJournal` becomes the server entries turned into journal entries, folded in with `mergeJournals`. M11 can then delete it, and the journal transfer to come reuses `mergeJournals`. M7's unit case for `mergeServerJournal` passes unchanged.
   - **A find:** the journal read from storage now (`parseJournal`), merged with the tab's copy by `mergeJournals`, then the find recorded once (`recordSolve`). A find another tab saved is kept, and the same animal found in both tabs counts twice.
   - **The records:** each best is the largest of storage's (`parseRecords`), the tab's and the session's.
   - **The signed-in merge** in `useJournal` (until M11 removes it) folds the server's solves into the stored journal merged with the tab's copy.
   - These are pure functions in `journal.ts` (`saveSolve(stored, tab, species, moves, at, sharp)` and `saveRecords(stored, tab, session)`). `useJournal` only reads storage, calls them, writes, and sets its state to what it wrote, so the tab shows the other tab's finds after its own next save. The read and the write happen once per save, outside a React state-updater function, which React may run twice.
   - Storage that can't be read means the tab's copy alone, and storage that can't be written means play goes on: both as today.
   - **No `storage` event listener** (the owner asked for the merge at save time). A tab shows another tab's finds after its own next save or a reload.
   - The keys keep their names, and `parseJournal`, `parseWords` and `parseRecords` don't change (K2). M7's old-journal fixture case and its E2E fixture check still pass.
   - `clue-match:words:v1` (`useWordsLearned.ts`) has the same one-tab pattern. It isn't in A17: a note in the plan only.
6. **S11: `docs/CLUE_MATCH.md` says what is true**, each fix a clause or a line, read against the code it describes. At `af4b0453`, M6 had already fixed the saved-rounds lines and the diagram. Re-read each line on the fresh `origin/main`, and skip one an earlier mission made true:
   - "The board only reports matches (`gems-matched`, …)": it says the board also reports each settled move, taps and holds on an animal's tile, nudges, animals that walk off and what to announce, the events typed in `src/game/EventBus.ts` (read that file's map on the fresh `origin/main`, since M8 removes `clue-board-shuffled`), and React owns the rules and the state.
   - "or hold any answer cell to highlight it purple (its column's gem glows; the rules never read it)": a hidden cell of an animal not ruled out can be held, and it lights that color's gems next to that animal's card; holding the question's own gem lights all of its color. Read `EvidenceGrid.tsx`'s header.
   - The Plain words paragraph's "a tap-to-read definition in the field guide and on the reveal card": in the field guide and the Field Journal. The Database paragraph's "simplified ranges as SVG paths for the reveal card": for the journal's range map. M10 rewrote other sentences of the Content section; change only these clauses.
   - The E2E bullet's "(the name sheet shows; lost even if named right)": a right name with no moves left still finds the animal (`nameIt`; the E2E's "out of moves, a right name finds it, with one star").
   - The Data row of the table adds `GET /api/clue-game/ranges?species=<ids>` (the globe's ranges).
   - The Artifact bullet's "`E2E_PLACE`, `E2E_SEED`, `E2E_ROUNDS` change it" names every setting in the header comment of `scripts/e2e.mjs`. The balance line's "(careful, reader, guesser, random and oracle players; …)" names the seven defaults of `arg('players', …)` in `scripts/balance-044.ts`.
   - "The earlier games (041 charges, 043 gems ask questions) are deleted from the code": leave it if `questionMatch.ts` no longer has `newRound`, `chargesEarned` or `DEFAULT_RULES` (M7, M8). Otherwise say which of their rules are still in the code. The table's "`gems.ts` (gem color ↔ category)" is M7's; if it's still there and `src/clueGame/gems.ts` is gone, delete it.
   - The globe bullet's "Animals you've found glow on the globe where you found them": found animals' ranges light up, each with an emoji marker, tinted by group (`Globe.tsx`'s header, `classColor`). The audit didn't list this one.
   - If M7 left "Only continents become sightings: on a fresh device an old solve's country or area adds none (sightings already on a device stay).", delete it: after D14 no journal keeps sightings. It describes sightings, not sign-in.
   - This mission's own changes: the `savedGame.ts` row adds that a save which no longer fits today's code is dropped for a fresh round 1. The E2E's Resume bullet adds the dropped save, and its "Once a run" bullet adds the two-tab check.
   - **Lines about sign-in, accounts and the server journal stay word for word** (owner: M11 corrects them). At `af4b0453` they are:
     - "The Field Journal lives on the device; when signed in, it also pulls the player's solves saved before 2026-10-01."
     - "`GET /api/clue-game/journal` (a signed-in player's solves)";
     - the Database paragraph's "`profiles`, `clue_match_solves`,", its `clue_match_solves` sentence ("has a row per round finished before 2026-10-01 …") and "The journal counts only `solved` rows.";
     - the `07_solve_stats.sql` row.
   - Also out of this mission: the pointers to `docs/ANIMAL_BOARD_PAPER.md` (S10, M7's), and the Content section's step list and its countries sentence (M10's; if M10 hasn't merged, leave them word for word).

### Why

The screens still carry CSS, a caption, a cache fallback and options that nothing uses, and every reader has to work out which are real. The game serves an image and a note to the world that nothing loads. A phone downloads about 300 KB of font to draw digits and a few words. Two ways exist to lose a player's data: a deploy can leave a tab's saved game stuck, and a second tab can silently overwrite a find. Since October a find has no other copy. The guide every agent is sent to still says a right name can lose and that the board only reports matches.

### Scope

In:
- `src/styles/globals.css` (D22's rules; the two Open Runde `@font-face` rules and their comment)
- `src/components/clueGame/RangeMap.tsx`, `JournalSheet.tsx` (the `caption` prop only), `FactsWithSources.tsx`, `SpeciesPortrait.tsx`, `useJournal.ts`
- `src/components/animalBoard/AnimalCard.tsx`, `AnimalGame.tsx` (the `Pencil` type), `EvidenceGrid.tsx` (`HOLD_MS`, the `is-fresh` class), `useAnimalSession.ts`, `savedGame.ts`
- `src/game/BoardController.ts` and `src/game/constants.ts` (`HOLD_MS`)
- `src/clueGame/journal.ts` (`mergeJournals`, `saveSolve`, `saveRecords`, `mergeServerJournal`'s body)
- `public/branding/critterconnect-oauth-logo.png` and `.prompt.txt` (deleted); `public/fonts/open-runde/OpenRunde-Regular.woff2` and `OpenRunde-Bold.woff2` (cut)
- `tests/clueGame/journal.test.ts`; the new `tests/animalBoard/savedGame.test.ts`
- `scripts/e2e.mjs` (the new checks, and a second page for A17)
- `docs/CLUE_MATCH.md`

Out:
- **Sign-in:** Clerk, `/login`, `/api/clue-game/journal` and its route, and the sign-in lines of `docs/CLUE_MATCH.md` (Goal 6). Mission M11 removes them. `mergeServerJournal` changes only as Goal 5 says.
- **K2:** the three `clue-match:*` keys and their parsers. **K5:** the `OFL.txt` files and every other font file.
- The three fallbacks A16 lists (`highlight ?? []` in `animalSession.ts`'s `restore`, `state.headings?.[id]` and `state.fewestIn ?? …` in `animalBoard.ts`). `walkers` is also called with the board scene's own `headings`, and the rules files don't change in this mission. Leave all three as they are.
- `src/clueGame/animalBoard.ts`, `animalSession.ts` and `ANIMAL_RULES`; the long-press time and every other timing a player sees.
- The journal's map credit line and everything else M10 changed (`JournalSheet.tsx`'s credit, the Content section of `docs/CLUE_MATCH.md`, `Terms.tsx`).
- The website's own files (`src/site/`, `scripts/site.mjs`), the Nunito and Patrick Hand fonts, `docs/brand/`, and `gui/`.
- The words list's one-tab pattern (Goal 5), a `storage` listener and an error boundary.
- **The database and content:** no table, view, grant or row, live or dev copy, and no content build.
- Clerk's and Google's dashboards, `plans/` (records), and every other audit finding.

### Definition of done

- **Baseline, before any change.** Everything under `/srv/critter-ai/agent-state/missions/screens-cleanup/`.
  - **M7 has merged.** If `src/clueGame/journal.ts` on a fresh `origin/main` still has `Sighting` or `mergeServerJournal` still takes `placeFor`, stop and add a handoff item: A17 builds on M7.
  - **Fresh greps.** Re-run the greps under "Roots checked" and "Prove it's safe first" in D22, D23, O1, A16 and A17, and record their output in the plan. A new reader of a name this mission deletes stops that part; note it.
  - **Fonts.** Save `sha256sum` and `wc -c` of every file under `public/fonts/` to `fonts-before.txt`, and copy the two original Open Runde files to `fonts-original/`.
  - **Tests.** Record `npm test`'s pass count.
  - **Baseline E2E** in the dev-copy block below: copy its artifact to `…/screens-cleanup/baseline-e2e/`, and record its check count. Its screenshots are the "before" for O1.
  - **Website.** Run `npm run site:build`, then `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:site` with `npm run site:serve` running (the script's header). Record the result.
- **The new checks fail first.** Write them before the code they guard, and see them fail on it:
  - **Unit cases, in `tests/clueGame/journal.test.ts`.** For `mergeJournals`: an animal on one side only, one on both (each field of the rule, `sharpEyes` included), and both empty. For `saveSolve`: the stored journal holds another tab's find, the tab's copy is stale, and a new find of a third animal keeps all of them. The same animal in both tabs counts both finds. For `saveRecords`: a higher stored best is kept against a lower tab and session. These can't run before the functions exist, so record them failing, then passing.
  - **Unit cases, in `tests/animalBoard/savedGame.test.ts`.** For `fitsShape`, a fresh session fits itself. It doesn't fit when a key is removed from the session, the round, the rules or the trail, or when a value's kind changes. It still fits with an extra key, with `null` against an object, and with an empty fresh array against a full one.
  - **E2E, A16:** right after the check "a save whose witness notes no longer fit the content deals a fresh round, not a resume", two new checks, one per case:
    - Take the current save, delete `session.trail` (the guard passes, then the screens read it), and reload.
    - Take the current save, delete `session.round.orders` (`roundStillFits` throws), and reload.

    Each case also sets the save's `session.score` to 7 before the reload, because the save at that point is an unplayed round 1, and a resume of it would otherwise look like a fresh deal. Each check passes when: round 1 is dealt, with `movesUsed` 0, `score` 0 and the save's seed; the save in `sessionStorage` is round 1's and has the deleted field again; and `report.consoleErrors` gained nothing during the case.
  - **E2E, A17:** a new check on its own page loads, after the other checks and before "no console errors":
    - Open a second page with `openPage(browser)`. Both pages share the browser's `localStorage`, and each has its own `sessionStorage`. The second page gets the first's setup (viewport, touch, the how-to and slide-hint keys, the `window.__*` helpers), and its console errors and exceptions go into `report.consoleErrors` too.
    - Before either page loads: set `clue-match:journal:v1` to one real pool animal X, and `clue-match:records:v1` to `{"bestScore":10,"bestStreak":1}`.
    - Open page A at `/explore/?seed=<a>` and wait for its board. Then open page B at `/explore/?seed=<b>` (seeds whose round-1 mysteries differ and aren't X; record them), and name B's mystery right.
    - From page B, set the records to `{"bestScore":9999,"bestStreak":99}`, as a best set in another tab.
    - Then name A's mystery right.
    - It passes when storage holds X unchanged, A's and B's animals once each, and records of 9999 and 99; when A's Field Journal counts all three; and when neither page logged a console error.
    - If a page in the background stalls, bring it to the front (`Page.bringToFront`) before driving it.
  - On today's code each new E2E check fails as a check, and the run still reaches its end (a timeout inside a new check is caught and fails that check). Run it once in the dev-copy block, with only the checks changed, and save the artifact as `…/screens-cleanup/checks-fail-first/`. Record in the plan which checks failed, and how many `check()` calls the new checks add.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint` and `npm test` exit 0, and `npm test` passes the baseline's count plus the new cases. If typecheck fails on stale generated types, run `rm -rf .next .next-e2e .test-dist`.
  - `npm run site:build` and `npm run e2e:site` (as in the baseline) pass.
  - `ANIMAL_RULES.version` and `SavedGame`'s `v: 1` are unchanged, and `git diff origin/main -- src/clueGame/animalBoard.ts src/clueGame/animalSession.ts` is empty.
  - **K2:** in `journal.ts`, the three key strings and the bodies of `parseJournal`, `parseWords` and `parseRecords` are character for character as on `origin/main`.
  - **K5 and the fonts:** `git diff --stat origin/main -- public/fonts` lists only the two Open Runde `.woff2` files; `sha256sum` of every other file there matches `fonts-before.txt`.
  - **O1's glyph proof.** Write a throwaway page outside the repo. It loads the original and the cut Regular and Bold files under four family names, and draws every character of the list at the sizes `font-data` uses (`text-xs`, `text-s`, `text-m`), with `tabular-nums`, in light and dark. Screenshot it in headless Chrome (`~/.local/bin/chrome-nosandbox`). Each original's screenshot is pixel-identical to its cut file's. Save the page, the screenshots and the comparison to `…/screens-cleanup/glyphs/`.
  - **O1's screens.** Side by side, the baseline's and the final E2E's `01-globe.png`, `02-board.png`, `02c-notes.png`, `02d-field-guide.png`, `04-round-1-end.png`, `05-journal.png` and `08-pencil-bonus-end.png` look the same in every `font-data` text. Record each pair in the plan.
  - This prints nothing:
    ```
    git grep -n -E 'roster-cross|cm-shake|cm-pop-in|cm-countdown|unrouted 043|Map: IUCN Red List|Range about|caption=\{|before citations shipped|itemClassName|oauth-logo|size=\{size\}|size = 120|width = 120' -- . ':!plans' ':!docs/research' ':!docs/playtests'
    ```
    `plans/`, `docs/research` and `docs/playtests` are records. The journal's own credit, "Range maps: IUCN Red List…", doesn't match `Map: IUCN Red List` (the match is case-sensitive). Also: `git grep -n 'const HOLD_MS' -- .` prints one line, in `src/game/constants.ts`; `git grep -n -E 'type Pencil\b' -- src` prints one line, in `src/clueGame/animalBoard.ts`; `git ls-files public/branding` lists only the two wordmark SVGs; `git grep -c cm-range-ping -- src` still finds `RangeMap.tsx` and `globals.css`.
  - **S11:** the plan lists each corrected sentence beside the code line it was read against. `git diff origin/main -- docs/CLUE_MATCH.md` leaves the sign-in lines of Goal 6 and the Content section's step list unchanged.
- **`npm run e2e:fresh` passes** with the baseline's check count plus the new checks, **against the dev copy `phaser_june_dev`, never `.env.local`, with no content build:**
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/screens-cleanup/final-e2e/`. Look at `05-journal.png` and `11-journal-sources-open.png`: the range map shows, with no caption, and the credit line is unchanged.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy or smoke test is reverted and redeployed).
  - Just before the merge, record from the live sites, in the plan:
    - `version.txt`;
    - the status codes of `/`, `/explore/` and `/api/clue-game/journal/` on `play.critterconnect.org`, and of `/` on `critterconnect.org`;
    - the lengths of `species`, `clues`, `facts` and `citations` in `/api/clue-game/pool/`, and the `key` list of `/api/places/`;
    - `curl -sI` (status, `content-type`, `content-length`) of `/fonts/open-runde/OpenRunde-Regular.woff2`, `/fonts/open-runde/OpenRunde-Bold.woff2`, `/fonts/open-runde/OFL.txt` and `/fonts/nunito/nunito-latin-400-normal.woff2` on both hosts;
    - the status codes of `/branding/critterconnect-oauth-logo.png`, `/branding/critterconnect-oauth-logo.prompt.txt`, `/branding/critterconnect-logo.svg` and `/branding/critterconnect-logo-light.svg` on `play.`.
  - After the deploy:
    - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
    - The pages, the API status codes, the pool's four lengths and the places keys equal the record.
    - On both hosts the two Open Runde files answer 200 with the same `content-type`, and the `sha256sum` of each download equals that of the merge commit's file (`git show <merge>:<path> | sha256sum`). `OFL.txt` and the Nunito file have the record's status and `content-length`.
    - The OAuth logo and its note answer 404, and the two wordmarks still answer 200.
    - A request that fails or times out is retried up to three times, 10 seconds apart, before it counts.
- **The Summary** lists the deleted files, CSS rules and props; the font's character list with the two sizes before and after and fontTools' version; the glyph proof and the screen comparison; the A16 and A17 checks (failing first, then passing), the test counts and the E2E check counts; the smoke results. It says that `ANIMAL_RULES.version` stayed the same and why, that no production content build is needed, and which `docs/CLUE_MATCH.md` lines were left for M11.

### Decision rules

- Delete only what Goal names. Anything else that looks dead is a note in the plan, not an edit.
- **Earlier missions moved the code.** M7 rewrote `useAnimalSession.ts`, `journal.ts`, `useJournal.ts` and `AnimalGame.tsx`; M8 may have changed `EvidenceGrid.tsx` and `src/game/constants.ts`; M10 changed `JournalSheet.tsx` and `docs/CLUE_MATCH.md`. Find each site by the text quoted here. If a quoted text is gone, record where it went, and don't edit a near match.
- **A new check that passes on today's code is a wrong check:** fix the check, not the code. Never weaken an existing check. A test that pinned only deleted code goes with it; any other failing test is a bug in the change.
- **A16:** if `fitsShape` would drop a save written by today's code (the existing resume checks fail), the rule is too strict: fix it. Never loosen it to arrays' items or remove the comparison.
- **A17:** if M7's `mergeServerJournal` case fails after the refactor, the rule changed: fix `mergeJournals`.
- **O1:** if the glyph proof isn't pixel-identical, find the cause (a dropped feature, table or hinting) before going on. If no cut can be made identical, keep the original files and their `@font-face` rules, ship the rest, and add a handoff item.
- **Flaky E2E steps:** audit A10 records timing checks that fail by themselves (M8 works on them). If a local E2E fails only outside this mission's new checks, rerun it once. Never waive a new check.
- **Budget:** the VPS has 2 cores and an E2E takes about 12 minutes. At most 3 E2E runs per session, one at a time, with nothing else heavy running.
- If the release rebase changes `scripts/e2e.mjs`, `src/components/`, `src/clueGame/journal.ts` or `public/fonts/`, rerun the final E2E and the O1 proof on the new base.

### Notes

- **Owner answers (Danby, 2026-11-14), which override the audit.**
  - Q13: Clerk's production instance has no uploaded logo, nothing in Clerk depends on `public/branding/`, there are no webhooks, and the redirect allowlist is empty. D23 goes ahead.
  - Sign-in goes in M11, after this mission, so S11's lines about sign-in, accounts and the server journal stay (Goal 6 lists them).
  - A17: the journal and the bests merge into storage at save time, with `mergeServerJournal`'s rule. A later mission adds a no-account journal transfer by QR code or link that reuses it.
  - A16: drop the save and start a new game, proved by a new E2E check written first.
  - O1: cut the data font to the glyphs the game draws with it (list from the source first). The board, sheets and round-end card must look the same in E2E screenshots, and `npm run e2e:site` must pass. Keep each font's `OFL.txt` (K5).
  - K2's keys and readers stay. The game isn't released to the public yet.
- **What merged first.** M2, M6 (server cleanup), M1 (Next.js) and M3 (agent files; `origin/main` was `af4b0453` when this was written), then M4 (toolchain: it deletes `npm run clean`), M7 (rules cleanup), M8 (board and E2E), M10 (content pipeline) and M5 (deploy and CI). M10's brief says M9 merges before it; the queue runs M10 first, so expect its journal credit line and its `docs/CLUE_MATCH.md` edits. Re-read every site on a fresh `origin/main`.
- **Checked at `af4b0453`:**
  - The only `<RangeMap` passes `caption={false}`.
  - `SuspectPhoto`'s only caller is `AnimalCard`.
  - `type Pencil` is exported at `animalBoard.ts:428`.
  - `HOLD_MS` is in `BoardController.ts` (exported, imported nowhere) and `EvidenceGrid.tsx`.
  - The canvas never draws in Open Runde (the board uses Patrick Hand, Arial and the emoji font), and the website draws no `font-data` text, though its stylesheet imports `globals.css` and its build copies `public/fonts` whole. Neither host serves `/fonts/` with an immutable cache.
  - The deploy rebuilds both the app and the Caddy (website) image.
  - fontTools isn't installed on the VPS, and `pip` isn't either; `uvx` is (`/usr/local/bin/uvx`).
  - The E2E's console listener filters by the first page's `sessionId`; `openPage` (`scripts/cdp.mjs`) opens another tab in the same profile.
  - No `next.config.mjs` setting turns on React's strict mode.
- **Why no `storage` listener or error boundary:** the owner asked for the merge at save time and for dropping a save. Each extra is a later choice for him (named in the Summary).
- **Chrome for the E2E:** the shared wrapper `~/.local/bin/chrome-nosandbox` (named in `~/AGENTS.md`). Don't write a copy.
- **Tests first** is the repo's rule (`AGENTS.md`, Testing). The pre-push hook runs typecheck and lint.
- **Size:** about 15 sessions (the audit's 14, plus the second-page check and the glyph proof).

### Review corrections (2026-11-14): these override any text above that conflicts

**Must:**
- **`SuspectPhoto` keeps its `size` prop.** `AnimalSheets.tsx` passes `size={330}` (field guide, round-end card) and `size={120}`, so `AnimalCard` is not its only caller. D22 removes `size` from `AnimalCard`'s call only, which becomes `<SuspectPhoto species={species} />`. Take `size = 120` out of the final grep, and correct the Notes line that says `AnimalCard` is the only caller.
- **A16 never drops a save because of the network.** In `useAnimalSession.ts`, one `try` wraps both the pool fetch and the resume guard. Restructure so that a failed pool load, or "Not enough animals", never clears the save and never warns: it keeps today's message. Only the guard, `fitsShape` and the restore sit inside the `try` whose `catch` drops the save. Round 1 is dealt once, before the guard (`deal` advances `rng.current`), and a dropped save plays that same deal.

**Should:**
- **O1's proof must show the font really loaded.**
  - Before the screenshot, `document.fonts.check` is true for all four font families the test page uses.
  - The page has one control row in the fallback font stack, which must differ between renders of a deliberately wrong font, so a blank or fallback render can't pass.
  - Compare decoded pixels with `sharp` (in `node_modules`). The VPS has no ImageMagick or PIL.
- **O1 facts:**
  - The reviewer's trial cut came to 6,892 and 6,848 bytes.
  - U+00D7 and U+2212 are both present in Open Runde, so drop the "no glyph" conditional.
  - Open Runde has no `tnum` feature: keep `'*'` in the layout features, but drop the "keeps `tnum`" reason.
- **A17's E2E chooses seeds at run time.** Pick the animal from the pool, and probe seeds the way the AmphibiaWeb probe in `scripts/e2e.mjs` does. Never hard-code seeds: the mysteries depend on the content, which changes.
- **Choices that were left open:**
  - In `saveSolve` the call is `mergeJournals(tab, stored)`, where `tab` is the tab's own journal.
  - A save for another continent, another rules version, or one where `roundStillFits` is false is passed over silently as today: it is neither cleared nor warned about.
- **Grep nit:** `git grep -w font-data -- src` also matches `--font-data` in `globals.css` (21 lines in 7 files). Count the uses in components only.

## Stages

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

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

## Summary
