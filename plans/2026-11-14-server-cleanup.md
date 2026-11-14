---
mission: server-cleanup
project: critter-connect
branch: agent/server-cleanup
status: active
started: 2026-11-14 05:45 UTC
---

# Mission: Server cleanup: the save route, the Drizzle models, the unused places (Critter Connect, audit M6)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M6 of the codebase audit (vault `research/critter-connect/codebase-audit.md`, read findings D2, S3, D13 and S8 and the M6 entry in full). When it's done:

1. **D2:** `POST /api/clue-game/solves` is gone, with the code only it uses: `src/app/api/clue-game/solves/route.ts`, `src/lib/player.ts`, `src/clueGame/solveReport.ts` and `tests/clueGame/solveReport.test.ts`. Every line that says rounds are saved, or that names the route, `solveReport` or `player.ts`, is corrected. That covers the lines D2 lists and these, which the review found:
   - `AGENTS.md:55`, `:57`, `:59` (and `:48` with S3);
   - `.claude/skills/playtest/SKILL.md:16` ("rounds then save with the player's profile");
   - `db/schema.sql:100`, `:102`, `:119` (comments only);
   - `.github/workflows/ci.yml:42` (a comment).

   After the deploy, a POST to `/api/clue-game/solves/` answers 404 or 405.
2. **S3:** `src/db/schema/` (4 files), `drizzle.config.ts`, the `db:introspect` script and the `drizzle-kit` dev dependency are deleted (`npm uninstall drizzle-kit`).
   - `src/db/index.ts` stays the game's one client, without the `schema` argument or the re-export. **`drizzle-orm` stays** (owner, 2026-11-13).
   - `docs/DRIZZLE_ORM_GUIDE.md` is rewritten to say what the code does now, and how to add a model when a future table wants typed inserts.
   - `AGENTS.md:48`, `:57` and `README.md:26` stop describing models.
3. **D13:** `loadPlaces` (`src/lib/places.ts`) returns the continents only (`WHERE kind = 'continent'`).
   - In `src/clueGame/places.ts`, delete `PLACE_KIND_LABELS`, `groupPlaces`, `groupLabel` and `REALM_NAMES`, and fix its header comment, which names a test that doesn't exist.
   - Keep the `PlaceKind` type as it is: `?place=` links and `scripts/content.ts:64` still know the other kinds.
   - In `src/components/globe/PlaceCard.tsx:25`, keep the "Continent" text players see and drop only the `groupLabel` branch.
   - `src/app/api/places/route.ts:6` says continents.
   - `E2E_PLACE` is documented as a continent key (`scripts/e2e.mjs:14`), and the playtest skill's stale "journal's sightings" line is corrected.
4. **S8:** the database docs and comments S8 lists say what is true today. Leave out the port 8000 line: it belongs to S7 (mission M5).
   - S8's runbook check is rewritten to fail unless `current_user` is `critter_dev`, and run once with the dev-copy env (below).
   - `db/schema.sql:13` says pgcrypto is installed but nothing calls it.

### Why

D2 is the one public route that writes into the live database: anyone can call it, it has no rate or size limit, and no game code has called it since 2026-10-01. Removing it closes that, and takes away the only use of the Drizzle models. Those models are wrong about the tables, and `drizzle-kit` brings a critical advisory (`shell-quote` via `gel`) into the production image. The docs it corrects are the ones agents read before they touch the live database.

### Scope

In:
- `src/app/api/` (the solves and places routes)
- `src/lib/` (`player.ts`, `places.ts`)
- `src/db/`, and `src/clueGame/solveReport.ts`, `places.ts`, `animalBoard.ts` and `questionMatch.ts` (comments)
- `src/components/globe/PlaceCard.tsx`, `src/proxy.ts` (comment), `src/pages/_app.tsx` and `src/pages/_document.tsx` (S8)
- `drizzle.config.ts`, the `db:introspect` script, and whatever `npm uninstall drizzle-kit` changes in `package.json` and `package-lock.json`
- `tests/clueGame/`
- `scripts/e2e.mjs` (the doc line); `scripts/db` and `deploy/db/dev-role.sql` (comments only); `docker-compose.yml` (comment); `db/schema.sql` (comments only); `.github/workflows/ci.yml` (comment)
- `docs/CLUE_MATCH.md`, `docs/ANIMAL_BOARD_PAPER.md`, `docs/DATABASE_ACCESS.md`, `docs/DRIZZLE_ORM_GUIDE.md`, `docs/SHAPEFILE_BEST_PRACTICES.md` (S8), `AGENTS.md`, `README.md`, `.claude/skills/playtest/SKILL.md`

