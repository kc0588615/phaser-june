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

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
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
