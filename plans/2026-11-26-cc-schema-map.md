---
mission: cc-schema-map
project: critter-connect
branch: agent/cc-schema-map
status: active
started: 2026-11-26 08:54 UTC
---

# Mission: map and tidy Critter Connect's database (read-only)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Start: mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-25-cc-schema-map.md --skills db -->

### Goal

Critter Connect's database is fully mapped as it really is, the repo's description of it is brought up to date, and the problems found are ready for Danby to choose from. **No database is changed.**

When it's done:

1. **The map:** `docs/DATABASE_SCHEMA.md` describes every object of the live `phaser_june` the game or its scripts depend on, with what reads it in the code (`file:line`) and row counts. That covers:
   - the `public` tables, views and materialized views;
   - `iucn`, and the `oneearth` and `natural_earth` schemas;
   - functions, triggers, extensions, roles and grants.

   It also lists how the dev copy `phaser_june_dev` differs from the live database, since CI's e2e reads the dev copy.
2. **The ERD:** Mermaid `erDiagram` sources in `docs/schema/` are the source of truth, and each is complete on its own. They're rendered with diagram-design to HTML and SVG, light and dark, in the same folder; `db-designer` picks the file names. Every table, key and relationship in the map is in them. `docs/DATABASE_SCHEMA.md` links them and embeds the light SVGs.
3. **`db/schema.sql` agrees with the live database** for every object it covers, within the rules below. Each change is listed in the Summary. Its header still says what it is: a hand-kept baseline, not a migration history.
4. **The findings:** ranked problems with evidence. These cover keys, constraints, types, nullability, indexes, naming, dead objects, spatial columns (SRID, GiST indexes), grants, and drift between the repo, the live database and the dev copy. Each finding that needs a change has a draft script in `db/proposals/NN-<name>.sql`. A draft is never run here. Each one has:
   - a `DRAFT: not applied` header;
   - an explicit transaction, its checks before and after, and its rollback;
   - its risk: locks, rewrites, data loss, and what players would see.
5. **A handoff item for Danby** (`Blocks: nothing`) lists the proposals, one line each with its risk and the mission's recommendation, so he can pick which ones a later mission applies.
6. **Live:** merged and released as critter-connect's settings say. This is a docs and schema-file change only, so the game itself doesn't change.

### Why

Danby wants a clear, current picture of the game's database before more animals and more range sources arrive. The repo has no migration history: `db/schema.sql` is a baseline kept by hand since 2026-09-25, and earlier missions dropped and changed objects. This mission is also the first use of the `db-designer` specialist, the `db` skill pack and the Gemini final review.

### Scope

In:

- Read-only queries on the live `phaser_june` and the dev copy `phaser_june_dev` (Decision rules).
- New files:
  - `docs/DATABASE_SCHEMA.md`, `docs/schema/` and `db/proposals/`;
  - `db/analysis/schema-check.sql`;
  - the repo marker `.diagram-design`, plus the profile `~/.diagram-design/profiles/critter-connect.md` (Notes).
- Edits to `db/schema.sql`.
- Edits to the docs whose facts about the database are wrong: `AGENTS.md`'s database lines, `docs/CLUE_MATCH.md`'s database section, and `docs/DATABASE_ACCESS.md`'s object lists. Change those facts only.
- The handoff file `/srv/critter-ai/handoff/critter-connect.md`.

Out:

- **Any write to any database:**
  - no DDL, no DML, no grants;
  - no `VACUUM` or `ANALYZE`, no temporary objects;
  - no `pg_dump` or `pg_restore`, no dev-copy refresh.

  `db/proposals/*.sql`, `deploy/db/*.sql` and `db/schema.sql` are never run.
- Application code under `src/` and `scripts/` (including `scripts/content.ts`), and the content files under `db/content/`.
- The content build (`npm run content -- build`, `ranges`, `npm run iucn`), and Drizzle.
- Hetzner: no SSH to the server and no container commands, except what the release's `deploy critter-connect` does itself.

### Definition of done