Out:
- **The database.** No table, grant, view or row changes, live or dev copy, and no content build anywhere. `clue_match_solves`, `profiles` and the `clue_match_places` view stay until mission M13.
- **Sign-in.** Clerk, `/login`, `GET /api/clue-game/journal` and the journal's server merge (`useJournal.ts`, `mergeServerJournal`) stay. Mission M11 removes them.
- **Sightings in the journal** (D14, mission M7) and every other audit finding.
- `drizzle-orm`, and any dependency other than `drizzle-kit`. Upgrading Next.js is mission M1.
- `db/analysis/clue-match/` (the owner's practice SQL), even where a comment there describes saved rounds.

### Definition of done

- **Baseline, before any change:**
  - **Fresh greps.** On a fresh `origin/main`, re-run the greps under "Roots checked" and "Prove it's safe first" in D2, S3 and D13, and record their output in the plan. If a new caller of the save route, a model or a non-continent place has appeared since `4fa92a8e`, stop that part and note it.
  - **Packages.** Record `npm audit --omit=dev` and `npm ls --omit=dev --package-lock-only gel shell-quote @esbuild-kit/esm-loader`.
  - **Live places.** Save the live `/api/places/` response to `/srv/critter-ai/agent-state/missions/server-cleanup/places-before.json` (one GET).
  - **Saved rounds.** Run one read-only query against the live database, outside any dev-copy subshell (`scripts/db` prefers an exported `DATABASE_URL`): `./scripts/db "SELECT count(*), max(solved_at) FROM clue_match_solves"`. Expect nothing newer than 2026-10-07. If it shows a newer row, something still saves rounds: stop and add a handoff item.
  - **Baseline E2E.** Run `npm run e2e:fresh` once with the dev-copy block below, and copy its artifact to `…/server-cleanup/baseline-e2e/`.
- **After deleting the route, run `npm run clean`.** `tsconfig.json` includes the generated `.next-e2e` types, which import the deleted route, so typecheck and the pre-push hook fail until they're cleared.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run site:build` and `npm run e2e:site` exit 0.
  - `npm ls --omit=dev --package-lock-only gel shell-quote @esbuild-kit/esm-loader` lists none of them. npm exits 1 when nothing matches; that exit is the pass.
  - `npm audit --omit=dev` is recorded again.
  - `git grep -n -E "clue-game/solves|solveReport|lib/player|db:introspect|drizzle-kit|db/schema/|PLACE_KIND_LABELS|groupPlaces|groupLabel" -- . ':!plans' ':!package-lock.json' ':!db/analysis'` prints nothing.
- **`npm run e2e:fresh` passes twice:** once as it is, and once with `E2E_PLACE=continent:africa`. Both run **against the dev copy `phaser_june_dev`, never `.env.local`, with no content build**:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=/srv/critter-ai/agent-state/missions/server-cleanup/chrome-nosandbox.sh npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the reports under `/srv/critter-ai/agent-state/missions/server-cleanup/`.
- **`_document.tsx`:** compare the final E2E's screenshots with the baseline's, by eye, since the globe spins: `01-globe.png`, the `02d`/`02e` `*-light`/`*-dark` sheets and `10-sources-*`. They must look the same.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy is reverted). Smoke tests after the deploy:
  - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
  - `/api/places/` holds exactly the `kind = continent` entries of `places-before.json`, with the same fields, and no other kind. `animals` is unchanged.
  - `/api/clue-game/pool/` and `/api/clue-game/journal/` answer 200.
  - `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' https://play.critterconnect.org/api/clue-game/solves/` answers 404 or 405.
- **The Summary** lists the deleted files, both `npm audit` results, the E2E runs and the smoke results. It says that no production content build is needed.

### Decision rules

- Delete only what Goal names. Anything else that looks dead is a note in the plan, not an edit.
- **`scripts/db` and `deploy/db/dev-role.sql`:** comments and docs only, no change in behaviour. Never run `dev-role.sql`.
- If `gel` or `shell-quote` stays in the production tree after `drizzle-kit` goes, find out why and record it in the plan. Don't add `overrides`.
- **Lines about the journal route or sign-in:** keep the ones that describe them, but fix any line that says rounds are saved.

### Notes

