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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design (split into the three items below)
  - [x] Architecture A: `db-designer` maps the live and dev databases (query log), writes `docs/DATABASE_SCHEMA.md` (inventory), `db/analysis/schema-check.sql`, the plan's Data model section (summary, schema.sql drift, ranked findings) and `db/proposals/`
  - [x] Architecture B: `db-designer` makes the diagram-design profile and marker, the Mermaid ERDs in `docs/schema/` and their light/dark HTML+SVG renders, and embeds them in `docs/DATABASE_SCHEMA.md`
  - [x] Architecture C: `architect` writes the Architecture section for the repo edits (`db/schema.sql`, the docs, the check query)
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `0c0f064e` (branch `agent/cc-schema-map`, cut from `origin/main` `62c63c32`), 2026-11-26 ~09:00 UTC.

- Install: `node_modules` present, `npm ls --depth=0` clean; no reinstall needed. Migrate: n/a (no migration history; `db/schema.sql` is a hand-kept baseline and is never run).
- `npm run typecheck`: pass. `npm run lint`: pass (exit 0). `npm test`: 186/186 pass.
- `CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh`: 1563/1563 checks pass, seed 7. Artifact: `/srv/critter-ai/agent-state/missions/cc-schema-map/e2e-s0-baseline/` (`report.json`, screenshots, `run.log`).
- DB target: the worktree's `.env.local` `DATABASE_URL` is live `phaser_june` as `postgres` (its comment line still says "dev DB copy"; stale). The dev copy is reached only via `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy` (`critter_dev` / `phaser_june_dev`). The baseline e2e read live; the game writes nothing.

## Architecture

From `architect`, Architecture C, 2026-11-26. Repo edits only: `db/schema.sql`, the docs, the check query. DB facts come from the Data model below and the query log [NN]; no database was touched.

### Findings, ranked