- **Query log:** every statement run against either database is in a file under the mission's state folder, with its output: `/srv/critter-ai/agent-state/missions/cc-schema-map/queries/`, one file per run. Each one was read-only (Decision rules).
- **Checks:** `npm run typecheck`, `npm run lint` and `npm test` pass on the final commit. That includes `tests/clueGame/content.test.ts`, which pins literal SQL in `db/schema.sql`. Run `npm run e2e:fresh` once at the end; it only reads, and it shows the change broke nothing.
- **The schema check:** `db/analysis/schema-check.sql` is a read-only query. It prints the live definitions in a fixed, sorted form: each table's columns (name, type, nullability, default), its constraints (`pg_get_constraintdef`) and indexes (`pg_get_indexdef`), the views' and materialized views' definitions (`pg_get_viewdef`), and the grants.
  - The mission compares its output with `db/schema.sql` object by object, by reading both. There's no parser and no scratch database.
  - The Summary records each object as "matches" or "differs", with how it differs and what was done about it.
  - A later mission can rerun the query.
- **ERD:** the diagrams render in light and dark, and their tables and foreign keys match the map's.
- **Inventory location:** `db-designer` writes the full inventory straight into `docs/DATABASE_SCHEMA.md`. The plan, which every session rereads, keeps only a summary and the findings.
- **Final reviews:**
  1. Astra's code review (`## Code review (Astra)`). Its real MUST-FIX items become steps before Verification.
  2. Once those steps are checked, a **Gemini 4 Neon (High) code review** under `## Code review (Gemini)`, with `gemini-review --code origin/main <plan>` (ops `docs/missions.md`, "Gemini final review"). Its real MUST-FIX items become steps too.

  If either review is skipped (exit 3, 4 or 5), record why and carry on.
- **The plan's Summary has:**
  - the map in brief;
  - the schema check's per-object result and every `db/schema.sql` change;
  - the ranked findings with their proposal files;
  - the handoff item's number;
  - where the diagram-design profile lives;
  - three lines on the specialists: did `db-designer` and diagram-design do the job, did the Gemini review add anything Astra's didn't, what the mission cost (`mission usage`), and whether the pattern is worth repeating.
- **Released** (`MISSION_RELEASE=deploy`): the PR is merged after `gh pr checks --watch`, `deploy critter-connect` runs, and the live smoke passes.

### Decision rules

- **Read-only, always.** Agents on this server connect to the live `phaser_june` as `postgres`, a superuser, so nothing in the role stops a write. So:
  - **Query files:** every query is a `.sql` file in the state folder's `queries/` that starts with `BEGIN TRANSACTION READ ONLY;` and `SET LOCAL statement_timeout = '30s';` and ends with `ROLLBACK;`. Run it with `./scripts/db -f <file>`, and save its output beside it.
  - **Never one argument:** `./scripts/db "<sql>"` becomes a single `psql -c`, which prints only the last result, the `ROLLBACK`.
  - **Allowed:** catalog queries (`pg_catalog`, `information_schema`), the `pg_stat_user_*` and `pg_statio_user_*` views, plain `EXPLAIN`, and row counts (`reltuples` or `n_live_tup` on big tables such as `iucn`).
  - **Never in a query file:** `COMMIT`, `END`, `SET TRANSACTION`, `\c` or `\!`. No admin functions: `pg_stat_reset*` (it would wipe the scan counters the findings rely on), `pg_terminate_backend`, `pg_reload_conf`, `set_config`. No `EXPLAIN ANALYZE`, and nothing that takes more than a read lock.
  - **A write becomes a proposal:** if any step seems to need a write, it becomes a proposal file and a line in the handoff item instead.
- **No secrets and no player data in files.** The repo (`kc0588615/phaser-june`) is public, and the plan and docs are committed to it.
  - Read roles from `pg_roles` only. Never query `pg_authid`, `pg_shadow`, `pg_user_mapping(s)`, `pg_subscription`, `pg_hba_file_rules`, `pg_stat_activity`, `pg_stat_ssl`, `pg_stat_replication` or `pg_stat_statements`. No IP addresses, password hashes or connection strings in any file.
  - M13 dropped the player tables. If any table about people turns up, record only its columns, types and counts, never rows or `pg_stats` value lists. Sample rows from content tables (species, clues, facts, sources) are fine.
