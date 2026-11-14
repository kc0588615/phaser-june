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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 05:52 UTC · Baseline: fresh greps (no new callers), packages, live places, saved rounds (max 2026-10-01), typecheck/lint/test 66/66, E2E 1575/1575 → `baseline-e2e/`.

## Summary
