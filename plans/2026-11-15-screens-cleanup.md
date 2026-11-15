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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Base: `origin/main` `9f72f360` (PR #79 merge), branch at `5850bcbd`. State folder `/srv/critter-ai/agent-state/missions/screens-cleanup/`. No migration step: the repo has no migration history (`db/schema.sql` baseline) and this mission changes no DB.

- **M7 merged:** `src/clueGame/journal.ts` has no `Sighting`; `mergeServerJournal(journal: Journal, entries: readonly ServerJournalEntry[])` (line 65), no `placeFor`. Goes ahead.
- **Gates:** `npm ci` ok; `npm run typecheck` 0; `npm run lint` 0; `npm test` **64/64** pass.
- **Baseline E2E** (dev-copy block, guard passed): **1579/1579** checks, seed 7 (rounds: Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found). Artifact `…/screens-cleanup/baseline-e2e/` (O1 "before" screenshots).
- **Website:** `npm run site:build` ok; `e2e:site` against `site:serve` **444/444**, 20 screenshots.
- **Fonts:** `fonts-before.txt` (sha256 + bytes, all 12 files under `public/fonts/`); originals in `fonts-original/` (Regular 154,604 B `da42a035…`, Bold 162,468 B `9a64eabe…`). Full originals are in git at `9f72f360`.
- **Fresh greps** (full output: `…/screens-cleanup/baseline-greps.txt`). No new reader of a name this mission deletes.
  - D22: `roster-cross|cm-shake|cm-pop-in|cm-countdown` outside `globals.css` (and `plans/`): 0 hits. `cm-[a-z]` in src/scripts/tests/.claude: only `RangeMap.tsx:43` (`cm-range-ping`) and `globals.css` 469–491, 654. Reduced-motion list at `globals.css:654` holds `.cm-shake, .cm-pop-in, .cm-range-ping, .roster-cross`.
  - D22 callers (`<AnimalCard|TrapCard|FactsWithSources|SpeciesPortrait|PhotoCredit|RangeMap|SuspectPhoto`): 15 lines. `AnimalCard.tsx:28` passes `size={size}` to `SuspectPhoto`; `AnimalSheets.tsx:212,659` pass `size={330}`, `:414` `size={120}` (so `SuspectPhoto` keeps `size`, per Review corrections). Both `<AnimalCard` calls (`EvidenceGrid.tsx:262,393`) pass no `size`; both `<TrapCard />` (`EvidenceGrid.tsx:193`, `AnimalSheets.tsx:765`) no children; `<FactsWithSources` at `AnimalSheets.tsx:716`, `JournalSheet.tsx:71`; `<SpeciesPortrait` only `JournalSheet.tsx:51` (className, no width); `<PhotoCredit` at `AnimalSheets.tsx:215,660`, `JournalSheet.tsx:77` (no className); only `<RangeMap` `JournalSheet.tsx:69` with `caption={false}`.
  - D22 other sites: fallback comment at `useAnimalSession.ts:89`; `RangeMap.tsx:11` `caption = true`, `:49` `{range && caption && (`; `FactsWithSources.tsx:16,21,42` `itemClassName`; `type Pencil` at `animalBoard.ts:428` (export) and `AnimalGame.tsx:39`. `HOLD_MS -w` (excl. plans): 5 lines, `EvidenceGrid.tsx:49,127`, `BoardController.ts:56,75,138` (same as audit).
  - D23: `oauth-logo` (excl. plans) 0 hits; `deploy/check.sh` names no branding; `git ls-files public/branding`: two wordmark SVGs + the PNG and `.prompt.txt`; `/branding/` in code only `Wordmark.tsx:7,9` and `scripts/site.mjs:91` (wordmarks + favicon).
  - O1: `font-data` in components: 20 lines in 6 files (`AnimalGame.tsx` 187/457/459, `AnimalSheets.tsx` 122/378/422/455/514/554/644/651/714/752/767/808, `EvidenceGrid.tsx` 319/417, `FactsWithSources.tsx:64`, `JournalSheet.tsx:56`, `PlaceList.tsx:35`), plus `--font-data` at `globals.css:293`; `src/site` 0. `OpenRunde` named only at `globals.css:56,63`. Character list is derived in Architecture.
  - A16: `cc:explore:game` only in `savedGame.ts:7` and `scripts/e2e.mjs`; `clearSavedGame` only `GlobeScreen.tsx:13,26`; no `ErrorBoundary|componentDidCatch|getDerivedStateFromError` in src.
  - A17: `JOURNAL_STORAGE_KEY|RECORDS_STORAGE_KEY` read/written only in `useJournal.ts` (30, 31, 50, 63, 68); `useJournal` callers `AnimalGame.tsx:198`, `GlobeScreen.tsx:22`; `clue-match:journal` in scripts only the E2E (one tab); no `storage`/`StorageEvent`/`BroadcastChannel` listener anywhere.

## Architecture

I read every site on `agent/screens-cleanup`, which is `origin/main` `9f72f360` (fetched 2026-11-15) plus this plan. All quotes come from that tree. Ranked by impact: A17 (finds and bests lost without a sign), A16 (a deploy can strand a tab), O1 (about 303 KB on every first visit), S11 (the guide agents start from is wrong), then D22 and D23 (dead code and files, nothing a player sees).

### Where the brief is wrong or has moved

1. The Notes line "`SuspectPhoto`'s only caller is `AnimalCard`" is wrong; the Review corrections already say so. `AnimalSheets.tsx:212,659` pass `size={330}` and `:414` passes `size={120}`. The Verification grep must not contain `size = 120`.
2. `font-data` also draws at `text-xxs` (10 px): `FactsWithSources.tsx:64` `{i + 1}.` sits inside `<ol className="… text-xxs …">` (`:57`). So the glyph proof covers 10, 12, 14 and 16 px.
3. In cc, `font-medium` is weight 700 (`--weight-ui-medium: 700`, `globals.css:185`) and `font-heavy` is 800. So all medium and heavy `font-data` text draws from the Bold file, and the Regular file draws only weight-400 text. The playing screen uses both files (`AnimalGame.tsx:457` regular, `:459` heavy).
4. A16 case 1 (`session.trail` deleted) does not crash the playing screen today. `AnimalGame.tsx:422-457` reads `trail` only behind `trail ?` / `trail &&`. The save resumes without a word (no hearts, score 7). It throws only later: at the round-end card (`AnimalSheets.tsx:728` `trail.over`) or in `nextRound` (`useAnimalSession.ts:272` `current.trail.over`). The new check still fails on today's code (score 7 ≠ 0, and the save still lacks `trail`), so it is a valid fail-first check.
5. A16 case 2 (`session.round.orders` deleted) today: `roundStillFits` throws inside the load's one `try`. The catch logs `console.error('[AnimalBoard] Failed to load the animals:', …)` and shows "Could not load the animals…". In the fail-first run this also fails the final "no console errors" check. That failure is expected.
6. A17's "neither page logged a console error" can't be a check on its own, because it passes on today's code (Decision rule: a new check that passes today is wrong). It is ANDed into the journal check instead.
7. S11: M7 already removed `gems.ts` from the table. `questionMatch.ts` has no `newRound`, `chargesEarned` or `DEFAULT_RULES`, so the "earlier games" line stays. The file has no "Only continents become sightings…" line. `clue-board-shuffled` is gone from `EventBus.ts`.
8. O1 facts, from a trial cut in `/tmp` with fontTools 4.68.0, the brief's command and the list below:
   - Sizes: Regular 6,892 B and Bold 6,848 B (13,740 B together, down from 317,072).
   - Each cut file has 48 glyphs; `'*'` keeps the glyphs other features need.
   - The name table keeps IDs 0–17 ("Copyright 2023 Laurids Kern"). The originals have no licence entry (ID 13) either.
   - The hhea and OS/2 metrics are unchanged.
   - The originals have GSUB `aalt case frac locl ordn zero` and GPOS `kern`, and no `tnum`. The cut's GSUB drops `locl`, because no listed glyph has a local form. This is harmless, and the pixel proof checks it.
   - Both weights have U+00D7 and U+2212.
   - The outlines are CFF, so the hints live in the charstrings, and the subsetter keeps them by default.

### D22 · the screens' leftovers

**Findings** (all confirmed; only line numbers moved). These break KISS (dead code that every reader has to rule out) and DRY (`Pencil`, `HOLD_MS`):
- **CSS.** `globals.css:462` "/* Clue Match (cm-*, roster-cross: the unrouted 043 game, plus the range map's ping) */".
  - Keyframes to delete: `roster-cross-in` 463-467, `cm-shake` 469-475, `cm-pop-in` 476-479, `cm-countdown` 484-487.
  - Rules to delete: `.roster-cross` 468, `.cm-shake` 488, `.cm-pop-in` 489, `.cm-countdown` 490.
  - `cm-range-ping` stays: keyframes 480-483, rule 491.
  - The reduced-motion list at `:654` starts `.cm-shake, .cm-pop-in, .cm-range-ping, .roster-cross, .ev-lit, …`. `.cm-countdown` was never in it.
- **RangeMap.** `RangeMap.tsx:9` `const area = new Intl.NumberFormat(…)`; `:11` `caption = true` / `caption?: boolean`; `:49-54` `{range && caption && (` with its figcaption ("Range about … km²", "Map: IUCN Red List"). The only caller, `JournalSheet.tsx:69`, passes `caption={false}`. The credit at `JournalSheet.tsx:99` ("Range maps: IUCN Red List. Realms: One Earth …", M10's) stays.
- **Cache fallback.** `useAnimalSession.ts:89-91`: the comment, `getJson<Omit<CluePool, 'citations'> & Partial<Pick<CluePool, 'citations'>>>` and `{ ...fetched, citations: fetched.citations ?? {} }`. `poolFromRows` always sets `citations` (`pool.ts:86-110`).
- **Props no caller passes:**
  - `AnimalCard`'s `size` (`AnimalCard.tsx:22-23`, passed on at `:28`).
  - `TrapCard({ children }: { children?: ReactNode })` (`:40-47`), its doc's "`children`: what sits on it (the player's own mark count)", and `type ReactNode` in the `:7` import.
  - `FactsWithSources`'s `itemClassName` (`:16`, `:21`, and `:42` `<li key={fact.key} className={itemClassName}>`).
  - `SpeciesPortrait`'s `width = 120` (`:6`, its doc at `:10-11`, and `:19` `photoAt(photo.url, width)`).
  - `PhotoCredit`'s `className = ''` (`:26`, `:28`).
  - The Baseline greps show that no caller passes any of them.
- **Duplicates and a condition that is always true:**
  - `AnimalGame.tsx:39` `type Pencil = Readonly<Record<string, 'yes' | 'no'>>;` repeats `animalBoard.ts:428`.
  - `HOLD_MS` is declared twice. `EvidenceGrid.tsx:48-49` has it under the comment "…the board's tiles use the same (BoardController)." and uses it at `:127`. `BoardController.ts:55-56` has `export const HOLD_MS = 450;` (nothing imports it), uses it at `:138` and names it in a doc at `:75`.
  - `EvidenceGrid.tsx:437`: inside `guess && !called && fresh &&`, `` className={`ev-missed absolute right-xxs top-px ${fresh ? 'is-fresh' : ''}`} `` always adds `is-fresh`.

**Target.** Exactly the brief's list. The dry-run patch matches it, except that it predates M7.
- **CSS.** Delete the four keyframes and four rules. The comment becomes `/* The range map's ping (RangeMap) */`. The list becomes `.cm-range-ping, .ev-lit, …`.
- **RangeMap.** Delete `area`, the prop and the figcaption; `<figure className="m-0">` and its svg stay. JournalSheet: `<RangeMap speciesId={species.id} name={species.commonName} />`.
- **useAnimalSession.** `const pool = await getJson<CluePool>('/api/clue-game/pool/');`, inside A16's load `try`.
- **AnimalCard.**
  - Drop `size`, so the call is `<SuspectPhoto species={species} />`.
  - `TrapCard()` takes no children, and its doc ends at "…read as a sixth animal)."
  - The import becomes `useState, type CSSProperties`.
  - `SuspectPhoto` keeps `size = 120`.
- **FactsWithSources.** Drop `itemClassName`; the item is `<li key={fact.key}>`.
- **SpeciesPortrait.** Drop `width`; the image uses `photoAt(photo.url, 120)`.
- **PhotoCredit.** Drop `className`; the link's `className` becomes a plain string.
- **AnimalGame.** Delete the local type and import it: `import { sharpEye, type AnimalLogEntry, type Pencil } from '@/clueGame/animalBoard';`.
- **`HOLD_MS`.**
  - Declare it once in `src/game/constants.ts`, after `SWIPE_THRESHOLD`: `/** How long a press on an animal lasts before it is a long press (its field guide), in ms: the board's tiles (BoardController) and the grid's rows (EvidenceGrid). */ export const HOLD_MS = 450;`
  - `BoardController.ts:18` imports it from `./constants`, and `EvidenceGrid.tsx:34` from `@/game/constants`.
  - Both old declarations and EvidenceGrid's comment go.
- **EvidenceGrid `:437`.** `className="ev-missed is-fresh absolute right-xxs top-px"`.

### D23 · the OAuth logo

**Findings.** `git ls-files public/branding` lists the two wordmark SVGs plus `critterconnect-oauth-logo.png` and `.prompt.txt`.
- Nothing outside `plans/` names `oauth-logo`.
- `deploy/check.sh` names no branding file.
- The site build copies only the two wordmarks and the favicon (`scripts/site.mjs:91`).
- The owner's Q13 answer: nothing outside the repo loads the logo.

**Target.** `git rm` the two files. No doc names them, so no doc edit. Release smoke: both answer 404 on `play.`, and the two wordmarks answer 200.

### O1 · the data font

**Findings.** `globals.css:54-67` has two `@font-face` rules for "Open Runde": Regular at 400, Bold at `700 800`, `font-display: swap`, no `unicode-range`. `--font-data` is at `:293`.
- Only `globals.css:56,63` name the files.
- The canvas never draws Open Runde.
- `src/site` has no `font-data`.

**The character list.** I took the 20 `font-data` lines in components (`git grep -n -w font-data -- src ':!src/styles'`). For each one I read the JSX children and traced every value passed in: GameMenu's `stats`, `Stat`'s callers, the pencil-bonus formatter. In the table, R means weight 400 (Regular file) and B means 700/800 (Bold file).

| Site | Text drawn | Size, file | Characters |
|---|---|---|---|
| `AnimalGame.tsx:187` | `Clue {index + 1} of {facts.length}` (the Pause icon is an svg) | xs, R | `C l u e o f`, space, digits |
| `AnimalGame.tsx:457` | `{inTrail}/{rules.trailRounds}` | xs, R | digits, `/` |
| `AnimalGame.tsx:459` | `{round?.movesLeft ?? 0}` ("move(s)" is a sibling span, not font-data) | m, B | digits |
| `AnimalSheets.tsx:122` | guide number `{i + 1}` | xs, R | digits |
| `AnimalSheets.tsx:378` | `{page + 1}/{pages.length}` (inside LABEL: medium, uppercase, but no letters) | xs, B | digits, `/` |
| `AnimalSheets.tsx:422` | `{round.notes.length}` in the Sheet title (`text-m font-medium`) | m, B | digits |
| `AnimalSheets.tsx:455` | `{note.fits} of {count}` | xs, B | digits, space, `o f` |
| `AnimalSheets.tsx:514` | GameMenu `stats` values from `AnimalGame.tsx:519`: `${inTrail} of ${trailRounds}`, `trailNo`, `score` | xs, B | digits, space, `o f` |
| `AnimalSheets.tsx:554` | `{round.suspects.indexOf(id) + 1}` (its button is `font-medium`) | s, B | digits |
| `AnimalSheets.tsx:644` | `+{end.points}`; points are never below 0, because a name's −50 cap nets a find's 50-point star to 0 (`animalBoard.ts:451-453,532-537`) | m, B | `+`, digits |
| `AnimalSheets.tsx:651` | `{round.movesLeft}/{round.rules.moves}` | m, B | digits, `/` |
| `AnimalSheets.tsx:714` | `{notes.length}` (`normal-case`) | xs, B | digits |
| `AnimalSheets.tsx:752` | `Stat` values: `${called}/${guesses.length}` (`:670`); the pencil bonus as `−N` (U+2212) or `+N` (`:671`); `${trail.finds}/${trail.rounds}` (`:735`); `session.score` (`:736`) | m, B | digits, `/ + −` |
| `AnimalSheets.tsx:767` | `2` | s, R | digits |
| `AnimalSheets.tsx:808` | how-to step `{i + 1}` | xs, B | digits |
| `EvidenceGrid.tsx:319` | `?` while reviewing, else `${have}/${size}` | xs, B | digits, `/ ?` |
| `EvidenceGrid.tsx:417` | `?`. The cell uses font-data only when there's no guess; a guess's ✓/✗ is `text-m font-regular` | s, R | `?` |
| `FactsWithSources.tsx:64` | `{i + 1}.` | xxs, R | digits, `.` |
| `JournalSheet.tsx:56` | `×{timesSolved}`, then `best {bestMoves} move` plus `s` | xs, R | `× b e s t m o v`, space, digits |
| `PlaceList.tsx:35` | `{speciesIds.length} animals` | xs, R | `a n i m l s`, space, digits |

Some facts that bound the list:
- Every number is `String(n)` of an integer ≥ 0: no locale formatting, and no ASCII `-` (scores, points and moves are never negative).
- No `uppercase` ancestor holds a `font-data` element with letters.

**The union** is 31 characters: space, `+ . / 0-9 ?`, `C a b e f i l m n o s t u v`, `×` (U+00D7) and `−` (U+2212). That is the brief's list from `af4b0453`, unchanged.

The space must stay in for a second reason. CSS Fonts takes the "first available font", whose metrics set a line's height and baseline, to be the first face whose `unicode-range` includes U+0020. Without the space, every `font-data` line box would take the fallback font's metrics.

**List** (one string for `--unicodes=` and both `unicode-range`s): `U+0020,U+002B,U+002E-0039,U+003F,U+0043,U+0061-0062,U+0065-0066,U+0069,U+006C-006F,U+0073-0076,U+00D7,U+2212`

**The cut.**
- Cut each file from `fonts-original/`, which equals `git show 9f72f360:public/fonts/open-runde/<file>`. First check its sha256 against `fonts-before.txt`.
- Command: `uvx --from 'fonttools[woff]' pyftsubset <original> --unicodes='<list>' --layout-features='*' --name-IDs='*' --name-languages='*' --flavor=woff2 --output-file=public/fonts/open-runde/<file>`
- `'*'` keeps `kern` and every other feature's glyphs. The font has no `tnum`, so `tabular-nums` does nothing, today or after.
- Record `uvx --from 'fonttools[woff]' fonttools --version` and both sizes.

**CSS.** Both rules get `unicode-range: <list>;`. A comment above them says three things:
- the two files hold only the characters `font-data` draws, named in words;
- a new character in `font-data` needs both files cut again from the full ones (in git at `9f72f360`, `public/fonts/open-runde/`) with this plan's command;
- both ranges must then be updated.

The comment at `:2-4` stays.

**Glyph proof.** It lives outside the repo, in `/srv/critter-ai/agent-state/missions/screens-cleanup/glyphs/`.
- **The page.** `glyphs.mjs` writes `glyphs.html`, which embeds the four files as `data:font/woff2;base64,` URLs (no server, and no file:// font CORS).
  - Four families: `orig-regular` and `cut-regular` (weight 400), `orig-bold` and `cut-bold` (`700 800`).
  - The two cut families carry `globals.css`'s final `unicode-range`, so a character missing from the range shows up as a difference.
  - The page takes `?face=<family>&theme=light|dark`.
  - It draws a control block in `-apple-system, BlinkMacSystemFont, sans-serif` alone.
  - It then draws the test block in `"<face>", -apple-system, BlinkMacSystemFont, sans-serif`, the `--font-data` stack, so a face that fails to load falls back exactly like the control.
- **What each block holds.**
  - The 31 characters as one run, plus the real strings: `Clue 2 of 4`, `3 of 5`, `12/20`, `?`, `×3`, `best 1 move`, `best 12 moves`, `40 animals`, `+120`, `−24`, `+0`, `1.`, `30/30`.
  - Sizes 10, 12, 14 and 16 px, with line heights 14, 16, 20 and 24.
  - Letter-spacing −0.01em, and −0.04em as in the grid.
  - Weights 400 for Regular, 700 and 800 for Bold.
  - `font-variant-numeric: tabular-nums`.
  - cc's light and dark text and background colors.
  - No text on the page names the face, so whole screenshots can be compared.
- **Rendering.** The harness drives Chrome with `startBrowser`/`openPage` from the worktree's `scripts/cdp.mjs`, imported by absolute path, with `CHROME_PATH=~/.local/bin/chrome-nosandbox`. It renders 390×844 at DPR 2, as the E2E does.
  - Before each screenshot it runs `await document.fonts.ready`.
  - For all four families it then requires `document.fonts.check('16px "<family>"')` to be true **and** each `FontFace` to have `status === 'loaded'`. `check` alone is true for a family that has no face at all.
- **Comparison.** Use `sharp`, loaded from the worktree's `node_modules` with `createRequire` and not added to `package.json`. Compare decoded raw RGBA:
  1. `orig-X-<theme>` against `cut-X-<theme>`, for X in {regular, bold} and both themes: same dimensions and 0 differing pixels (4 pairs).
  2. In every Open Runde render, the test block's crop (`getBoundingClientRect` × DPR) differs from the control block's crop, so a render that fell back can't pass.
  3. A deliberately wrong pair, `orig-regular` against `orig-bold` in the same theme, differs, so the comparison can see a font change.
- **Saved.** The page, the harness, 8 screenshots and `compare.json` (fontTools version, the list, sizes, pixel-diff counts, each family's check and status, the command). If (1) fails, find the cause (a feature, a table or hinting) before going on, as the Decision rule says.

### A16 · a saved game that can't resume

**Findings.** These break fail-fast: a broken save is never dropped.
- `savedGame.ts:27` `return saved?.v === 1 ? saved : null;` is the only check when the save is read.
- `useAnimalSession.ts:47-48` reads `saved` once, then sets `seed = replay ?? saved?.seed ?? random`, so a saved seed that isn't an integer is used as is.
- `useAnimalSession.ts:88-125` wraps everything in one `try`: the fetch, the content, the guard, the restore and the fresh deal. The guard is `:109-110`: `saved.requested === requested && saved.session.round.rules.version === ANIMAL_RULES.version && roundStillFits(book, saved.session.round)`. The `catch` (`:122-125`) only logs and sets "Could not load the animals…".
- So a save whose guard throws strands the tab: every reload reads it again. A save that passes the guard but lacks a field restores and breaks later (item 4 above).
- No code checks the save's shape. `clearSavedGame` has one caller, `GlobeScreen.tsx:26`.

**Target.**

`savedGame.ts` gets one pure query, plus a private helper:
```ts
const kindOf = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);
/** `saved` is an object that holds every key `fresh` holds with a defined value, each of the same JSON kind
 *  (null on either side matches anything; arrays aren't looked inside). */
function holdsKeys(saved: unknown, fresh: object): boolean { … }
/** Whether a saved session has every field today's code writes: the session, its round, the round's rules and the
 *  trail, each held against a fresh round 1's (`book` aside). Catches a field added without a rules version bump
 *  (the grid's row order, 2026-11-04). */
export function fitsShape(saved: unknown, fresh: SavedGame['session']): boolean
// = holdsKeys(saved, fresh) && holdsKeys(saved.round, fresh.round) && holdsKeys(saved.round.rules, fresh.round.rules)
//   && holdsKeys(saved.trail, fresh.trail), reading saved's nested values with optional access
```
- Only those four objects are compared. A generic recursion would also compare `pencil` and `headings`, whose keys are data; a fresh round that ever pre-filled them would make valid saves fail.
- If one of the four is null or missing in the save, the save fails: it can't hold keys.
- Every save today's code writes passes. JSON keeps `null` (`place`, `lostBy`, `named`, `pencilBonus`, `end`), and no rule ever sets a session, round, rules or trail field to `undefined`.

`useAnimalSession.ts` changes in two places.

**The seed.** `const isSeed = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0 && (value as number) <= 0xffff_ffff;`. It replaces `urlSeed`'s inline test, and the seed becomes `useState(() => replay ?? (isSeed(saved?.seed) ? saved.seed : null) ?? <random as today>)`.

**The load effect.** Two `try` blocks, so the network can never drop a save:
```ts
let data: Content, first: Dealt;
try {                                   // the network and the content; never touches the save
  const pool = await getJson<CluePool>('/api/clue-game/pool/');
  …animals, the cancelled check, continent, ids, book, sets: unchanged…
  if (sets.size === 0) { setLoadError('Not enough animals that can be told apart yet.'); return; }
  data = { pool, animals, book, continent, sets };
  first = deal(data, 1, []);            // once, before the guard: deal advances rng.current, and a dropped save plays this deal
} catch (error) {
  console.error('[AnimalBoard] Failed to load the animals:', error);
  if (!cancelled) setLoadError('Could not load the animals. Check the connection and reload.');
  return;
}
setContent(data);
const load = { type: 'load' as const, book: data.book, ...first, trail: newTrail(ANIMAL_RULES) };
if (saved) {
  try {                                 // only the guard, the shape check and the restore
    if (saved.requested === requested && saved.session.round.rules.version === ANIMAL_RULES.version && roundStillFits(data.book, saved.session.round)) {
      const { book: _book, ...fresh } = animalSessionReducer(null, load)!;
      if (!fitsShape(saved.session, fresh)) throw new Error("a field today's code writes is missing");
      …today's restore, unchanged: rng.current reset, setBoard, setRowOrder, setRecordedRound, dispatch restore with data.book…
      return;
    }
  } catch (error) {
    clearSavedGame();
    console.warn('[AnimalBoard] Dropped a saved game that no longer fits; a new game starts:', error);
  }
}
dispatch(load);
```
- The fresh session comes from the pure reducer, `animalSessionReducer(null, load)`, which is an existing interface. Its shape is today's by construction, and the `load` object literal isn't written twice.
- `deal` stays in the load `try`. If it throws ("No clue deck…"), the player sees the load error, as today.
- A save from another continent or rules version, or one where `roundStillFits` is false, is passed over without a word and not cleared, as today; the new game's save replaces it.
- A drop clears the save at once, warns once and plays `first`. A failed pool load and "Not enough animals" never reach the save.
- The restore is setters and a dispatch, which don't throw, and it runs after both checks. So a drop never follows half a restore (a reset rng or a set board).
- `SavedGame`'s `v: 1`, `ANIMAL_RULES.version`, `animalBoard.ts` and `animalSession.ts` are unchanged. No error boundary.

**Fail-first E2E.** In `scripts/e2e.mjs`, right after `:2233`, "a save whose witness notes no longer fit…":
- Read the save once into `base`: the unplayed round 1 the stale-save check just dealt. Both cases start from `base`, so on today's code the second case doesn't inherit the first one's broken save.
- **Setup per case.** The two cases are: delete `session.trail`; delete `session.round.orders`. For each one:
  - Write `base` back with `session.score = 7` and that field deleted.
  - Note `report.consoleErrors.length`.
  - `Page.reload`.
  - Wait for the board **or** the text "Could not load the animals", so today's case 2 fails without a 60 s timeout.
  - Then give the save up to 10 s to hold the field again.
  - Wrap it all in `try/catch`: an error fails that case's check, with the message as its detail.
- **One check per case**, for example `a save missing session.trail (a field today's code writes) is dropped for a fresh round 1`. It passes when all of these hold:
  - `roundNo` is 1, `movesUsed` 0 and `score` 0;
  - `seed`, `mysteryId` and `suspects` equal `base`'s (the same deal, which proves round 1 was dealt once);
  - the stored save is round 1's, with the field back and `score` 0;
  - no new console error appeared.
- That adds 2 checks. Today case 1 resumes (score 7, and the save lacks `trail`), so it fails. Case 2 shows the load error and logs a console.error, so it fails too.

**Unit tests** go in `tests/animalBoard/savedGame.test.ts`, with the ways it could fail listed in its header first.
- **Building a fresh session.** As `animalBoard.test.ts` does: `contentPool` → `makeBook` → `newAnimalRound` for an Africa set → `animalSessionReducer(null, { type: 'load', … })`. Then strip `book` and round-trip it through JSON.
- **Cases:**
  - The fresh session fits itself.
  - Removing any key of the session, the round, the rules or the trail fails; loop over every key.
  - Changing a value's kind fails (a number to a string, an array to an object).
  - An extra key fits.
  - A saved `end: {…}` against a fresh `null` fits, and a saved `named: null` against a fresh object fits.
  - A saved `history: [1,2,3]` against a fresh `[]` fits.
  - `round: null` fails.

### A17 · two tabs

**Findings.** This is a data-loss bug, plus a DRY gap: the merge rule is written only inside `mergeServerJournal`.
- `useJournal.ts:28-35` reads both keys once, on mount.
- `:55-71` `record` writes `recordSolve(previous, …)` and `updateRecords(previous, session)` from the tab's own copy, inside `setJournal`/`setRecords` updater functions, which React may run twice.
- The signed-in merge (`:46-53`) also writes from `previous`.
- So tab A's save overwrites tab B's find and best.
- `journal.ts:65-82` writes the merge rule inline. `updateRecords` (`:132-134`) has one caller.
- Nothing listens for another tab's writes.

**Target, in `journal.ts`.** Pure functions. K2 is untouched: the three keys and the bodies of `parseJournal`, `parseWords` and `parseRecords` stay character for character.
- **`export function mergeJournals(local: Journal, other: Journal): Journal`.** It takes every animal in either journal; an animal found in only one journal is taken as it is. For an animal in both:
  - `timesSolved` is the larger and `bestMoves` the lower.
  - `firstSolvedAt` is the earlier and `lastSolvedAt` the later; ISO strings compare as text, as today.
  - `scientificName` and `commonName` come from `local`.
  - `className` is `local.className ?? other.className`, kept only when truthy.
  - `sharpEyes` is the larger, left out when 0.
  - This is exactly `mergeServerJournal`'s rule today (`:69-78`).
- **`mergeServerJournal`.** Its body becomes `entries.reduce((merged, entry) => mergeJournals(merged, { [entry.scientificName]: toJournalEntry(entry) }), journal)`. `toJournalEntry` keeps the entry's `scientificName, commonName, timesSolved, bestMoves, firstSolvedAt, lastSolvedAt`, plus `className` when truthy. It folds one entry at a time, as today's loop does, so duplicate entries behave the same. M7's case (`journal.test.ts:37-85`) passes unchanged; `deepEqual` ignores key order.
- **`export function saveSolve(stored, tab, species, moves, at, sharp = false): Journal`** returns `recordSolve(mergeJournals(tab, stored), species, moves, at, sharp)`.
- **`export function saveRecords(stored, tab, session): Records`** returns `updateRecords({ bestScore: Math.max(stored.bestScore, tab.bestScore), bestStreak: Math.max(stored.bestStreak, tab.bestStreak) }, session)`. It reuses `updateRecords`.
- The header comment adds that `mergeJournals` is the one merge rule (two tabs, and the server).

**Target, in `useJournal.ts`.** The hook only reads, calls those functions, writes and sets its state:
- `function stored(key: string): string | null` reads `localStorage.getItem` and returns `null` when that throws. `parse*(null)` is empty, so the tab's copy then stands alone. The mount read uses it too, replacing the mount `try`: `setJournal(parseJournal(stored(JOURNAL_STORAGE_KEY)))`, and the same for records. `save` is unchanged: a failed write, and play goes on.
- `journalRef` and `recordsRef` hold the tab's copy, synced by an effect: the `sessionRef` pattern at `useAnimalSession.ts:53-54`. They are read outside any updater.
- **`record`** runs `const journal = saveSolve(parseJournal(stored(JOURNAL_STORAGE_KEY)), journalRef.current, species, moves, new Date().toISOString(), sharp); save(JOURNAL_STORAGE_KEY, journal); setJournal(journal);`, then the same with `saveRecords(parseRecords(stored(RECORDS_STORAGE_KEY)), recordsRef.current, session)`. Its deps stay `[]`.
- **The signed-in effect**, until M11 removes it: `const next = mergeServerJournal(mergeJournals(journalRef.current, parseJournal(stored(JOURNAL_STORAGE_KEY))), saved); save(…); setJournal(next);` with deps `[saved]`. A `journal` dep would loop, because every merge sets a new object.
- No `storage` listener. The callers (`AnimalGame.tsx:198`, `GlobeScreen.tsx:22`) don't change.

**Fail-first E2E.** It goes on its own page loads, after the D14 block (`:2476`) and before "no console errors".
- **Refactor first** (DRY; no behaviour change). Move page A's setup into `async function setUpPage(page)`, called for A and then for B. The setup is: `Page.enable`, `Runtime.enable`, `Network.enable`, the two `Emulation` calls, the CPU throttle and both `addScriptToEvaluateOnNewDocument` sources (`:113`, `:132-291`).
- **The listener** (`:117-131`) takes console errors and exceptions from a `Set` of session ids: A's, plus B's once B is open. Network events stay A's only, because the network check slices A's `requests`.
- **Seed probe**, like the AmphibiaWeb probe (`:2379-2401`).
  - On A, for seed 1 to 40, load `/explore/?seed=<s>&place=<report.place.key>` and read `__cc.clue()` (`mysteryId`, `suspects`), until two seeds `a` and `b` deal different mysteries.
  - X is a suspect of `a`'s round that is neither mystery. Suspects always have clues, so the journal counts X. X's names come from `poolSpecies`.
  - Record `report.twoTabs = { a, b, mysteries, x }`.
- **Setup.** On A: `localStorage.clear()`.
  - Set `clue-match:journal:v1` to X alone: `timesSolved` 2, `bestMoves` 12, fixed past ISO dates, and its `className`.
  - Set `clue-match:records:v1` to `{"bestScore":10,"bestStreak":1}`.
  - Note `report.consoleErrors.length`.
- **Play.**
  - A loads `?seed=a`; wait until the board is ready.
  - Open B with `openPage(browser)`, add its session id to the set, run `setUpPage`, and load `?seed=b`.
  - When B's board is ready, run `Page.bringToFront` on B and `__nameIt(B's mystery)`. Wait for the round-end card, then 1 s.
  - From B: `localStorage.setItem('clue-match:records:v1', '{"bestScore":9999,"bestStreak":99}')`.
  - Run `Page.bringToFront` on A and `__nameIt(A's mystery)`. Wait for the round-end card, then 1 s.
  - Read storage, and run `fieldJournalText()` on A.
  - Close B with `Target.closeTarget`, in a `finally`.
- **Checks** (3, each failing today):
  1. `two tabs: a find in each tab is kept, with the find saved before`. The journal holds exactly X, A's animal and B's. X matches what was set, field for field. A's and B's animals have `timesSolved` 1. Neither page logged a new console error.
  2. `two tabs: a best set in the other tab is kept`. The records are `{ bestScore: 9999, bestStreak: 99 }`.
  3. `two tabs: the first tab's Field Journal shows the other tab's find after its own save`. It reads `3 of …`.
- On today's code, storage ends as `{X, A}`, the records as `{50, 1}`, and A's journal reads "2 of": all three fail.
- New E2E checks in total: 5, so the count goes from 1579 to 1584.

**Unit tests** go in `tests/clueGame/journal.test.ts`, with the ways it could fail listed in a comment first.
- **`mergeJournals`:**
  - an animal on one side only, each side in turn;
  - an animal on both sides, covering each field: count, best, first and last dates, names from `local`, class from `local` or else `other`, `sharpEyes` as the larger either way and absent when neither has one;
  - both journals empty.
- **`saveSolve`:**
  - storage holds another tab's find, the tab's copy is stale, and a third animal is found: all three are kept;
  - the same animal found in both tabs counts 2.
- **`saveRecords`:** storage 300/6, tab 10/1 and session 50/1 give 300/6.
- M7's merge case and the old-journal case stay unchanged.

### S11 · `docs/CLUE_MATCH.md`

Lines are from `9f72f360`. The sign-in lines stay word for word:
- the second sentence of `:10`;
- `:24`'s "`GET /api/clue-game/journal` (a signed-in player's solves)";
- in `:67`: "`profiles`, `clue_match_solves`,", the `clue_match_solves` sentence, and "The journal counts only `solved` rows.";
- the `07_solve_stats.sql` row at `:83`.

| Line | Now | Read against | Change |
|---|---|---|---|
| 7 | "Animals you've found glow on the globe where you found them: green for amphibians and reptiles, amber for mammals." | `Globe.tsx:1-5`; `classColor`, `places.ts:39-51` | Each found animal's range lights up the globe, with an emoji marker, tinted by group (green for amphibians and reptiles, amber for mammals, blue for birds) |
| 19 | the `savedGame.ts` row | A16 | add: a save that no longer fits today's code (a field missing, or its check throws) is dropped for a fresh round 1 |
| 24 | the Data row | `ranges/route.ts:8`, `Globe.tsx:164` | add `GET /api/clue-game/ranges?species=<ids>` (the globe's ranges); the journal clause stays |
| 47 | "The board only reports matches (`gems-matched`, …). React owns everything else." | the board → page events in `EventBus.ts:5-20,35-80`: `current-scene-ready`, `gems-matched`, `clue-board-settled`, `clue-board-tile`, `clue-board-tile-hold`, `clue-board-nudge`, `clue-board-walked`, `clue-board-announce` | The board reports each explode phase's matches (keep the `gems-matched` detail), each settled move, taps and holds on an animal's tile, nudges, animals that walk off and what to announce, all typed in `src/game/EventBus.ts`; React owns the rules and the state. The rest of the paragraph stays |
| 53 | "or hold any answer cell to highlight it purple (its column's gem glows; the rules never read it)" | `EvidenceGrid.tsx:18-20` | or hold a hidden cell of an animal not ruled out to highlight it purple (that color's gems glow next to its card; holding the question's own gem lights all of that color; the rules never read it) |
| 55 | "The earlier games … are deleted from the code" | `questionMatch.ts` has none of the old games' rules | leave it |
| 63 | "in the field guide and on the reveal card" | `GlossaryText` appears only at `AnimalSheets.tsx:266` (the field guide) and `JournalSheet.tsx:72` | "in the field guide and the Field Journal" |
| 67 | "simplified ranges as SVG paths for the reveal card" | the only `<RangeMap` is `JournalSheet.tsx:69` | "for the journal's range map" |
| 89 | "(the name sheet shows; lost even if named right)" | `nameIt`, `animalBoard.ts:436-447`; `e2e.mjs:1961` "out of moves, a right name finds it, with one star (two with a Sharp eye, plan 054)" | "(the name sheet shows; a right name still finds it, with one star)" |
| 90 | the Resume bullet | the new A16 checks | add: a save missing a field today's code writes, or whose check throws, is dropped for a fresh round 1, with no console error |
| 91 | the "Once a run" bullet | the new A17 checks | add: two tabs keep each other's finds and bests |
| 92 | "`E2E_PLACE`, `E2E_SEED`, `E2E_ROUNDS` change it." | `e2e.mjs:14` | name all seven: `E2E_BASE_URL`, `E2E_SEED`, `E2E_RESUME_SEED`, `E2E_ROUNDS`, `E2E_PLACE`, `E2E_CPU_THROTTLE`, `CHROME_PATH` |
| 93 | "(careful, reader, guesser, random and oracle players; …)" | `balance-044.ts:249` | careful, novice, expert, reader, guesser, random and oracle |

Nothing else changes: not the content step list (`:59`), the countries sentence (`:61`) or the paper pointers (`:3`, `:51`).

### Tests-first order

1. **E2E.** The `setUpPage` refactor plus the 2 A16 checks and the 3 A17 checks, with nothing else changed. Run it once in the dev-copy block and save `checks-fail-first/`. Expected: those 5 fail, plus "no console errors" (A16 case 2's console.error), and the other 1578 pass, which proves the refactor changes nothing.
2. **Unit cases** for the journal and `savedGame`: write them, see them fail (the exports don't exist yet) and record that.
3. **Code.**
   - A16: `savedGame.ts` and `useAnimalSession.ts`, including D22's pool line.
   - A17: `journal.ts` and `useJournal.ts`.
   - Then the unit tests and the E2E pass.
4. **D22, D23, O1 and S11** add no checks. They are guarded by typecheck, the existing E2E, the screen comparison and the glyph proof.

### Risks and failure modes

- **`fitsShape` too strict.** An existing resume check fails ("a reload resumes the round…"). The rule only asks for keys that `newAnimalRound` and the `load` reducer always set. If it trips, a rule step wrote `undefined` or changed a kind. Fix the rule as the Decision rule says, and never loosen it to array items.
- **Still unguarded.** Array items, and the save's `board` and `rowOrder`, which go to the Phaser scene and `useRowOrder`. A change there without a version bump can still break a resumed tab. This is a note for the owner; there's no error boundary, by his choice.
- **Not atomic.** Two tabs saving within the same few milliseconds can still lose one find: localStorage has no transactions. A save happens once per round end; accept it.
- **No removal.** The merge can't remove anything: a stale tab adds back finds cleared from storage by hand. No screen removes finds; accept it.
- **Background tabs.** They throttle rAF and timers. So bring each page to the front before driving it, close B in `finally`, and wrap each new check so a timeout fails only that check.
- **O1.** A later `font-data` string with a new character draws it in the fallback font. The comment says what to do, and the E2E doesn't read fonts. A false pass of the glyph proof is closed by the loaded-status check, the control block and the deliberately wrong pair.

### Notes, not edits (Decision rule: delete only what the Goal names)

- `useWordsLearned.ts` caches `words` per page load and writes `[...current, term]`: the same one-tab overwrite, for `clue-match:words:v1`.
- `updateRecords` is left with one caller, `saveRecords`.
- `globals.css:2` says "both OFL-1.1", but there are three fonts (K5's note).
- `EventBus.ts:10` calls `clue-board-announce` "what a keyboard action did", but the scene also announces matches (`ClueBoardScene.ts:109,122`).
- `photoAt(…, 120)` is written in three places: `useAnimalSession.ts:185`, `SuspectPhoto`'s default and `SpeciesPortrait`.
- The `npm test` lines in `docs/CLUE_MATCH.md:94` and `AGENTS.md` ("storage parsing") will now also cover the journal merge and the save's shape.

### Rejected alternatives

- **A generic recursive `fitsShape`.** It would compare maps keyed by data (`pencil`, `headings`), and valid saves would fail once a fresh round pre-filled them.
- **An error boundary that clears the save.** React logs a caught error with `console.error`, and the boundary could loop on a bug in a fresh game (the owner's call).
- **A `storage` listener.** The owner chose the merge at save time, and a listener is one more moving part.
- **Merging inside the `setJournal` updater.** React may run an updater twice, so storage would be read and written twice.
- **Hard-coded seeds for the two-tab check.** The mysteries depend on the content, which changes.
- **A character list per weight.** One list keeps one `unicode-range` and one rule for cutting again.
- **Serving the proof page over HTTP, or loading its fonts from file:// URLs.** Data URLs need no server and avoid the file:// font CORS block.

## Architecture review (Fable)

VERDICT: APPROVE

Checked against the code on `9f72f360`: one `try` around fetch, guard and restore (`useAnimalSession.ts:88-125`); `record` and the signed-in merge write inside state updaters (`useJournal.ts:46-71`); the E2E console listener keys on one `sessionId` (`e2e.mjs:117`). The `mergeJournals` fold equals today's `mergeServerJournal` loop. The two-`try` load keeps the network away from the save. `newAnimalRound`, `newTrail` and the `load` reducer set no `undefined` field, so `fitsShape` passes every save today's code writes. A `?seed=` game still records to the journal (`AnimalGame.tsx:299` isn't gated), so the A17 E2E can use replay seeds. `openPage` returns `targetId` for `Target.closeTarget`.

MUST-FIX: none. The advisor's three conditional points were checked and none holds:
1. A16 E2E cleanup: after the stale-save check (`e2e.mjs:2233`) the next checks read values already captured, then `goto(BASE/)`; the globe clears the save (`GlobeScreen.tsx:26`). A broken save left by the fail-first run can't cascade.
2. O1 uses outside the class: `Open Runde` and `--font-data` appear only in `globals.css:55,62,293`, `gui/themes/cc.md` (docs) and `_app.tsx:9` (a comment). No `var(--font-data)` anywhere.
3. O1 uppercase ancestors: none of the letter sites (`AnimalSheets.tsx:455,514`, `AnimalGame.tsx:187`, `JournalSheet.tsx:56`, `PlaceList.tsx:35`) has an `uppercase` ancestor (`Sheet`'s `detail` slot adds none). The 31-character list holds.

MISSED: none.

SHOULD-CONSIDER:
1. In `record`, set `journalRef.current` and `recordsRef.current` to what was just written, not only through the sync effect. Otherwise two saves before a re-render, with storage unreadable, lose the first.
2. A save with an invalid `seed` that otherwise fits resumes under a new random seed (the brief specifies the seed only on the drop path). Record it as intended under Decisions.
3. `fitsShape` requires `session.highlight`, so a save from before highlights is now dropped, not restored through `restore`'s `highlight ?? []` (which stays, out of scope). That's harmless; say it in the `fitsShape` doc.
4. A17 setup: `localStorage.clear()` is safe, because the init script sets the how-to and slide-hint keys again on every document (`e2e.mjs:138`). Overwriting only the two `clue-match:*` keys is simpler and leaves the theme key alone; prefer it.
5. `npm test` collects `tests/**/*.test.ts` recursively (`scripts/run-tests.mjs`), so `tests/animalBoard/savedGame.test.ts` is picked up. `savedGame.ts` imports types only, so esbuild bundles it.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-15 12:35 UTC · Baseline: M7 merged; greps recorded; fonts snapshot; typecheck/lint 0, unit 64/64, E2E 1579/1579 (dev copy), site 444/444.
- 2026-11-15 12:54 UTC · Architecture: architect wrote findings + target design (D22, D23, O1 31-char cut ~6.9 KB each, A16 two-try load, A17 mergeJournals fold, 5 failing-first E2E checks → 1584). Plan only, no code; no checks needed.
- 2026-11-15 13:10 UTC · Fable review: APPROVE, no MUST-FIX (3 conditional points checked: E2E cleanup, other font uses, uppercase ancestors: none hold); 5 SHOULD-CONSIDER. Plan only; no checks needed.

## Summary