- **The dev copy:** read it in a subshell that loads `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy` and first checks that `current_database()` is `phaser_june_dev` (`docs/DATABASE_ACCESS.md`). It's read-only too.
- **Where the files and the live database disagree, record it before you change anything:**
  - **The file is behind** (live has it, the file doesn't): update the file by hand, keeping its style. Never paste `pg_get_viewdef` output. The view SQL stays hand-written, as `tests/clueGame/content.test.ts` and `scripts/content.ts` expect.
  - **The file is ahead** (it has something live doesn't, for example because the production content build is Danby's and hasn't run): don't revert it. Make it a finding and a handoff line.
  - **The database is never the thing fixed.**
- **Keep what Danby keeps:** `habitat_colormap` and `oneearth.eco_sym_colors` stay (audit answer Q18). Don't propose dropping them. Propose a drop only for an object nothing reads, with the evidence (scan counters, `pg_depend`, a code search).
- **Proportional:** findings are verified problems, not style preferences. Rank by what could go wrong for players or for the next mission.
- **When in doubt, record it and keep going:** an open question goes under Decisions with the choice made, or into the handoff item. Never wait.

### Notes

- **Who does what.** The mission runs with `--skills db`, so every session has diagram-design.
  - **Architecture stage:** the mission session calls the **`db-designer`** subagent (ops `docs/missions.md`, "Skill packs"), which starts with diagram-design loaded and works read-only. Hand it this brief's Goal and Decision rules. It writes the plan's Data model section and `docs/DATABASE_SCHEMA.md`, the ERD sources and renders, and the proposals.
  - **The architect** can be brief, covering only the repo edits: `db/schema.sql`, the docs, the check query.
  - **Revision stage:** `db-designer` resolves the reviews' data-model items, and the architect the rest.
  - **Reviews:** the usual Fable and Astra reviews, then Gemini at the end (Definition of done). Neither Astra nor Gemini connects to the database; they read the query logs in `queries/`.
- **ERD size:** diagram-design's ER type allows 8 entities, and this schema has more (about 11 tables and views in the repo alone). So:
  - Draw with detail `faithful` (up to 24 nodes, zoned, for example by schema), or split into several diagrams above that.
  - `db-designer` sets the skill's four dials itself and never asks; the skill's Mermaid import otherwise says to ask once.
- **diagram-design profile:** the game has none, and the skill's first-time setup would ask questions and edit the installed plugin's shared `style-guide.md`. So `db-designer` doesn't run that setup. It makes a named profile instead:
  - `~/.diagram-design/profiles/critter-connect.md`, from `GUI.md` and the themes under `gui/` (fonts as references only);
  - the repo marker `.diagram-design` containing `profile: critter-connect`, as critwire has.

  It records its choices and never asks.
- **Starting points:**
  - `db/schema.sql`'s header lists what it leaves out: `iucn`, `oneearth.oneearth_bioregion`, `natural_earth.countries`, and `pgcrypto` from `init/01-extensions.sql`.
  - `AGENTS.md`'s "Database Access" and data lines, and `docs/DATABASE_ACCESS.md` (routes, the dev copy, credentials).
  - `deploy/db/app-role.sql`: the app role, `SELECT`-only since M13.
  - The code that reads the database: `src/lib/cluePool.ts`, `src/lib/places.ts`, `src/app/api/clue-game/range/route.ts`, `src/app/api/clue-game/ranges/route.ts`, `src/db/index.ts`, `scripts/content.ts`, `scripts/iucn.ts`, `scripts/clue-world-map.ts`, `scripts/import-natural-earth.mjs`, `scripts/connect.ts`.
- **Useful inventory queries** are in the db-retire brief (`/srv/critter-ai/agent-state/missions/briefs/2026-11-13-db-retire.md`):
  - the `aclexplode` grant query (use it, not `information_schema.role_table_grants`, which leaves out materialized views and sequences);
  - the `pg_stat_user_tables` scan counters;
  - the `pg_depend`/`pg_rewrite` dependents.

  M13 (2026-11-15) dropped `profiles` and `clue_match_solves` and updated `db/schema.sql`. Later missions, such as clue-data-dealer, edited it by hand, so drift is likely but unproven.
- **Read `origin/main`:** the agents' checkout `/srv/critter-ai/critter-connect` is behind it.
- **`pg_dump` here is version 16 and the server is 17,** so it can't dump the live database anyway. Catalog queries in query files are the only way in; don't use `tbls`, which bypasses the wrapper.
- **Release:** critter-connect releases wait for CI. This PR changes `db/schema.sql` and adds `.sql` and `.mmd` files, so CI runs (`.github/workflows/ci.yml`); its e2e job doesn't block the merge (Danby, 2026-11-14). `deploy critter-connect` redeploys the unchanged game.

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