- **Owner answers (2026-11-13).** Q5: the owner doesn't run `db:introspect`, and chose the audit's plan for Drizzle. Sign-in will be removed later (M11). The 3 old accounts are test data. The game isn't released to the public yet.
- **M2 came first.** M2 (records cleanup, PR #71, merged as `2aa3bd2c`) was done by hand just before this mission, and it changed `README.md`: line 25 now lists all seven routes, so drop `clue-game/solves` from it. The audit pinned `4fa92a8e`; re-read every site on `origin/main`.
- **Why keep `drizzle-orm`.** It saves rewriting the 9 queries and keeps typed inserts available for a future device-sync table. postgres.js's own `sql` template binds values safely too, so the guide shouldn't claim Drizzle is what makes the queries safe.
- **Already fine (checked by review):**
  - `scripts/content.ts:106` already passes a schema-less `drizzle(sql)` to `buildCluePool`, so the types hold without the models.
  - `useJournal.ts:50` with `journal.ts:86-87` skips unknown place keys.
  - The health checks only need a 200.
  - The journal route answers 200 signed out.
- **How `gel` gets in.** `drizzle-orm` lists `gel` as an optional peer. `drizzle-kit` (dev) needs it, which puts it in the lock file, where it then satisfies `drizzle-orm`'s peer as a production package. Removing `drizzle-kit` should remove it.
- **Chrome for the E2E:** copy `/srv/critter-ai/agent-state/missions/sign-dupes/chrome-nosandbox.sh` into `/srv/critter-ai/agent-state/missions/server-cleanup/`.
- **The pre-push hook** runs typecheck and lint. The `gh` token has the `workflow` scope, so the `ci.yml` comment can be pushed.
- **Size:** about 14 sessions (audit estimate).

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Recorded 2026-11-14 ~05:50 UTC on `447c8151` (= `origin/main` `2aa3bd2c` + this plan). State folder `/srv/critter-ai/agent-state/missions/server-cleanup/` (`S/` below).

**Checks:** `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass. **E2E** (dev copy, guard ok): `npm run e2e:fresh` 1575/1575, seed 7, 4 rounds; artifact `S/baseline-e2e/` (screenshots, `report.json`, `run.log`).

**Fresh greps on `origin/main` `2aa3bd2c`** (same results as the audit's at `4fa92a8e`; no new caller of the save route, no new model user, no new non-continent place reader):
- D2 `git grep -n "clue-game/solves" -- . ':!plans'`: 9 hits, none a call: `AGENTS.md:57`, `README.md:25` (M2's route list), `db/schema.sql:100`, `docs/CLUE_MATCH.md:24,45`, `solves/route.ts:7,50`, `solveReport.ts:1`, `proxy.ts:3`.
- D2 `fetch(|sendBeacon|XMLHttpRequest` in `src`: only `src/lib/getJson.ts:8` (GET). `method: '...'` in scripts/.claude/tests: only `create-test-player.mjs:24` (Clerk).
- D2 `solveReport|currentPlayerId` in src/scripts/tests: `solves/route.ts:3,4,23`, `player.ts:10`, `tests/clueGame/solveReport.test.ts:4`. Same in `*.mjs *.cjs scripts/db .github Dockerfile deploy .githooks .claude`: 0 hits. `insert(clueMatchSolves)|INSERT INTO clue_match_solves`: only `solves/route.ts:24`.
- S3 `db\.(select|query|update|delete|insert)\b` in src/scripts: `solves/route.ts:24`, `player.ts:15` only. `speciesTable|speciesDeductionClues|speciesFacts`: only inside `src/db/schema/` (`game.ts`, `species.ts`). Imports of `@/db`: journal, pool, range, ranges routes and `lib/places.ts` take `db` only; models only in `solves/route.ts:2` and `player.ts:3`. `db/schema|drizzle.config` in mjs/cjs/scripts/db/.github/Dockerfile/deploy/.githooks/.claude: 0. `db:introspect|drizzle-kit`: `AGENTS.md:48`, `docs/DRIZZLE_ORM_GUIDE.md:39`, `drizzle.config.ts:2`, `package.json:44,72`.
- D13 `wildlife_area|PLACE_KIND_LABELS|groupPlaces` in src/scripts/tests: only `src/clueGame/places.ts:5,39,41,58,62`. `groupLabel|REALM_NAMES`: `places.ts:46,57,58,65`, `PlaceCard.tsx:2,25`. `.kind === 'continent'|kind = 'country'`: `scripts/content.ts:64`, `scripts/e2e.mjs:433,2310`, `GlobeScreen.tsx:43`, `PlaceCard.tsx:25`. `clue_match_places` in src/scripts: queries `lib/places.ts:15,36`, `content.ts:64`; comments `places/route.ts:7`, `clueGame/places.ts:2`, `solveReport.ts:20`, `db/schema/game.ts:19`, `lib/places.ts:1`. `places` in `tests/`: 0 hits. Readers of `/api/places/`: `GlobeScreen.tsx:30`, `useAnimalSession.ts:36`, `Dockerfile:42`, `deploy/check.sh:107,118`, `scripts/e2e-fresh.mjs:61`, `scripts/e2e.mjs:102,432,2308`, playtest `SKILL.md:34`.
- Note for the architect: `useAnimalSession.ts:36` resolves `?place=` against `/api/places/`; after D13 a `?place=country:…` or `area:…` link no longer finds its place. Check what it does then (falls back to all animals? errors?).

**Packages** (`S/baseline-npm-ls.txt`, `S/baseline-npm-audit.txt`):
- `npm ls --omit=dev --package-lock-only gel shell-quote @esbuild-kit/esm-loader` (exit 0): `drizzle-orm@0.45.2 > gel@2.2.0 > shell-quote@1.10.0`. `@esbuild-kit/esm-loader` not in the prod tree.
- `npm audit --omit=dev` (exit 1): 4 vulnerabilities (2 high, 2 critical): `next` 16.0.0-16.4.0 critical (M1's), `shell-quote` 1.8.4-1.10.0 critical (GHSA-pqg4-j6r4-53mv), `sharp` <0.35.5 high, `source-map-js` 1.0.0-1.2.1 high.

**Live places:** `GET https://play.critterconnect.org/api/places/` 200, 41945 bytes, saved to `S/places-before.json`. 156 places: continent 5, country 77, wildlife_area 74. Fields `kind, key, name, group, speciesIds, bbox, center`. Continents (speciesIds): africa 27, asia 22, north-america 14, oceania 6, south-america 15.

**Saved rounds** (live `phaser_june` as `postgres`, read-only, no exported `DATABASE_URL`): `SELECT count(*), max(solved_at) FROM clue_match_solves` = 188, `2026-10-01 04:24:22+00`. Nothing newer than 2026-10-07: nothing saves rounds.

## Architecture

Read on `origin/main` `2aa3bd2c` (fetched 2026-11-14; worktree `6f14c9fd` = it + this plan). Every `file:line` below is on that commit. All four findings hold as the audit states them; the line numbers the brief gives are still right.

**Grep traps for the implementer.** The DoD grep runs over every file except `plans/`, the lock and `db/analysis/`. So no new text (docs, comments, the rewritten guide) may contain `clue-game/solves`, `solveReport`, `lib/player`, `db:introspect`, `drizzle-kit`, `db/schema/`, `PLACE_KIND_LABELS`, `groupPlaces` or `groupLabel`. Write "the save route", "Drizzle's CLI" and so on instead. Don't name the old ORM's npm scope either, because `.claude/hooks/guard-edits.sh` blocks it.

### Findings (ranked by impact)

**F1 · D2: a public write route into the live database (security).** `src/app/api/clue-game/solves/route.ts:12-53`: `POST` parses any JSON body and runs `db.insert(clueMatchSolves)`. It needs no sign-in and has no rate or size limit. For a signed-in caller, `src/lib/player.ts:10-24` also inserts a `profiles` row. It breaks least privilege, and the code contradicts the Privacy page. Fix: delete the 4 files.
- **The delete list is complete.** `git grep -E "solves/route|solveReport|SolveReport|lib/player|currentPlayerId|clueMatchSolves|@/db/schema"` outside the deleted files finds only doc and comment lines (listed below) and `src/db/index.ts:3,32` (handled by S3). Nothing in `*.mjs`, `.github`, `Dockerfile`, `deploy`, `.githooks`, `.claude` or `.agents` names them. The only test is `tests/clueGame/solveReport.test.ts` (5 tests), so `npm test` goes from 66 to 61.
- **One thing loses its last user:** `CLUE_GAME_GEM_TYPES` (`src/clueGame/categories.ts:35`) is imported only by `solveReport.ts:4`. It stays (decision rule); see Notes.
- **Lines to correct** (before → after; keep the rest of each line):
  - `src/proxy.ts:3-4` "(POST … reads it to save a solve under the player's profile)" → `// Makes the Clerk session available to routes (GET /api/clue-game/journal reads it with auth()).`
  - `src/clueGame/animalBoard.ts:28` `/** Saved with every round (clue_match_solves.rules_version). */` → `/** Names the rule set; a game saved in the tab under another version isn't resumed (useAnimalSession). */`
  - `src/clueGame/questionMatch.ts:70`, same comment → `/** Names the rule set (clue_match_solves.rules_version, rounds saved before 2026-10-01). */`
  - `db/schema.sql:91` "created on their first solve" → `-- One row per signed-in player (a Clerk user) who saved a round before 2026-10-01; nothing adds rows now (the journal route reads them).`
  - `db/schema.sql:100-102` → `-- One row per round finished before 2026-10-01, solved or lost; nothing writes here now. For analysis with SQL` / `-- (db/analysis/clue-match/07_solve_stats.sql) and the journal route. Anonymous play has no player_id.` (the `:102` bounds sentence goes).
  - `db/schema.sql:119` → `-- From plan 041 until 2026-10-01 every finished round was saved. Discoveries (the journal) count only 'solved'.`
  - `AGENTS.md:55`: drop `solveReport, `. `AGENTS.md:57`: drop `` `POST /api/clue-game/solves`, `` (S3 rewrites the rest of the line). `AGENTS.md:59` → `- Auth: Clerk (`src/pages/_app.tsx`, `src/proxy.ts`). Nothing creates `profiles` rows now; the journal route reads the ones saved before 2026-10-01.`
  - `README.md:25`: drop `` , `clue-game/solves` `` (six routes left).
  - `.claude/skills/playtest/SKILL.md:16` "(rounds then save with the player's profile)" → "Signing in is optional and saves nothing (the journal only merges an account's solves from before 2026-10-01)."
  - `.github/workflows/ci.yml:42-43` → `# Plays the game in headless Chrome against the scrubbed copy phaser_june_dev, so CI holds no live database` / `# credentials (docs/DATABASE_ACCESS.md). Next dev needs both keys of Clerk's dev instance.`
  - `docs/CLUE_MATCH.md:10` → "No sign-in needed, and no round is saved: the game only reads from the server. The Field Journal lives on the device; when signed in, it also pulls the player's solves saved before 2026-10-01. `?seed=N` replays …" (rest unchanged).
  - `docs/CLUE_MATCH.md:24`: drop `` `POST /api/clue-game/solves` (checked by `src/clueGame/solveReport.ts`), ``.
  - `docs/CLUE_MATCH.md:45`: delete the mermaid line `H -- every round end --> SV[…]`.
  - `docs/CLUE_MATCH.md:52` "is saved with every round as `rules_version`;" → "The rules version is `ANIMAL_RULES.version` (bumping it drops a game saved in the tab);".
  - `docs/CLUE_MATCH.md:74` "`clue_match_solves` has a row per finished round:" → "… a row per round finished before 2026-10-01 (nothing writes it now):". Also "~90 s" → "90 s to 2.5 min" (S8, the same line).
  - `docs/CLUE_MATCH.md:101` "solve-report and localStorage parsing" → "localStorage parsing".
  - `docs/ANIMAL_BOARD_PAPER.md:247` → "*Update (2026-11-14):* still true. A 2026-10-29 note here said rounds were saved, but the 044 board never sent one. The owner chose not to save rounds (2026-11-06), and the unused save route is deleted."
  - `docs/DATABASE_ACCESS.md:177` "Writes reach real players, and e2e runs add rounds to `clue_match_solves`." → "Writes reach real players. (The game itself writes nothing, so an e2e run only reads.)"
  - **Outside the repo:** `~/AGENTS.md`, Critter Connect section, says "Game tests play real rounds, so they add rows to `clue_match_solves`". Agents may not edit that file, so add a handoff item asking the owner to drop the sentence (Blocks: nothing).

**F2 · S3: models that misdescribe the tables, plus a dev tool that puts a critical advisory into production.** `src/db/schema/species.ts:1-3` claims to model "the columns the app reads", but `cluePool.ts:14-22` reads `redlist_url`, the four `photo_*` columns and the `source_*` columns, and none of those are modelled. After D2 nothing uses a model: the two `db.insert` calls are the only query-builder calls (`solves/route.ts:24`, `player.ts:15`). `drizzle.config.ts` only serves `db:introspect` (`package.json:44`). `drizzle-kit` (`:72`) is what puts `gel` and `shell-quote` 1.10.0 (critical, GHSA-pqg4-j6r4-53mv) into the production tree. This breaks KISS and single source of truth (`db/schema.sql`). Fix: delete `src/db/schema/{game,index,player,species}.ts` and `drizzle.config.ts`, then make the following changes:
- `src/db/index.ts`: delete `:3` and `:31-32`, and change `:30` (target below).
- Remove the script with `npm pkg delete "scripts.db:introspect"`.
- `npm uninstall drizzle-kit --no-audit --no-fund`.
- `AGENTS.md:48`: delete the line.
- `AGENTS.md:57`: the models sentence ("Drizzle `src/db/schema/*` models … unmodelled.") → "One client, `src/db/index.ts` (Drizzle over postgres.js, no models); every query is raw SQL (`docs/DRIZZLE_ORM_GUIDE.md`)." This also drops the "old expedition tables still exist" clause the sentence hangs on (S1 and D4 call it unverifiable). Record that under Decisions.
- `README.md:26` → "- `src/db/index.ts`: the database client (Drizzle over postgres.js; queries are raw SQL)."
- Rewrite the guide (outline below).

**The lock, predicted and verified.** I ran `npm uninstall drizzle-kit --package-lock-only --offline` on a scratch copy in `/tmp`, now deleted. It changed only the root entry (devDependencies) and removed 37 entries: `drizzle-kit`, `@drizzle-team/brocli`, `@esbuild-kit/esm-loader`, `@esbuild-kit/core-utils` with its private `esbuild@0.18.20` and 23 `@esbuild/*` platform packages, `esbuild-register`, `gel` (with its private `isexe`, `which`), `shell-quote`, `@petamoriken/float16`, `env-paths`, `buffer-from`, `source-map` and `source-map-support`. Nothing was added. After that, `npm ls --omit=dev --package-lock-only gel shell-quote @esbuild-kit/esm-loader` prints `(empty)` and exits 1, which is the pass.
- **Why `gel` goes:** `npm explain gel` shows only `drizzle-kit` (hard dependency) and `drizzle-orm` (`peerOptional`). npm doesn't install an optional peer that nothing else requires, so no override is needed.
- **Predicted audit:** `npm audit --omit=dev` should drop from 4 to 3 (next critical, sharp high, source-map-js high; `source-map-js` is a different package from the `source-map` that goes).
- **What stays:** `dotenv` (`scripts/connect.ts:4`) and the root `esbuild@0.19.12` (`scripts/run-tests.mjs`).
- **On the real run:** if `git diff package-lock.json` shows anything other than these removals, stop and record it.

**F3 · D13: every visitor downloads 151 places no screen shows.** `src/lib/places.ts:13-15` has no `WHERE`. The globe filters to continents in the browser (`GlobeScreen.tsx:43`). `src/clueGame/places.ts:39-74` (`PLACE_KIND_LABELS`, `REALM_NAMES`, `groupLabel`, `groupPlaces`) only serves that old list, and `groupLabel`'s one remaining caller, `PlaceCard.tsx:25`, is on a branch that never runs. The header (`places.ts:3`) names a test that was deleted in d24d95a1. This is dead code and wasted payload (KISS). Fix:
- `src/lib/places.ts:1` → `// The globe's continents and any place's outline, from the clue_match_places view (db/schema.sql).`
- `src/lib/places.ts:15` → `FROM clue_match_places WHERE kind = 'continent' ORDER BY name`. Keep `kind` in the SELECT so the response shape is unchanged.
- `src/app/api/places/route.ts:6` → ` * Continents with at least two playable animals (clue_match_places view),`. `:7` stays.
- `src/clueGame/places.ts:1-3` → `// Places to explore from the home globe (GET /api/places: the continents of the` / `// clue_match_places view in db/schema.sql), plus small pure helpers for the globe and the journal.`
- `src/clueGame/places.ts`: delete `:38-74` (from the blank line after `MIN_PLACE_ANIMALS` through `groupPlaces`). Keep `PlaceKind`, `Place`, `PlaceAnimal`, `PlacesResponse`, `MIN_PLACE_ANIMALS`, `classColor` and `sightingPoint`; they all have importers.
- `src/components/globe/PlaceCard.tsx:2` → `import type { Place, PlaceAnimal } from '@/clueGame/places';`. `:25` → `<p className="m-0 text-xs text-neutral-7">Continent</p>`.
- `scripts/e2e.mjs:14` "E2E_PLACE (a place key)" → "E2E_PLACE (a continent key, e.g. continent:africa)".
- `.claude/skills/playtest/SKILL.md:36` "they come from the journal's sightings in localStorage" → "Found animals' ranges light up the globe (green amphibians/reptiles, amber mammals): the animals come from the journal's finds in localStorage (`clue-match:journal:v1`), their ranges from `GET /api/clue-game/ranges`."

The same data, checked against `S/places-before.json`:
- The 5 continents' `speciesIds` already cover all 76 animals, so `animals` stays the same.
- `ORDER BY name` gives the same order as today (africa, asia, north-america, oceania, south-america).

**F4 · S8: database docs agents act on are wrong.** Each line below is checked against the code or the other doc it contradicts. The `:36` port 8000 line is excluded (S7).
- **The app's route.** `docs/DATABASE_ACCESS.md:4-5`, `:47`, `AGENTS.md:19` and `docs/DRIZZLE_ORM_GUIDE.md:3` send the app through PgBouncer. `deploy/app.env.example:4-6` and `DATABASE_ACCESS.md:206-208` say the live app connects as `critter_app` to `db:5432`. The map and port table (`:17-36`) don't show that route at all. Changes:
  - `:4-5` → "… Agents, scripts and dev servers use the public PgBouncer endpoint in `DATABASE_URL`; the live app connects as `critter_app` straight to the db container."
  - Map: retitle the first block "Dev servers, scripts, agents / compatible psql", and add a block: `Live app container (critter_app, deploy/app.env)` / `└─ db:5432 on the Docker network ─► PostgreSQL (no PgBouncer, no TLS)`.
  - Port table: `:31` → "PgBouncer with TLS; dev servers, scripts, agents, CI". `:32` → "Raw PostgreSQL; the live app connects here; not internet-accessible".
  - Route table: `:47` becomes two rows, `| Live app (container) | critter_app → db:5432 (deploy/app.env) | No |` and `| Dev server, e2e, npm run content/iucn | DATABASE_URL → port 6432 | No |`.
  - `AGENTS.md:19` → "- `DATABASE_URL` (agents, scripts, dev servers) goes through TLS PgBouncer on port 6432; the live app connects as `critter_app` straight to the db container (`deploy/app.env.example`)."
- **`--production` and `CLUE_USE_TUNNEL`.** Every form of these reaches the database `DATABASE_URL` names (the live `phaser_june` on WSL and the Oracle VPS); the flags change only the route. Comments only in `scripts/db`:
  - `:2` → `// psql to the database DATABASE_URL names (the environment's, else .env.local's: the live phaser_june on WSL and the Oracle VPS), without credentials in argv.`
  - `:6` → `//   ./scripts/db --production -1 -f change.sql   same database, raw Postgres through the WSL SSH tunnel (127.0.0.1:55432)`
  - One new comment line above `:38`: `// --production changes only the route (the WSL tunnel), not the database.`

  Docs:
  - `DATABASE_ACCESS.md:70-75`: add `./scripts/db --production -1 -f change.sql   # WSL: same database, through the 55432 tunnel`.
  - `:77-80`: append "Every form reaches the database `DATABASE_URL` names, which on WSL and the Oracle VPS is the live `phaser_june`."
  - After `:128`: "From the repo, `./scripts/db --production …` and `CLUE_USE_TUNNEL=1 npm run content|iucn …` (`scripts/connect.ts`) take the same tunnel to the same database."
  - `docs/SHAPEFILE_BEST_PRACTICES.md:21` "goes through the agent tunnel instead" → "takes the WSL agent tunnel to the same database instead (docs/DATABASE_ACCESS.md#wsl-agentraw-tunnel)".
- **The dev-copy section.**
  - `DATABASE_ACCESS.md:192` "`.env.local` there holds only:" → "Its settings (the Oracle box's `.env.local` before 2026-11-01, now the dev-copy file below):". The key list stays.
  - `deploy/db/dev-role.sql:1-3` (comments only) → `-- critter_dev: owns phaser_june_dev, the scrubbed copy of phaser_june that CI's e2e job` / `-- (E2E_DATABASE_URL) and mission E2E runs on the Oracle VPS use` / `-- (docs/DATABASE_ACCESS.md#agents-on-the-oracle-vps). No access to prod.` `:3`'s "Run as postgres …" sentence stays.
  - After `:33`, add: `-- Its 60 s statement_timeout (above) stops a clue_match_places refresh (90 s to 2.5 min):` / `-- run that refresh with SET LOCAL statement_timeout = 0 in its transaction.`
  - `docker-compose.yml:35-36` (comment) → `# One [databases] entry per URL: prod, and the scrubbed copy phaser_june_dev` / `# (CI's e2e database; docs/DATABASE_ACCESS.md#agents-on-the-oracle-vps). Other roles log in via` (`:37` continues as today).
- **Refresh times disagree.** `DATABASE_ACCESS.md:171` says "about 2.5 minutes"; `db/schema.sql:208` and `CLUE_MATCH.md:74` say "~90 s". All three become "90 s to 2.5 min(utes)". Both figures are observations, and neither can be re-measured without a database write.
- **`db/schema.sql` (comments only).**
  - `:1-2` → `-- Critter Connect: the Postgres objects the app uses. A baseline taken on 2026-09-25` / `-- and edited to match each change since, not a migration history: migrations 001-044`, with `:3` unchanged.
  - `:13` → `-- Extensions: postgis. init/01-extensions.sql also installs pgcrypto, which no SQL in the repo calls.`
  - `:68` → `-- Fun facts: field notes in the field guide, after the hand-written clues (src/clueGame/questionMatchContent.ts).`
  - `:123` → `-- Rules.version of the rules played, from the 041 and 043 games' Rules (src/clueGame/questionMatch.ts; the 044 board never saved): 041-1 charges; 041-5 charges with toys and 12 look-alikes; 043-0 gems ask questions; 041-2 to 041-4 were removed experiments (plans/041); NULL before plan 041.` The saving game used `DEFAULT_RULES`, which has been `043-0` since d496643a (2026-09-30).
- **The page files.**
  - `src/pages/_app.tsx:9` → `// cc fonts (Nunito, Open Runde, Patrick Hand) are declared in globals.css; their files and OFL licences are in public/fonts/.`
  - `src/pages/_document.tsx:6` → `<Html lang="en">`. Nothing reads the `dark` class: dark mode is `[data-theme="dark"]` (`globals.css:238`, set by `THEME_SCRIPT`), no stylesheet has a `.dark` selector, and the E2E switches themes through `data-theme` (`e2e.mjs:397-405`).
- **The runbook check (`DATABASE_ACCESS.md:249-252`).** Today it runs `./scripts/db` with `.env.local`, which on this VPS is the live database as `postgres`. Its `sed` then finds no `phaser_june_dev` and leaves `DATABASE_URL` empty, so the check can never give its expected answer. Replace those 4 lines and keep the `curl` line:
  ```bash
  # On the Oracle box, from the repo, with the copy's settings (never .env.local: that is the
  # live database as postgres). Prints OK, or FAIL and exits 1.
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy || exit 1; set +a
    : "${DATABASE_URL:?dev-copy settings not loaded}"
    # critter_dev reaches the copy...
    [ "$(./scripts/db -tA -F/ -c 'select current_user, current_database()')" = critter_dev/phaser_june_dev ] \
      || { echo 'FAIL: not critter_dev on phaser_june_dev'; exit 1; }
    ./scripts/db -tA -c 'select count(*) from species'
    # ...but not prod
    out=$(DATABASE_URL=${DATABASE_URL/\/phaser_june_dev//phaser_june} ./scripts/db -tA -c 'select 1' 2>&1) \
      && { echo 'FAIL: critter_dev reached phaser_june'; exit 1; }
    case $out in *'permission denied for database "phaser_june"'*) echo OK ;; *) echo "FAIL: ${out%%$'\n'*}"; exit 1 ;; esac )
  ```
  - **The identity check comes first and gates everything else.** A missing file, an inherited live URL or a `.env.local` fallback all fail at the `current_user` line, before any URL is derived. The prod check passes only on that exact error, so a network failure can't pass as success.
  - **Nothing secret is printed:** psql's errors name the host and port, never the password.
  - **Run it once** in the S8 step and record the output (`OK`, plus the species count) under Log.

**Already fine (verified):**
- `scripts/content.ts:106` passes a schema-less `drizzle(sql)` into `buildCluePool` (typed `PostgresJsDatabase<Record<string, unknown>>`, `cluePool.ts:9`), so the app's schema-less `db` fits the same type.
- `useJournal.ts:50` with `journal.ts:85-87` skips place keys it doesn't know.
- `Dockerfile:42`, `deploy/check.sh:107,118` and `e2e-fresh.mjs:61` read only the status.
- The journal route answers `{entries: []}` signed out (`journal/route.ts:20`).
- `.claude/skills/playtest/SKILL.md:34` ("The list shows the continents") stays true.
- `ci.yml:21` ("Drizzle only") stays true.

### Target design

- **Server data layer after M6.** `src/db/index.ts` holds one postgres.js client, wrapped by Drizzle without models. Six routes (`places`, `places/outline`, `clue-game/{pool,range,ranges,journal}`) make 9 reads, all `db.execute<Row>(sql\`…\`)`: 3 in `lib/places.ts`, 3 in `lib/cluePool.ts`, and one each in the range, ranges and journal routes. No code in `src/` writes to the database. Data flow is unchanged, except that `/api/places/` returns 5 rows instead of 156 in the same shape.
- **`src/db/index.ts`** keeps `:1-2` and `:5-28` as they are (the pgbouncer strip, the client, and the dev global). Its end becomes:
  ```ts
  // No models: every query is raw SQL (db.execute(sql`…`); docs/DRIZZLE_ORM_GUIDE.md).
  export const db = drizzle(client);
  ```
  Its type becomes `PostgresJsDatabase<Record<string, never>> & { $client: Sql }`. That's the type `content.ts` already passes to `buildCluePool`, and `execute<T>` doesn't depend on a schema. So `journal`, `pool` (via `buildCluePool(db)`), `range`, `ranges`, `lib/places.ts` and `scripts/content.ts` type-check unchanged; the audit's 2026-11-10 dry run agrees. None of them imports anything but `db`.
- **D13 and `?place=`.** `useAnimalSession.ts:60` reduces `?place=` to a continent before any lookup: `continentOf` (`regions.ts:310-319`) maps `country:KEN` to `africa`, and `area:…` or an unknown key to `null`. `loadPlace` (`:34-42`) then only ever looks up `continent:<key>`, and isn't called when the result is `null`. So after D13:
  - `?place=country:KEN` still plays Africa, with Africa's place for sightings.
  - `?place=area:…` still plays every animal.
  - `?place=continent:europe` (not in the list before or after) still falls back to every animal.

  There's no error and no blank board. The behavior is identical, so no edit is needed.
- **Other places assumptions.**
  - `GlobeScreen.tsx:43`'s filter and `e2e.mjs:433,2310` become no-ops (Notes).
  - `e2e.mjs:434-435` with a non-continent `E2E_PLACE` now throws `No place …`, which is the intended loud failure.
  - `PlaceCard` only ever gets continents (`GlobeScreen.tsx:41,73,92`).
  - `loadPlaceOutline` and `/api/places/outline` stay as they are. The globe asks only for the picked continent (`Globe.tsx:199`); the route still accepts country and area keys and serves them from the view (D13: "can stay").
- **`docs/DRIZZLE_ORM_GUIDE.md`**, rewritten. Short; none of the grep-trap strings.
  1. **What it is.** `src/db/index.ts` exports `db`: one postgres.js client per server process (one connection, kept across dev hot reloads), wrapped by Drizzle with no models. Routes: the live app connects as `critter_app` to `db:5432`; dev servers, e2e, scripts and agents go through PgBouncer 6432 in transaction mode, so no session `SET`, `LISTEN`, advisory locks or temp tables, and `SET LOCAL` only inside a transaction (link `DATABASE_ACCESS.md`). The app only reads.
  2. **Queries.** All raw SQL with `db.execute<Row>(sql\`…\`)`; list the 9 and where they live.
     - `${value}` is sent as a bind parameter; lists use `sql.join(ids.map(id => sql\`${id}\`), sql\`, \`)`. Never put input into `sql.raw`.
     - Say plainly that postgres.js's own `sql` tag binds values the same way: Drizzle stays because the code already uses it and it keeps typed inserts available (owner, 2026-11-13), not because it's safer.
     - `Row` is a cast, not a check, so keep it in step with `db/schema.sql`. postgres.js returns `count`, `bigint` and `numeric` as strings: cast in SQL (`count(*)::int`, journal route) or type them `string | number` and convert (range route).
     - Routes wrap queries in try/catch, log `[API /path] Error:` and answer 500 JSON.
     - Scripts get their own client from `scripts/connect.ts`; `scripts/content.ts` wraps it with `drizzle(sql)` to reuse `buildCluePool`.
  3. **Schema changes.** There are no migrations.
     - On live, take a fresh dump first (`deploy/backup/pg-backup.sh`), then apply with `./scripts/db -1 -f change.sql`.
     - Edit `db/schema.sql` to match, then update the query and its `Row` type.
     - If the app reads the change, apply it to `phaser_june_dev` too (CI's e2e).
  4. **Adding a model, only for a future table the code writes** (for example a device-sync table):
     - Declare it in `src/db/tables.ts` with `pgTable('name', {…})`, with every column exactly as `db/schema.sql` has it (type, `NOT NULL`, default, FK). A model that leaves out or mistypes columns is the bug the deleted models had.
     - Write with `db.insert(table).values(row)` (`.returning()` if needed). No `drizzle(client, { schema })`: that is only for the `db.query` API.
     - Reads stay raw SQL.
     - Grant the write in `deploy/db/app-role.sql`, and change `db/schema.sql`, the model and the grant in one commit.
     - Drizzle's CLI isn't installed (removed 2026-11-14 with its advisory), so check a model by hand against `./scripts/db '\d name'`.
  5. **Conventions:** keep today's `:41` as it is.
- **`npm run clean` after the route goes.** `tsconfig.json:37-38` includes `.next-e2e/types` and `.next-e2e/dev/types`. The baseline E2E left `.next-e2e/dev/types/validator.ts` and `routes.d.ts`, and both reference the solves route, so after `git rm` the typecheck and the pre-push hook fail with "cannot find module". Run `npm run clean` (removes `.next`, `.next-e2e`, `.test-dist`) right after the deletion, in the same step, and never while an `e2e:fresh` or dev server is running. The next `e2e:fresh` regenerates the types. Say in the PR that other checkouts (the owner's WSL) need `npm run clean` once after pulling.

### Order of work

Each chunk keeps `npm run typecheck`, `npm run lint` and `npm test` green and is committed on its own.

1. **D2.** `git rm` the 4 files, then `npm run clean`, then the F1 line edits. Expect 61/61 tests. The models still exist at this point, and `index.ts` still compiles against them.
2. **S3.** Delete `src/db/schema/` and `drizzle.config.ts` **in the same commit as** `npm uninstall drizzle-kit`: `drizzle.config.ts:2` imports `drizzle-kit` types and `tsconfig` includes `**/*.ts`, so leaving the file would break typecheck. Then:
   - edit `index.ts`, run `npm pkg delete`, and check that the lock diff is exactly the 37 removals;
   - `npm ls …`: expect exit 1. Record `npm audit --omit=dev`;
   - edit AGENTS `:48`/`:57` and README `:26`, and rewrite the guide;
   - run `e2e:fresh` once with the dev-copy block, because the client every route uses has changed.
3. **D13.** The F3 edits, then `e2e:fresh` once.
4. **S8.** The F4 edits, then run the runbook check once and record `OK`. Typecheck and lint still matter here, because the `.tsx`, `scripts/db` and SQL edits are comments plus one JSX attribute.
5. **Final.** The brief's Definition of done: the DoD grep, `site:build`, `e2e:site`, `e2e:fresh` twice (plain and `E2E_PLACE=continent:africa`), screenshots compared with `baseline-e2e/`, `npm ls`, `npm audit`. Add the handoff item for `~/AGENTS.md`.

Keep at most two E2E artifact folders (disk rule).

### Risks

- **`src/db/index.ts` is every route's client.** A slip there takes down every route. The typecheck, `e2e:fresh` (pool, places, ranges, journal) and `deploy/check.sh` catch it.
- **A wrong `WHERE` would empty the globe.** E2E: `listed === continents.length` is 0 = 0, but `place` is then undefined and the run throws `No place with animals`, so it fails loudly. The smoke compares the live response with `places-before.json`. Browsers may keep the old 156-row response for up to 1 h (`max-age=300, swr=3600`), which is harmless because it's a superset.
- **Removing a public URL.** Only a pre-2026-10-01 tab would still call it, and that call was best-effort (D2 Users). After the deploy it answers 404: there's no route, and `trailingSlash: true`.
- **The lock change.** It's removals only, as the scratch run showed. If the real run differs, stop.
- **The `_document` attribute ships to players.** Nothing reads it (above). The screenshot comparison is the guard.
- **The runbook check touches the shared PgBouncer.** It's two reads and one refused login, as `critter_dev`, never on the live database.

### Rejected alternatives

- **Drop Drizzle and use postgres.js's `sql` directly:** the owner kept `drizzle-orm` (2026-11-13), and it would mean rewriting 9 working queries for no gain.
- **Keep or fix the models for future inserts:** they model the wrong columns. A future table writes its own model (guide §4).
- **Filter continents in the route or the client instead of SQL:** it moves the same rows and wastes the query.
- **A `?kind=` parameter on `/api/places/`:** no caller wants the other kinds (YAGNI).
- **A 410 stub for the save route:** more code, and a 404 already satisfies the smoke test.
- **`overrides` for `gel`/`shell-quote`:** forbidden by the brief, and unneeded because the uninstall removes them.
- **Removing the client-side continent filters (`GlobeScreen.tsx:43`, `e2e.mjs:433,2310`):** the Goal doesn't name them, so they stay as notes.
- **Renaming `scripts/db --production`:** a behavior change; the brief allows comments only.
- **Revoking `critter_app`'s write grants now:** a database change; that's S13 in M13.
- **Running the runbook check through WSL's `psql-tunnel.mjs`:** the dev-copy settings and the check belong to the Oracle box.

### Notes (looks dead or stale after M6; not edited, per the decision rule)

- **Dead code:**
  - `CLUE_GAME_GEM_TYPES` (`src/clueGame/categories.ts:35`) has no importer after D2 (M7 territory).
  - The `kind === 'continent'` filters at `GlobeScreen.tsx:42-43` and `scripts/e2e.mjs:433,2310` do nothing after D13.
  - `/api/places/outline` (`route.ts:7`) and `loadPlaceOutline` still serve country and area outlines (S17 removes the rows).
  - `Place.key` and `Place.group` comments (`clueGame/places.ts:9,12`) still describe all three kinds, which is fine while `PlaceKind` stays.
- **Stale comments and grants:**
  - `deploy/db/app-role.sql:23-26`: the write grants and the comment "a player's profile on first solve" are left for S13.
  - `src/proxy.ts`'s middleware now serves only the journal route (M11).
  - `AGENTS.md:79` "input/storage parsing": the only input-parser test is gone; storage parsing (`journal.test.ts`) remains.
  - `AGENTS.md:23` and `DATABASE_ACCESS.md:84-86`: their "introspection" wording referred to the removed CLI.
  - `init/01-extensions.sql` installs `pgcrypto` and `uuid-ossp`, which nothing calls.
- **Small duplication (DRY):**
  - The `sql.join(ids.map(id => sql\`${id}\`), sql\`, \`)` pattern is repeated in `lib/places.ts:23` and `ranges/route.ts:22` (`= ANY(${ids})` would do).
  - The pgbouncer-param strip is repeated in `src/db/index.ts:10-14` and `scripts/connect.ts:11`.
  - `dotenv` now serves only `scripts/connect.ts`; `scripts/db` already uses Node's `process.loadEnvFile`.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX: none

MISSED:
1. `src/game/constants.ts:4` says "Gem color keys (saved with each solve)". Goal 1 covers every line that says rounds are saved; this one is in no list (brief, D2, F1) and the DoD grep can't see it. The file is outside the Scope list, so either fix the comment in the D2 step (drop the parenthetical) and record it under Decisions, or add it to Notes. Fixing is the better call: the Goal is explicit and it is a comment only.

SHOULD-CONSIDER:
1. Lock tally: the uninstall removes 22 `@esbuild/*` platform packages, not 23 (the total of 37 is right). Reproduced on a scratch copy with npm 11.19.0: 37 entries removed, none added, only the root entry changed, `npm ls --omit=dev --package-lock-only …` prints `(empty)` and exits 1. Have the step check "37 removed, 0 added, no other entry changed" rather than the per-package list.
2. `db/schema.sql:123`: adding `043-0` to the versions that were saved rests on code history (`questionMatch.ts:131`, d496643a), not on the rows. Confirm with one read in the dev-copy subshell (`SELECT rules_version, count(*) FROM clue_match_solves GROUP BY 1`) before writing it, or leave `043-0` out.
3. Runbook check (`DATABASE_ACCESS.md:249-252`): it is the only new code that hasn't run. PgBouncer may word the refusal differently, for example a cached `server_login_retry` error on a rerun within seconds. If the one run prints FAIL on a refusal, record the exact text and match that; don't loosen it to "any error". Run it before the doc is committed.
4. `AGENTS.md:57`: keep "the old expedition tables still exist in Postgres" and drop only "unmodelled". Whether they exist is Q18's (S1, D4), and the decision rule says delete only what the Goal names.
5. `npm run clean` after the merge is also needed in this VPS's main checkout (`/srv/critter-ai/critter-connect`) and any other worktree that holds a `.next*` folder, not only in WSL: say so in the PR and the Summary. (After the clean, the ignored `next-env.d.ts` still imports `.next-e2e/dev/types/routes.d.ts`; tsc 5.8.3 doesn't check unresolved side-effect imports, so typecheck passes.)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 05:52 UTC · Baseline: fresh greps (no new callers), packages, live places, saved rounds (max 2026-10-01), typecheck/lint/test 66/66, E2E 1575/1575 → `baseline-e2e/`.
- 2026-11-14 06:10 UTC · Architecture: architect wrote findings + target design (D2→S3→D13→S8 order; lock dry run drops gel/shell-quote/@esbuild-kit; D13 no behaviour change). Plan-only, no code.
- 2026-11-14 06:26 UTC · Fable review: APPROVE_WITH_CHANGES, 0 MUST-FIX; 1 missed comment (`src/game/constants.ts:4`), 5 SHOULD-CONSIDER. Plan-only.

## Summary