| # | Rank | Where | Problem | Rule / bug | Fix |
|---|---|---|---|---|---|
| A1 | medium | `db/analysis/schema-check.sql:45-55` | `aclexplode(d.datacl)` and `aclexplode(f.proacl)` read a NULL ACL as "no grants". NULL means the default, which gives PUBLIC `CONNECT, TEMPORARY` on a database (`EXECUTE` on a function). The dev copy's `datacl` is NULL [01], so its check prints no database grant, and the [20]/[21] diff shows live with 2 extra grant lines when the copy in fact grants more | fail loud: a real privilege passes unseen; the drift evidence misleads | `aclexplode(coalesce(d.datacl, acldefault('d', d.datdba)))` and `aclexplode(coalesce(f.proacl, acldefault('f', f.proowner)))`. Relations and schemas default to owner-only, which `grantee <> owner` drops anyway: leave them |
| A2 | medium | `docs/DATABASE_SCHEMA.md:64, 97, 150, 155, 233, 304`; `db/proposals/02-drop-redundant-indexes.sql:51`; `db/proposals/04-drop-unused-extensions.sql:5` | cite `db/schema.sql` by line; the header edit below shifts every line after 13. Three sentences describe the file as behind and turn false once it's fixed: `DATABASE_SCHEMA.md:84` ("lists `species_id` second"), `:150` ("has neither the key nor the NOT NULLs"), `:262` ("header doesn't mention it") | stale refs: wrong docs | in the same step as the schema.sql edit: renumber every live `schema\.sql:` ref (older `plans/` are history: untouched); rewrite the 3 sentences to the new state |
| A3 | low | `db/schema.sql:82-83`, copied at `docs/DATABASE_SCHEMA.md:143` | `habitat_colormap` is "the habitat raster behind the globe's habitat pictures". No code draws habitat pictures (`git grep -i 'colormap\|habitat raster' -- src scripts`: nothing), nothing reads the table [22]; the owner keeps it for map legends (Q18, `plans/2026-11-15-db-retire.md:203`) | wrong fact | "Legend of the habitat raster: pixel value -> IUCN habitat class and kind (e.g. 106 = ...). Nothing reads it; the owner keeps it for map legends (audit Q18)." Same fact in both files |
| A4 | low | `db/analysis/schema-check.sql:6-7` vs `docs/DATABASE_SCHEMA.md:348` | the query says only owners differ by design; the doc says owners and database grants. After A1 the dev diff shows the database grants too | DRY: two copies of the expected diff, already disagreeing | the query's header names "owners and the database's grants" and points at `docs/DATABASE_SCHEMA.md#dev-copy-phaser_june_dev` for the rest |
| A5 | low | `docs/DATABASE_SCHEMA.md:345` | the dev-copy subshell's `. <file>` doesn't stop if the file fails to load. `scripts/db` then falls back to `.env.local` (live), so the "dev" output is live's: harmless (read-only), but the diff lies | fail fast | `. <file> \|\| exit 1; set +a; : "${DATABASE_URL:?dev-copy settings not loaded}"`, as `docs/DATABASE_ACCESS.md:255-256` does |
| A6 | low | `AGENTS.md:59-65` (Docs Map), `docs/DATABASE_ACCESS.md:312-320` (Related), `db/schema.sql:5-7` (change rule) | nothing points at the new map or the check, and the change rule ("apply, then edit this file") leaves `docs/DATABASE_SCHEMA.md` out. The next schema change drifts the map silently, the problem this mission clears | discoverability; drift | one Docs Map line, one Related line; the schema.sql change rule names the map and the check (every schema change already edits that file, so it's the one place) |

**Checked and fine:**
- `schema-check.sql` otherwise meets the Definition of done: `BEGIN TRANSACTION READ ONLY`, `SET LOCAL statement_timeout`, `ROLLBACK`; one sorted line per item (`ORDER BY section, object, pos, line`); columns by position with type, NOT NULL, default; `pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_viewdef` (views and matviews); `aclexplode` grants incl. matviews and sequences; stateless, so rerunnable. `-qAt` hides the command tags ([20] starts at `database ...`).
- Nothing reads `db/schema.sql` but `tests/clueGame/content.test.ts:27-52`, which pins view-SQL literals only (IDP, Lydekker, `NOT IN ('RUS', 'IDN')`, `presence IN (1, 2)` counts). `scripts/content.ts:45` only mentions it. No `SELECT *` or column-less `INSERT` on the content tables (`git grep`), so column order is cosmetic.
- CI's legacy-ORM grep (`.github/workflows/ci.yml:24`) covers `db/`: the new text must not trip it.

### Docs facts (question 2)

No database fact in the three docs is wrong; the only edits are A6's pointers. Each was checked:

| Doc:line | Fact | Evidence |
|---|---|---|
| `AGENTS.md:9`, `:18` | PostGIS on Hetzner via TLS PgBouncer; the app as `critter_app` straight to the container | [01] 17.5 / PostGIS 3.5.2; roles table [07] |
| `AGENTS.md:38` | VPS DB is live `phaser_june` | [01] `current_database`, `current_user = postgres` |
| `AGENTS.md:51`, `:55` | `clue_match_places` view; one client, raw SQL; baseline, no history; scripts via `connect.ts` except `scripts/db` and `import-natural-earth.mjs` | [02]; `content.ts`, `iucn.ts`, `clue-world-map.ts` import `connect` (grep) |
| `docs/CLUE_MATCH.md:67-69` | 4 content tables + 2 matviews, presence 1-2, Russia/IDN/France splits, basemaps from `natural_earth.countries` | [05]; `db/schema.sql`. It skips `habitat_colormap`, but says "the schema the app uses", which is true |
| `docs/DATABASE_ACCESS.md:4`, `:99` | server 17.5 | [01] |
| `docs/DATABASE_ACCESS.md:64`, `:184-192` | `DATABASE_URL` is `postgres`, a superuser; CI reads the copy as `critter_dev` | [07]; `ci.yml:74` |
| `docs/DATABASE_ACCESS.md:227-229` | `dev-role.sql` closes prod to PUBLIC | [01] live `datacl` has no PUBLIC `c` (its `T` is F6) |
| `docs/DATABASE_ACCESS.md:290-293` | player tables dropped, live and copy | [02][12] |

The stale "dev DB copy" comment is only in the uncommitted `.env.local` (committed: `.env.example`, `.env.vps.example`, `deploy/app.env.example`; none says it): not a repo edit.

### Data model check (question 4)

- `docs/DATABASE_SCHEMA.md` repeats the columns, keys and indexes `db/schema.sql` holds (and the `.mmd` and 4 renders again). Acceptable: the brief requires the map, it is dated ("as it was on 2026-11-26") and query-cited, and A6's change rule plus the rerunnable check are the drift guard. Not acceptable: line refs and "file is behind" sentences this mission itself makes false (A2).
- "Extensions: list them, or what stays after P04": list live today. The proposals aren't applied.
- The rest holds for the repo edits: [20] lines 50-51 and 147 (`habitat_colormap`), 111-126 (`species`), 127-136 (clues), [01] (extensions).

### Target design (questions 1, 3, 5)

Edits in order; each step's check beside it. View SQL is never touched; no `pg_get_viewdef` text goes in any file.

1. **`db/analysis/schema-check.sql`**: A1 (two `coalesce(..., acldefault(...))`) and A4 (header). Check: rerun it, the committed file plus a `current_database()` guard, as `queries/25-live-schema-check.sql` and `26-dev-schema-check.sql` (read-only, as 20/21). Expect 25 = [20] byte for byte; 26 = [21] plus `grant database to PUBLIC CONNECT,TEMPORARY`.
2. **`db/schema.sql`**, every "file behind" item fixed by hand, in the file's style:
   - Header: keep lines 1-3 (hand-kept baseline, not a migration history). Change rule: "...then edit this file and the map docs/DATABASE_SCHEMA.md to match; db/analysis/schema-check.sql prints the live definitions to compare." After the "Also needed" list: "Kept though nothing reads it (owner, audit Q18), like habitat_colormap below: oneearth.eco_sym_colors, the bioregions' legend colors." Extensions line becomes: "Extensions, as live has them (2026-11-26): postgis; pg_stat_statements (monitoring); pgcrypto and uuid-ossp, which no SQL in the repo calls; init/01-extensions.sql installs all four. plpgsql is built in."
   - `species`: move `created_at`, `updated_at` to follow `conservation_code` (live order [20]:111-126).
   - `species_deduction_clues`: move `species_id` (with its inline FK) to follow `created_at` (live order [20]:127-136). Constraint names don't depend on position.
   - `habitat_colormap`: `value integer PRIMARY KEY, label text NOT NULL` (live `habitat_colormap_pkey`, the default name [20]:147); its comment per A3.
   - Check: `npm test` (content.test.ts); `git diff db/schema.sql` has no hunk from `-- Range maps` down; CI's legacy-ORM grep (`ci.yml:24`) empty; read each object against [25]: all 12 now "matches".
3. **`docs/DATABASE_SCHEMA.md`**: A2 (renumber refs, rewrite `:84`, `:150`, `:262`), A3 (`:143`), A5 (`:345`), and cite [25]/[26] where it cites [20]/[21] (`:313`). Check: every `schema\.sql:N` ref read against the edited file.
4. **`db/proposals/02-drop-redundant-indexes.sql:51`, `04-drop-unused-extensions.sql:5`**: A2 refs (04: "db/schema.sql's header says so"). Comments only. Check: read.
5. **`AGENTS.md`** Docs Map: "`docs/DATABASE_SCHEMA.md`: the live database's objects, readers, roles, grants and dev-copy drift; ERD `docs/schema/`; check `db/analysis/schema-check.sql`." **`docs/DATABASE_ACCESS.md`** Related: the same pointer, one line. Check: read.
6. **Final:** `npm run typecheck`, `npm run lint`, `npm test`, then `CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh` once.

No change to `src/`, `scripts/`, `db/content/`, `init/` or `deploy/`.

### Rejected alternatives

- Header note on column order instead of reordering: leaves 2 permanent "differs" for every later check to explain. The reorder moves 3 lines, and nothing depends on order.
- Header lists the extensions left after P04: P04 isn't applied, and the file describes live.
- `CREATE TABLE oneearth.eco_sym_colors` in the file: it's imported with `oneearth`, like `oneearth_bioregion`. The brief asks only to name it as kept.
- Object-name refs instead of renumbering `db/schema.sql:N`: the map uses `file:line` throughout. Renumber once.
- `COLLATE "C"` in the check's `ORDER BY`: both databases share one server and `en_US.utf8` [01], and the two outputs are compared in the same run.
- `acldefault` for relations and schemas too: their default is owner-only, which the owner filter drops. No output change.
- A pointer in `docs/CLUE_MATCH.md`: it has no wrong DB fact, and AGENTS.md's Docs Map is the index.
- Updating line refs in older `plans/`: they're history.

## Data model

From `db-designer`, Architecture A, 2026-11-26. The full map is in `docs/DATABASE_SCHEMA.md`.

**Query log:** `/srv/critter-ai/agent-state/missions/cc-schema-map/queries/`, written [NN] below. Each `.sql` sits beside its `.out`:

- live: 01–10, 20, 22, 24;
- dev copy: 11–19, 21 and 23, each the matching live file with only its guard changed.

Every file opens `BEGIN TRANSACTION READ ONLY` with a 30 s timeout, ends `ROLLBACK`, and checks `current_database()` first. Nothing was written to either database.

### Map in brief

- **Server:** live `phaser_june` runs PostgreSQL 17.5 with PostGIS 3.5.2 and is 167 MB [01].
- **Objects:**
  - 3 schemas: `public`, `oneearth`, `natural_earth`;
  - 9 tables, 2 materialized views and 5 serial sequences;
  - no functions, triggers, policies or types of the project's own [06].
- **Rows** [08]:
  - content: `species` 76, `species_deduction_clues` 3,653, `species_facts` 491, `content_sources` 16;
  - kept legends: `habitat_colormap` 82, `oneearth.eco_sym_colors` 118;
  - imported sources: `iucn` 202 polygons for 76 species, `natural_earth.countries` 258, `oneearth.oneearth_bioregion` 827;
  - views: `clue_match_ranges` 76, `clue_match_places` 5 (continents only).
- **Readers:** the game sends only the SELECTs in `src/lib/cluePool.ts:13-22`, `src/lib/places.ts:13-36` and the two range routes. All of them plan cheaply [10]. Scripts (`content`, `iucn`, `clue:world-map`, the Natural Earth import) run as `postgres`.
- **Roles** [07]:
  - `postgres`, a superuser: agents and scripts;
  - `critter_app`: SELECT on exactly the six relations `deploy/db/app-role.sql:26` names, 15 s timeout;
  - `critter_dev`: owns the dev copy, 60 s timeout.
- **Integrity** [08][22]: every check passes. There are no orphans (`iucn` and `species`, bioregions and colors), the sequences equal `max(id)`, both views agree with their sources, and every clue and fact id follows the rule species id × 100 + position.
- **Dev copy:**
  - Same as live: schema (definitions, constraints, indexes, view md5s [13]–[15]), grants to `critter_app` [17], and content (row hashes of every table [09][19]).
  - Different only in:
    - owners (`critter_dev`, by design);
    - its database ACL (the default, so PUBLIC has CONNECT and TEMP);
    - column numbers (the restore compacted them);
    - the views' shapes, at vertex level only: 7 of 76 ranges and 4 of 5 outlines. Ids, bounding boxes, points and areas are equal.

### `db/schema.sql` against live

From the schema check [20], read against the file object by object. The view SQL was compared with `pg_get_viewdef` [05].

| Object | Result | Direction, and what the later step does |
|---|---|---|
| Header: the "Also needed" list (`iucn`, `oneearth.oneearth_bioregion`, `natural_earth.countries`) | matches | |
| Header: the "Extensions:" line | differs. It names `postgis` and notes `pgcrypto`. Live also has `uuid-ossp` 1.1 and `pg_stat_statements` 1.11, all in `public` [01] | file behind: list them, or what stays after P04 |
| Header: `oneearth.eco_sym_colors` | differs. Live has it (kept by the owner, unread); the file never mentions it | file behind: name it as kept, beside `habitat_colormap` |
| `content_sources` | matches: columns, PK, `UNIQUE (key)`, the tier CHECK, auto names | |
| `species` | differs in column order only: live puts `created_at`, `updated_at` after `conservation_code` [03]. Types, nulls, defaults and keys match | file behind, cosmetic: follow live's order, or say in the header that order may differ |
| `species_deduction_clues` | differs in column order only. Live: `id, category, label, compare_tags, reveal_order, is_filtering, created_at, species_id, source_key, source_url`. The CHECK, both FKs and all 4 indexes match | file behind, cosmetic: as `species` |
| `species_facts` | matches: columns in order, UNIQUE, both FKs, 2 indexes | |
| `habitat_colormap` | differs. Live has `value integer NOT NULL` with `habitat_colormap_pkey PRIMARY KEY (value)`, and `label text NOT NULL` [04]. The file has bare `value integer, label text` | file behind: add the key and the NOT NULLs |
| `clue_match_ranges` | matches: definition, and the unique index `clue_match_ranges_species_id` | |
| `clue_match_places` | matches: definition (the Russia, France, IDN and IDP branches; continents only), and the unique index `clue_match_places_key` | |
| The grant `DO` block | matches: `critter_app` has SELECT on both views | |
| Serial sequences | match: 5, each owned by its column | |

**Result:** 12 objects; 7 match and 5 differ.

- All 5 are "file behind": 3 substantive (`habitat_colormap`'s key and NOT NULLs, the extension list, `eco_sym_colors`) and 2 cosmetic (column order).
- Nothing is "file ahead", so no drift line goes in the handoff.
- `deploy/db/app-role.sql` also matches live: SELECT on the 6 relations, `USAGE` on `public`, `CONNECT`, the 15 s timeout.

### Findings, ranked

| # | Rank | Object | Evidence | What goes wrong | Fix | Proposal |
|---|---|---|---|---|---|---|
| F1 | medium | role `postgres` as every agent's and script's login | [01] `current_user = postgres`; [07] `rolsuper`, `rolbypassrls` | Only the query file's READ ONLY wrapper keeps a read-only task read-only. One slip (a bare `-c`, a wrong file) can change or drop what players read | A read-only login role for read-only work (`pg_read_all_data`, `default_transaction_read_only`, 30 s). Writes keep `postgres` (owner, 2026-11-01) | `db/proposals/01-read-only-agent-role.sql` |
| F2 | low, next content mission | clue and fact ids, species id × 100 + position (`src/clueGame/profiles.ts:430`, `:442`) | [22]: at most 79 clues for one species; no off-scheme id | A profile's 101st clue takes the next species' first id. `content -- build` then fails ("cannot affect row a second time"), or fails later when that species arrives. Players see nothing; the content mission is blocked | Code, not the database: a wider multiplier. The build deletes all clues and facts first, and nothing outside the database stores their ids (journal, saved game) | none (code; a later mission) |
| F3 | low | `species.created_at`, `species.updated_at`, `species_deduction_clues.created_at` | [08]: 48 of 76 rows have `updated_at = created_at`, the newest 2026-09-30, though [02] shows 962 updates through 2026-11-24. No trigger [06]. Nothing reads them (code search) | A reader trusting `updated_at` gets wrong dates. The clues' `created_at` only means "last build" | Drop all three; git history of `db/content/` is the record | `db/proposals/03-drop-unread-timestamps.sql` |
| F4 | low | `ix_deduction_clues_species`, `ix_deduction_clues_category`, `ix_species_facts_species`, `ix_species_facts_category` | [04]: each is a leading part of a unique index on the same table; idx_scan 87, 2, 4, 0, with counters never reset [01] | Every build re-inserts all 4,144 rows and maintains 4 useless btrees. No effect on players | Drop them; the unique indexes serve the same lookups and the FK cascade | `db/proposals/02-drop-redundant-indexes.sql` |
| F5 | low | extensions `pgcrypto`, `uuid-ossp` | [22]: 0 outside dependents; [24]: 46 functions `critter_app` can execute; no SQL in the repo calls them | Dead surface in `public`, and a misleading picture of what the app needs | `DROP EXTENSION ... RESTRICT`. `init/01-extensions.sql` loses the two lines in the same later change. Ask the owner about outside tools first | `db/proposals/04-drop-unused-extensions.sql` |
| F6 | low | PUBLIC's `TEMPORARY` on `phaser_june` | [01] datacl `=T/postgres`; [07] `has_database_privilege(critter_app, TEMP) = t` | The SELECT-only app role (M13) can still create temporary tables, and so fill disk through a bug in the app's SQL | `REVOKE TEMPORARY ... FROM PUBLIC`; `deploy/db/app-role.sql` carries it afterwards | `db/proposals/05-revoke-public-temp.sql` |

**Areas checked and fine:**

- **Keys:** every table has a primary key.
  - The content tables' foreign keys cascade from `species` and point at `content_sources(key)`.
  - `species.iucn_id` → `iucn.id_no` can't be a foreign key, because there are several polygons per species. Its integrity was checked in [08] instead.
  - Both views have the unique index that `REFRESH ... CONCURRENTLY` needs.
- **Constraints and nullability:** the NOT NULLs match what the build writes. `species_facts.category` has no CHECK, but the build allows only six values, and only those six occur [08].
- **Types:** `iucn`'s numeric(65,30) columns, from ogr2ogr, join `species.iucn_id` through an implicit cast: a hash join at 202 rows [10]. They are left alone, because `scripts/iucn.ts` copies the columns by name.
- **Spatial:**
  - all three sources are typed 4326 geometries with GiST indexes [03][04], and every `iucn` row is a 4326 MultiPolygon [08];
  - areas use `::geography` casts;
  - the one note: `clue_match_places.outline` is untyped, so `geometry_columns` reports SRID 0 (the values are 4326) and QGIS must be told the CRS. Cast it if the view is ever rebuilt; no proposal.
- **Indexes:** none missing for the game's queries [10]. There is no `iucn(id_no)` index; at 202 rows a scan is cheaper.
- **Naming:** mixed `ix_`, `uq_` and automatic names. Harmless; left alone.
- **Grants:** `critter_app` is SELECT-only on exactly its six relations, in both databases, with nothing on the sequences or the import schemas [07][17].
- **Dead objects:** no code reads `habitat_colormap` or `eco_sym_colors` (their latest scans are the nightly dump's [02]), but the owner keeps them (Q18), so they stay. `pg_stat_statements` stays for monitoring.
- **Statistics:** every table has planner statistics [08].

### Target design

- **After the proposals:** the same 11 relations.
  - `species` drops `created_at` and `updated_at`, and the clues drop `created_at` (P03).
  - The clues and facts keep their primary key, unique and GIN indexes, without the 4 prefix indexes (P02).
  - Extensions: `postgis`, `pg_stat_statements`, `plpgsql` (P04).
  - Roles: plus `critter_reader` for read-only agent work (P01).
  - PUBLIC loses TEMP on `phaser_june` (P05).
- **Code:** reads and writes don't change. No query in `src/` or `scripts/` names a dropped object. The build's upsert lists only profile columns, and the views use only `species.id` and `iucn_id` and the clues' `species_id`. F2's fix is a code change for a later mission.
- **How each applied proposal runs:**
  1. On the dev copy first (CI's e2e reads it), except P01 and P05, which are for live only.
  2. Live, after a fresh dump.
  3. Then the files: `db/schema.sql`, and `init/` and `deploy/db/app-role.sql` where the proposal names them.
- **For unit B's ERD:** `docs/DATABASE_SCHEMA.md#relationships` lists 11 entities in 4 zones (content 5, ranges and places 3, `natural_earth` 1, `oneearth` 2), with 4 foreign keys and 4 logical links. Detail `faithful` fits.

**Handoff lines for the lead's item** (`Blocks: nothing`):

- **P01** read-only agent role. Risk: none (catalog only). Needs the owner to set a password and a new env file. Recommended.
- **P02** drop 4 redundant indexes. Risk: a lock of milliseconds on the clues and facts tables. Recommended with the next schema change.
- **P03** drop 3 unread timestamp columns. Risk: a lock of milliseconds; their values are lost (unread, partly wrong); dump first. Recommended.
- **P04** drop `pgcrypto` and `uuid-ossp`. Risk: none in the repo. Recommended only if no outside tool of the owner's calls them.
- **P05** revoke PUBLIC TEMP on `phaser_june`. Risk: none. Recommended; it completes M13's read-only app role.
- **F2** is a code change: widen the clue-id rule before any animal passes 100 clues (the top today is 79).

### ERD (Architecture B)

From `db-designer`, 2026-11-26.

- **Files** in `docs/schema/`:
  - `phaser-june.mmd`, the source of truth: a Mermaid `erDiagram` with 11 entities and all 118 columns, with types and keys. Foreign keys are solid lines, logical joins dotted.
  - `phaser-june.html` and `phaser-june-dark.html`, exported to `phaser-june.svg` and `phaser-june-dark.svg`.
  - `docs/DATABASE_SCHEMA.md#diagrams` links all of them and embeds the light SVG.
- **Dials** (set without asking):
  - ER type, detail `faithful`: the map's 4 zones, 11 nodes, 8 edges, one diagram;
  - size `fit`, 960×928, so GitHub shows it near 1:1;
  - audience `engineer`;
  - format HTML, with SVG from the skill's `export_svg.py --system-fonts`;
  - focal: `species` only.
- **Profile:** `~/.diagram-design/profiles/critter-connect.md`, from the cc tokens with `globals.css`'s AA overrides. Fonts are named only (font source `system`), and the contrast contract passes in both skins. The repo marker `.diagram-design` names it. No plugin file was touched.
- **Choices:**
  - Boxes show keys, join, geometry and CHECK columns, and count the rest. The `.mmd` has every column.
  - Entities use bare table names; the zones carry the schemas.
  - Spatial joins aren't drawn, because they have no key.
- **Checks:**
  - The extractor gives 11 entities, 8 edges and 118 columns, equal to [03] and to the map's tables and relationships.
  - `self_check.py --offline` passes.
  - Both SVGs parse as XML and render standalone in headless Chrome, as does an `<img>` embed.
  - No Mermaid parser is installed, so the `.mmd` was checked against Mermaid's documented grammar only.
- **Map fixed:**
  - `iucn.yrcompiled`, `generalisd`, `shape_leng` and `shape_area` are numeric(65,30) [03]; the map said plain numeric.
  - The ranges link is "zero or one to one".
- **Keeping light and dark in sync:** the renders are hand-drawn HTML, not generated from the `.mmd`. db-designer's generator script is kept outside the repo at `/srv/critter-ai/agent-state/missions/cc-schema-map/erd-build/build.py`.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. `docs/schema/phaser-june.mmd` doesn't parse: line 5 is a bare `%%`. Mermaid strips comments with `/^\s*%%(?!{)[^\n]+\n?/gm`, which needs a character after `%%`, so that line survives ahead of `erDiagram`: `Parse error on line 1 ... Expecting 'ER_DIAGRAM', got '%'` (Mermaid 12.2.0, `mermaid.parse()` from Node). With line 5 deleted it parses: 11 entities, 118 columns, 8 links, keys as the map has them. Delete the line, and make the Verification parse the `.mmd` with a real Mermaid (Architecture B checked it "against the documented grammar only"): a read-only import of `/srv/apps/critwire/node_modules/.pnpm/mermaid@12.2.0/node_modules/mermaid/dist/mermaid.core.mjs` works, or GitHub's view of the pushed file.
2. Target design step 2, `species_deduction_clues`: moving only `species_id` to follow `created_at` gives `..., is_filtering, source_key, source_url, created_at, species_id`. Live is `..., is_filtering, created_at, species_id, source_key, source_url` ([20]:127-136). It takes two moves: `created_at` to follow `is_filtering`, then `species_id` after it (4 lines reordered in the file, not 3). As written the object still "differs" and "all 12 now matches" fails. `species` is right as written.
3. Two logical links contradict the map's own rule, "cardinality is what the schema allows" (`docs/DATABASE_SCHEMA.md:266`): `iucn.id_no` and `oneearth_bioregion.eco_sym` are nullable with no foreign key ([20]:53, :109), so their parent side is zero or one, as `source_key`'s is drawn. Today's data has no NULLs [08], which belongs in the Notes column. Fix `.mmd:196` and `:199` (`||..o{` to `|o..o{`), the rows at `DATABASE_SCHEMA.md:274` and `:277` ("many to one, optional"), and the `1` label on those two edges in all four renders.

MISSED:
- `docs/DATABASE_SCHEMA.md:309` says there are no function grants. That is A1's misreading again: [07] explodes `proacl`, and NULL means the default, so PUBLIC holds EXECUTE on every function (`:286` and F5 say so for the 46). Reword: no explicit function grants; PUBLIC keeps the default EXECUTE.
- `AGENTS.md:55` repeats the change rule A6 edits in `db/schema.sql:5-7` ("change the DB, then update the file"). After A6 the two copies disagree. Edit both in the same step.
- The plan's "Statistics: every table has planner statistics [08]" is wrong for `clue_match_places` (0 of 12 columns, [08]). Harmless at 5 rows; don't carry the sentence into the Summary.

SHOULD-CONSIDER:
1. Cite `db/schema.sql` by object, not line, in the 8 map refs and 2 proposal refs (A2). P02 and P03 shift the lines again when applied, and the map's line 6 says its `file:line` refs are at `62c63c32`, which the renumbered ones won't be. Code refs keep `file:line`.
2. Record A6 under Decisions: the Docs Map and Related pointers go past the brief's "change those facts only".
3. P01's header: load the read-only settings file with A5's fail-fast pattern. `scripts/db` falls back to `.env.local` (`postgres`) when the file doesn't load, so the role protects nothing if the loader fails silently.
4. P04 runs as `postgres` on the dev copy, and no settings file here gives that login: say in its header how the later mission connects.
5. Nothing else to cut: findings F1-F6 and A1-A6 are real and fairly ranked, every cited `file:line` checks out, the query log is read-only throughout, and no draft breaks the game or CI (`load()` lists its columns, `scripts/content.ts:28-37`; no code names a dropped object).

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. P02–P04 accept either database as their target, and `scripts/db` defaults to production. A dev rehearsal can therefore drop production columns, indexes, or extensions before the required backup. Require each run to name its expected database and abort on mismatch before any DDL.
2. P01 grants `pg_read_all_data` across the cluster. The proposed live reader can also read the dev copy, where PUBLIC has `CONNECT`. Scope its grants to the required live objects and verify the effective access before enabling login. [PostgreSQL 17 predefined roles](https://www.postgresql.org/docs/17/predefined-roles.html)
3. A1 still leaves the repeatable grants check blind to role memberships, column grants, and extension-function privileges, including the 46 functions cited in F5. Include those privileges so a clean comparison can support the map’s access claims.
4. The ERD source fails to parse, yet its independent HTML/SVG renders pass verification. Require a successful Mermaid parse and agreement on relationship cardinality. Both `iucn.id_no` and `oneearth_bioregion.eco_sym` permit an unmatched parent.
5. Step 2 leaves `species_deduction_clues` out of live column order. Use the recorded suffix `is_filtering, created_at, species_id, source_key, source_url` before declaring baseline parity.

SHOULD-CONSIDER:

1. Give P03 a rollback that restores the saved timestamps by row ID. Its current rollback assigns the recovery time to every existing row.
2. Recheck the reviewed revision before merge. This review covers `agent/cc-schema-map` at `0a5defb6`. Remote freshness was unverified.

## Revision notes

## Steps

## Verification

## Code review (Astra)


## Release

## Decisions

## Log

- 2026-11-26 09:05 UTC · Baseline: typecheck, lint, 186/186 unit, e2e:fresh 1563/1563 pass; artifact `e2e-s0-baseline/`.
- 2026-11-26 09:50 UTC · Architecture A: split stage into A/B/C; db-designer mapped live+dev (24 read-only query files in `queries/`), wrote `docs/DATABASE_SCHEMA.md`, `db/analysis/schema-check.sql`, Data model (12 schema.sql objects: 7 match, 5 file-behind; F1 medium + F2–F6 low), `db/proposals/01`–`05`. Query files checked (wrapper, no writes); typecheck, lint, 186/186 unit pass.
- 2026-11-26 09:55 UTC · Architecture B: db-designer added the profile `~/.diagram-design/profiles/critter-connect.md`, the `.diagram-design` marker, `docs/schema/phaser-june.mmd` (11 entities, 118 cols, 8 links) and light/dark HTML+SVG renders, embedded in `DATABASE_SCHEMA.md` (fixed iucn numeric(65,30) and ranges cardinality). SVGs parse, light render checked by eye in headless Chrome; typecheck, lint pass.
- 2026-11-26 10:10 UTC · Architecture C: architect wrote Architecture (A1–A2 medium: check query misses default ACLs; stale schema.sql line refs; A3–A6 low), docs DB facts all verified correct (pointers only), target design: 6 ordered edits. Plan-only change; no DB access.
- 2026-11-26 10:25 UTC · Fable review: APPROVE WITH CHANGES, 3 MUST-FIX (.mmd bare `%%` breaks Mermaid parse; species_deduction_clues column order needs two moves; iucn/oneearth logical links should be zero-or-one). Plan-only change.
- 2026-11-26 10:12 UTC · Astra review: APPROVE_WITH_CHANGES, 5 MUST-FIX (proposals must assert target DB before DDL; P01 grants too broad, scope off pg_read_all_data; check query misses memberships/column/function grants; Mermaid parse + cardinality; deduction-clues column order), 2 SHOULD-CONSIDER. Plan-only change.

## Summary
