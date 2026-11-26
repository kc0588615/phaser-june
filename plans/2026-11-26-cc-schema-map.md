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
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

From `0c0f064e` (branch `agent/cc-schema-map`, cut from `origin/main` `62c63c32`), 2026-11-26 ~09:00 UTC.

- Install: `node_modules` present, `npm ls --depth=0` clean; no reinstall needed. Migrate: n/a (no migration history; `db/schema.sql` is a hand-kept baseline and is never run).
- `npm run typecheck`: pass. `npm run lint`: pass (exit 0). `npm test`: 186/186 pass.
- `CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh`: 1563/1563 checks pass, seed 7. Artifact: `/srv/critter-ai/agent-state/missions/cc-schema-map/e2e-s0-baseline/` (`report.json`, screenshots, `run.log`).
- DB target: the worktree's `.env.local` `DATABASE_URL` is live `phaser_june` as `postgres` (its comment line still says "dev DB copy"; stale). The dev copy is reached only via `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy` (`critter_dev` / `phaser_june_dev`). The baseline e2e read live; the game writes nothing.

## Architecture

From `architect`, Architecture C, 2026-11-26; revised after both reviews (Revision notes, "Architecture revision"). Repo edits only: `db/schema.sql`, the docs, the check query. DB facts come from the Data model below and the query log [NN]; no database was touched.

### Findings, ranked

| # | Rank | Where | Problem | Rule / bug | Fix |
|---|---|---|---|---|---|
| A1 | medium | `db/analysis/schema-check.sql:13-55` | (a) `aclexplode(d.datacl)` and `aclexplode(f.proacl)` read a NULL ACL as "no grants". NULL means the default, which gives PUBLIC `CONNECT, TEMPORARY` on a database (`EXECUTE` on a function). The dev copy's `datacl` is NULL [01], so its check prints no database grant, and the [20]/[21] diff shows live with 2 extra grant lines when the copy in fact grants more. (b) It never reads role memberships (`pg_auth_members`) or column grants (`pg_attribute.attacl`), and `rel`/`fn` drop every extension member (`deptype = 'e'`, lines 20, 31), so PUBLIC's EXECUTE on the 46 `pgcrypto`/`uuid-ossp` functions F5 cites [24] and its SELECT on 5 PostGIS/`pg_stat_statements` relations [07] never print. A clean run can't back the map's access claims (Astra MUST-FIX 3) | fail loud: real privileges pass unseen; the drift evidence misleads | (a) `aclexplode(coalesce(d.datacl, acldefault('d', d.datdba)))` and `aclexplode(coalesce(f.proacl, acldefault('f', f.proowner)))`. Relations and schemas default to owner-only, which `grantee <> owner` drops anyway: leave them. (b) memberships, column grants and per-extension sums in the same `grants` CTE (target design step 1) |
| A2 | medium | `docs/DATABASE_SCHEMA.md:64, 97, 150, 155, 233, 304`; `db/proposals/02-drop-redundant-indexes.sql:51`; `db/proposals/04-drop-unused-extensions.sql:5` | cite `db/schema.sql` by line; the header edit below shifts every line after 13, and P02/P03 shift them again when applied. The map pins its `file:line` refs to `62c63c32` (`DATABASE_SCHEMA.md:6`), which renumbered refs wouldn't be. Three sentences describe the file as behind and turn false once it's fixed: `#species_deduction_clues` ("lists `species_id` second"), `#habitat_colormap` ("has neither the key nor the NOT NULLs"), `#oneeartheco_sym_colors` ("header doesn't mention it") | stale refs: wrong docs | after the schema.sql edit: cite `db/schema.sql` by object, not line, in every ref outside `plans/` (history: untouched); code refs keep `file:line`. Rewrite the 3 sentences to the new state (Fable SC1) |
| A3 | low | `db/schema.sql:82-83`, copied at `docs/DATABASE_SCHEMA.md:143` | `habitat_colormap` is "the habitat raster behind the globe's habitat pictures". No code draws habitat pictures (`git grep -i 'colormap\|habitat raster' -- src scripts`: nothing), nothing reads the table [22]; the owner keeps it for map legends (Q18, `plans/2026-11-15-db-retire.md:203`) | wrong fact | "Legend of the habitat raster: pixel value -> IUCN habitat class and kind (e.g. 106 = ...). Nothing reads it; the owner keeps it for map legends (audit Q18)." Same fact in both files |
| A4 | low | `db/analysis/schema-check.sql:6-7` vs `docs/DATABASE_SCHEMA.md:348` | the query says only owners differ by design; the doc says owners and database grants. After A1 the dev diff shows the database grants too | DRY: two copies of the expected diff, already disagreeing | the query's header names "owners and the database's grants" and points at `docs/DATABASE_SCHEMA.md#dev-copy-phaser_june_dev` for the rest |
| A5 | low | `docs/DATABASE_SCHEMA.md:345` | the dev-copy subshell's `. <file>` doesn't stop if the file fails to load. `scripts/db` then falls back to `.env.local` (live), so the "dev" output is live's: harmless (read-only), but the diff lies | fail fast | `. <file> \|\| exit 1; set +a; : "${DATABASE_URL:?dev-copy settings not loaded}"`, as `docs/DATABASE_ACCESS.md:255-256` does |
| A6 | low | `AGENTS.md:59-65` (Docs Map), `docs/DATABASE_ACCESS.md:312-320` (Related), the change rule in `db/schema.sql:5-7` and its copy at `AGENTS.md:55` ("change the DB, then update the file") | nothing points at the new map or the check, and the change rule leaves `docs/DATABASE_SCHEMA.md` out. The next schema change drifts the map silently, the problem this mission clears | discoverability; drift; DRY (two copies of the rule must not disagree) | one Docs Map line, one Related line; both copies of the change rule name the map and the check, in the same words (Fable MISSED 2). Goes past "change those facts only": a Decision |

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

1. **`db/analysis/schema-check.sql`**: A1 and A4. Every addition goes in the `grants` CTE, so it prints as section 12's sorted one-line `grant <object> to <grantee> <privileges>`, owner dropped, and section 13 prints any new grantee's role line by itself:
   - (a) the two `coalesce(..., acldefault('d' | 'f', <owner>))`.
   - (b) **Memberships:** `pg_auth_members`, names via `pg_get_userbyid` as now, members not `pg_*` (built-in nesting is noise; a `pg_*` role granted to ours, e.g. P01's, still prints). `grant role <role> to <member> <options>`: the true ones of `ADMIN`, `INHERIT`, `SET` (PG 16+ columns; both servers are 17 [01]), or `MEMBER` if none; `DISTINCT`, since one pair can have several grantors.
   - (c) **Column grants:** `aclexplode(a.attacl)` over the `rel` relations' columns (NULL `attacl` means none): `grant <relation>.<column> to <grantee> <privileges>`.
   - (d) **Extension members, summed:** for each extension (`pg_depend` `deptype = 'e'`, any schema), its functions (`coalesce(proacl, acldefault('f', proowner))`) and relations (`relacl`), exploded and grouped by extension, kind, grantee and privileges: `grant extension <ext> functions|relations to <grantee> <privileges> <k> of <n>`, `n` that kind's member count. 7 lines instead of ~830 (PostGIS alone has 776 functions [24]); a partial revoke shows as `k < n`, a direct grant to `critter_app` as its own grantee line. `rel` and `fn` keep excluding members, so no definitions are added.
   - Header: A4; lines 9-10 say extension members are summed in the grant section, not listed.
   - Held: catalog reads only (`pg_auth_members` holds only oids and options; no `pg_authid`, no new role name or secret in the file); stateless, so rerunnable; same sort.
   - Check: rerun it, the committed file plus a `current_database()` guard, as `queries/25-live-schema-check.sql` and `26-dev-schema-check.sql` (read-only, as 20/21). Expect:
     - 25 = [20] plus the 7 extension lines. Memberships, column grants and own functions print nothing: [07]/[17] have 0 memberships and 0 `attacl`, [06]/[16] no own functions.
     - 26 = [21] plus the same 7 lines and `grant database to PUBLIC CONNECT,TEMPORARY`. `diff 25 26`: owners and the database's grants only.
     - The 7, as `grant extension ...`: `pgcrypto functions to PUBLIC EXECUTE 36 of 36` and `uuid-ossp functions ... 10 of 10` (the 46 of [24]); `postgis relations to PUBLIC SELECT 3 of 3` and `pg_stat_statements relations ... 2 of 2` ([07]). Not yet logged, expected from default ACLs: `postgis functions ... 776 of 776`, `plpgsql functions ... 3 of 3`, and `pg_stat_statements functions ... 2 of 3` (its install script revokes `pg_stat_statements_reset` from PUBLIC). Write the real lines into the map's `#roles-and-grants`; a count that differs is a fact to record, never a reason to bend the query.
2. **`db/schema.sql`**, every "file behind" item fixed by hand, in the file's style:
   - Header: keep lines 1-3 (hand-kept baseline, not a migration history). Change rule, same words as `AGENTS.md`'s copy (step 5): "...then edit this file and the map docs/DATABASE_SCHEMA.md to match; db/analysis/schema-check.sql prints the live definitions to compare." After the "Also needed" list: "Kept though nothing reads it (owner, audit Q18), like habitat_colormap below: oneearth.eco_sym_colors, the bioregions' legend colors." Extensions line becomes: "Extensions, as live has them (2026-11-26): postgis; pg_stat_statements (monitoring); pgcrypto and uuid-ossp, which no SQL in the repo calls; init/01-extensions.sql installs all four. plpgsql is built in."
   - `species`: move `created_at`, `updated_at` to follow `conservation_code` (live order [20]:111-126).
   - `species_deduction_clues`, two moves: `created_at` up to follow `is_filtering`, then `species_id` (with its inline FK) to follow `created_at`. Result, live's order [20]:127-136: `id, category, label, compare_tags, reveal_order, is_filtering, created_at, species_id, source_key, source_url`; `source_url` is now the last line (no comma). Constraint names don't depend on position (`species_deduction_clues_species_id_fkey` stays).
   - `habitat_colormap`: `value integer PRIMARY KEY, label text NOT NULL` (live `habitat_colormap_pkey`, the default name [20]:147); its comment per A3.
   - Check: `npm test` (content.test.ts); `git diff db/schema.sql` has no hunk from `-- Range maps` down; CI's legacy-ORM grep (`ci.yml:24`) empty; read the `species` and clues column lists name by name against [25]'s `column species 01-16` and `column species_deduction_clues 01-10`, then every other object against [25]: all 12 now "matches".
3. **`docs/DATABASE_SCHEMA.md`** (sections by anchor; db-designer's revision moves its lines):
   - A2: every `db/schema.sql:N` ref cited by object, e.g. "`clue_match_ranges` and `clue_match_places` in `db/schema.sql`, their `ranges` step", "their `playable` step", "`clue_match_places`' `country_parts` step", "`db/schema.sql`'s closing grant `DO` block". Rewrite the 3 "file behind" sentences (`#species_deduction_clues`, `#habitat_colormap`, `#oneeartheco_sym_colors`) to the new state.
   - A3 (`#habitat_colormap`'s first line), A5 (`#schema-check`'s dev subshell).
   - `#dev-copy-phaser_june_dev` and `#schema-check` cite [25]/[26] where they cite [20]/[21]; `#roles-and-grants` gets step 1's extension lines and says memberships and column grants: none [25].
   - Check: `git grep -n 'schema\.sql:' -- . ':!plans'` prints nothing (covers step 4); each object ref names a step or block that is in the edited `db/schema.sql`.
4. **`db/proposals/*.sql`**: any `db/schema.sql:N` ref left after db-designer's revision (today 02's rollback note and 04's header) cited by object: 02 "the four CREATE INDEX lines in db/schema.sql", 04 "db/schema.sql's header says so". Comments only. Check: step 3's grep.
5. **`AGENTS.md`**: the Data line's change rule (`:55`) becomes "change the DB, then update the file and the map `docs/DATABASE_SCHEMA.md`; `db/analysis/schema-check.sql` prints live to compare", the same rule as step 2's header. Docs Map: "`docs/DATABASE_SCHEMA.md`: the live database's objects, readers, roles, grants and dev-copy drift; ERD `docs/schema/`; check `db/analysis/schema-check.sql`." **`docs/DATABASE_ACCESS.md`** Related: the same pointer, one line. Check: read the two change rules side by side.
6. **Final:** `npm run typecheck`, `npm run lint`, `npm test`, then `CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh` once. Astra's review covered `0a5defb6` (its SC2): the recheck of this revision is the two final `--code` reviews of the whole branch against `origin/main`, and the release's rebase on a fresh `origin/main` reruns this step. No extra review.

No change to `src/`, `scripts/`, `db/content/`, `init/` or `deploy/`.

### Rejected alternatives

- Header note on column order instead of reordering: leaves 2 permanent "differs" for every later check to explain. The reorder moves 4 column lines, and nothing depends on order.
- Header lists the extensions left after P04: P04 isn't applied, and the file describes live.
- `CREATE TABLE oneearth.eco_sym_colors` in the file: it's imported with `oneearth`, like `oneearth_bioregion`. The brief asks only to name it as kept.
- Renumbering the `db/schema.sql:N` refs (this section's first call, before Fable SC1): renumbered refs break the map's "refs at `62c63c32`" line, and P02/P03 shift them again when applied. Object names don't move.
- One check line per extension function: ~830 lines (776 PostGIS [24]) to say one thing per extension; the `k of n` sum still shows a partial revoke or a direct grant.
- Effective-privilege lines (`has_*_privilege`) for `critter_app` in the check: it would name a role in a generic check, and memberships plus PUBLIC and direct grants already give the answer; [07] keeps the effective view.
- Type, language, parameter and tablespace ACLs in the check: none gives access to the game's data.
- `COLLATE "C"` in the check's `ORDER BY`: both databases share one server and `en_US.utf8` [01], and the two outputs are compared in the same run.
- `acldefault` for relations and schemas too: their default is owner-only, which the owner filter drops. No output change.
- A pointer in `docs/CLUE_MATCH.md`: it has no wrong DB fact, and AGENTS.md's Docs Map is the index.
- Updating line refs in older `plans/`: they're history.

## Data model

From `db-designer`, Architecture A, 2026-11-26. The full map is in `docs/DATABASE_SCHEMA.md`.

**Query log:** `/srv/critter-ai/agent-state/missions/cc-schema-map/queries/`, written [NN] below. Each `.sql` sits beside its `.out`:

- live: 01–10, 20, 22, 24, and 27–28 from the revision;
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
| F1 | medium | role `postgres` as every agent's and script's login | [01] `current_user = postgres`; [07] `rolsuper`, `rolbypassrls` | Only the query file's READ ONLY wrapper keeps a read-only task read-only. One slip (a bare `-c`, a wrong file) can change or drop what players read | A read-only login role for read-only work, scoped to live: CONNECT on `phaser_june`, SELECT on the 11 mapped relations and 5 sequences, `default_transaction_read_only`, 30 s; not `pg_read_all_data`, which spans the cluster. It also closes the dev copy's PUBLIC CONNECT [27]. Writes keep `postgres` (owner, 2026-11-01) | `db/proposals/01-read-only-agent-role.sql` |
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
- **Statistics:** every table, and `clue_match_ranges`, has planner statistics on every column. `clue_match_places` has none (0 of 12 columns): at 5 rows autovacuum never analyzes it, and `REFRESH` doesn't. That's harmless at 5 rows, so there's no proposal [08].

### Target design

- **After the proposals:** the same 11 relations.
  - `species` drops `created_at` and `updated_at`, and the clues drop `created_at` (P03).
  - The clues and facts keep their primary key, unique and GIN indexes, without the 4 prefix indexes (P02).
  - Extensions: `postgis`, `pg_stat_statements`, `plpgsql` (P04).
  - Roles: plus `critter_reader` for read-only agent work, which reads live's mapped objects only. The dev copy is closed to PUBLIC; `critter_dev` and `postgres` still connect (P01).
  - PUBLIC loses TEMP on `phaser_june` (P05).
- **Code:** reads and writes don't change. No query in `src/` or `scripts/` names a dropped object. The build's upsert lists only profile columns, and the views use only `species.id` and `iucn_id` and the clues' `species_id`. F2's fix is a code change for a later mission.
- **How each applied proposal runs:**
  1. On the dev copy first (CI's e2e reads it), except P01 and P05, which are for live only.
  2. Live, after a fresh dump.
  - Every run names its database, `-v target=phaser_june_dev` or `-v target=phaser_june`. A missing or different name stops before any DDL ([28]: no target, or the wrong one, exits 3).
  3. Then the files: `db/schema.sql`, and `init/` and `deploy/db/app-role.sql` where the proposal names them.
- **For unit B's ERD:** `docs/DATABASE_SCHEMA.md#relationships` lists 11 entities in 4 zones (content 5, ranges and places 3, `natural_earth` 1, `oneearth` 2), with 4 foreign keys and 4 logical links. Detail `faithful` fits.

**Handoff lines for the lead's item** (`Blocks: nothing`):

- **P01** read-only agent role, scoped to live. It also revokes PUBLIC CONNECT on the dev copy. Risk: catalog only; afterwards only `critter_dev` and `postgres` reach the copy, as today in practice. Needs the owner to set a password and a new env file once the post-checks pass. Recommended.
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
  - Revision: a real Mermaid (12.2.0, critwire's, imported read-only) parses the `.mmd`: 11 entities, 118 columns, 8 relationships, and the parsed cardinalities print back as the source's notation. The pre-revision file fails on its bare `%%` line. Rerun: `node /srv/critter-ai/agent-state/missions/cc-schema-map/erd-build/parse-mmd.mjs docs/schema/phaser-june.mmd 11,118,8` from the worktree root. Exit 0 means it passes; a parse error or a count mismatch exits 1. Output: `erd-build/parse-mmd.out`.
- **Map fixed:**
  - `iucn.yrcompiled`, `generalisd`, `shape_leng` and `shape_area` are numeric(65,30) [03]; the map said plain numeric.
  - The ranges link is "zero or one to one".
  - Revision: `iucn.id_no` and `oneearth_bioregion.eco_sym` are nullable with no FK, so their parent side is zero or one (`|o`), with no NULLs today [08].
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

### Data model revision

From `db-designer`, 2026-11-26. Covers the `.mmd`, the renders, `docs/DATABASE_SCHEMA.md`, `db/proposals/` and the Data model section. No database was changed. There are two new read-only query files, [27] and [28]; numbers 25 and 26 stay free for the architect's step 1.

- **Fable MUST-FIX 1 / Astra 4 (parse):**
  - Change: deleted the bare `%%` line from `docs/schema/phaser-june.mmd`, and its conventions now explain why.
  - Proof: `erd-build/parse-mmd.mjs` imports critwire's Mermaid 12.2.0 read-only and needs no DOM shim. It parses the file to 11 entities, 118 columns and 8 relationships (PK 9, FK 4, UK 11), and every parsed relationship prints back identical to the source. The HEAD file fails, as Fable said.
  - Output: `erd-build/parse-mmd.out`. Verification: `node /srv/critter-ai/agent-state/missions/cc-schema-map/erd-build/parse-mmd.mjs docs/schema/phaser-june.mmd 11,118,8` from the worktree root exits 0. A parse error or a count mismatch exits 1.
- **Fable MUST-FIX 3 / Astra 4 (cardinality):**
  - `.mmd`: `species |o..o{ iucn` and `eco_sym_colors |o..o{ oneearth_bioregion`.
  - `docs/DATABASE_SCHEMA.md#relationships`: both rows now say "many to one, optional"; the Notes say the column is nullable with no FK, and no NULLs today [08].
  - Renders: the `1` label became `0..1` on both edges in `erd-build/build.py`. Both HTML files were rebuilt and both SVGs re-exported (`export_svg.py --system-fonts`).
  - Checks: `self_check.py --offline` and `verify-geometry.py` report 0 findings on each file, the SVGs parse, and the light render was checked by eye.
- **Astra MUST-FIX 1 (target database):**
  - Every proposal sets `\set ON_ERROR_STOP on`. Right after `BEGIN` and before any DDL, it requires `-v target=<db>` and checks it against `current_database()`. 02–04 accept `phaser_june_dev` or `phaser_june`; 01 and 05 accept `phaser_june` only. A missing variable prints a message and fails.
  - Proof: [28] ran the 02–04 block verbatim, read-only, on live. No target: exit 3. `target=phaser_june_dev`: exit 3. `target=phaser_june`: passes.
  - Each header gives its run lines. Dev runs load the settings file fail-fast (A5's pattern).
- **Astra MUST-FIX 2 (P01 scope):**
  - Dropped `pg_read_all_data`. [27]: the cluster holds `phaser_june`, `phaser_june_dev`, `postgres` and the two templates.
  - Grants now: CONNECT on `phaser_june`, USAGE on the 3 schemas, and SELECT on the 11 mapped relations and the 5 public sequences.
  - No default privileges, so a later table stays closed until someone grants it, including any table about people.
  - The gap: the copy's default ACL gives PUBLIC CONNECT, and so `critter_app` can connect too [27]. P01 also runs `REVOKE CONNECT ON DATABASE phaser_june_dev FROM PUBLIC`. Its owner `critter_dev` and the superuser `postgres` keep access, and git grep finds no other user. The header names the follow-up in `deploy/db/dev-role.sql`.
  - Post-checks, run while the role is still NOLOGIN: not superuser, no BYPASSRLS, no login, no memberships; it reads every relation and sequence in the 3 schemas and writes none; no CREATE anywhere; CONNECT on live but not on the copy; `critter_dev` keeps the copy and `critter_app` keeps live. A per-database table prints the rest.
  - Left over: PUBLIC CONNECT on `postgres` and `template1`. Both hold catalogs only, and PgBouncer routes neither.
  - Rollback: GRANT the copy's CONNECT back to PUBLIC, then `DROP OWNED BY critter_reader` and `DROP ROLE critter_reader`.
- **Fable MISSED 1:**
  - `docs/DATABASE_SCHEMA.md#roles-and-grants` now says: no default privileges or column grants [07]; no function has an explicit grant; extension functions keep their default ACL, so PUBLIC, and with it `critter_app`, can execute them. The one exception is an owner-only `pg_stat_statements` function [27].
  - The dev-copy section now notes that `critter_app` can reach the copy through PUBLIC.
- **Fable MISSED 3:** the Data model's "Statistics" line is corrected: `clue_match_places` has statistics on 0 of 12 columns, which is harmless at 5 rows [08].
- **Data model section:** updated to match: the query-log list, F1's fix, the target design (roles; every run names its target), P01's handoff line and the ERD checks.
- **Should-consider decisions:**
  - Fable SC3, adopted: P01's header loads the read-only settings with `|| exit 1`, `${DATABASE_URL:?}` and a `current_user` check.
  - Fable SC4, adopted: P04's header gives `./scripts/db -d phaser_june_dev -v target=phaser_june_dev -f ...` with `.env.local`'s `postgres` login. psql's `-d` overrides the URL's database, and PgBouncer routes the copy. The route is untried, and the header says so; the target guard stops a run that lands anywhere else.
  - Astra SC1, rejected: the values are unread and wrong (`updated_at` is stale in 48 of 76 rows, and a clue's `created_at` only records its last build). An exact restore brings back wrong data, and a saved-values table would add the kind of dead object this mission removes. The pre-run dump keeps the values, and P03's rollback note says so.
- **For the architect's steps 3–4:** the map's line numbers moved (step 3 already cites anchors). P02's `db/schema.sql` ref moved from `:51` to `:65`; P04's stays at `:5`. Neither ref was edited.

### Architecture revision

From `architect`, 2026-11-26. Plan text only; repo edits stay in Steps.

- **Fable MUST-FIX 2 / Astra MUST-FIX 5** (clue column order): target design step 2 now makes two moves (`created_at` after `is_filtering`, `species_id` after it) to live's `..., is_filtering, created_at, species_id, source_key, source_url`; its check reads both column lists name by name against [25]. Rejected alternative: "3 lines" -> "4 column lines".
- **Astra MUST-FIX 3** (check blind to memberships, column grants, extension functions): A1 widened (b). Step 1 adds memberships (`pg_auth_members`, non-`pg_*` members), column grants (`attacl`) and per-extension sums (`grant extension <ext> functions|relations to <grantee> <privs> <k> of <n>`), all in the `grants` CTE's one-line form. Sums, not ~830 per-function lines: same answer, partial revokes and direct grants still show. Expected 25/26 outputs are spelled out (7 new lines each; memberships and column grants none, per [07]/[17]). Read-only catalog only, no `pg_authid`, rerunnable.
- **Fable MISSED 2** (`AGENTS.md:55` repeats the change rule): A6 and step 5 edit both copies in the same words as step 2's header.
- **Fable SC1** (cite `db/schema.sql` by object): adopted. A2's fix, steps 3-4, and Rejected alternatives changed; one grep (`git grep -n 'schema\.sql:' -- . ':!plans'`) checks both steps. Step 3 names map sections by anchor, since db-designer's revision moves its lines.
- **Fable SC2** (A6 past "change those facts only"): Decision line below, for the lead.
- **Astra SC2** (recheck reviewed revision): folded into step 6: the final `--code` reviews and the release's rebase-and-rerun are that recheck; no extra review.
- Not mine (db-designer): Fable MUST-FIX 1 and 3, Astra MUST-FIX 1, 2, 4, Fable MISSED 1 and 3, Fable SC3-4, Astra SC1.

Decision line for **Decisions**:

`- 2026-11-26 · Scope: A6 adds one Docs Map line (AGENTS.md), one Related line (docs/DATABASE_ACCESS.md) and the map + check to the change rule (AGENTS.md:55, db/schema.sql header), past the brief's "change those facts only": the brief creates the map and check, and with nothing pointing at them and a change rule that skips them, the next schema change drifts them unseen. No database fact changes (Fable SC2).`

## Steps

From `planner`, 2026-11-26, based on the final architecture: the Architecture target design (steps 1-5), the Data model, both reviews and the Revision notes. **Already done on the branch:** the map, the ERD (`.mmd` parses with Mermaid 12.2.0, cardinalities fixed, 4 renders rebuilt), the profile and marker, proposals 01-05 with target guards, the map's function-grant wording. **Left:** the architect's repo edits, the comparison record and the handoff item. **No ERD step:** the `.mmd` already has `habitat_colormap`'s PK and live's clue column order, and S6 rechecks the renders.

Rules for every step: no database writes. Each query is a new file in `/srv/critter-ai/agent-state/missions/cc-schema-map/queries/` (the Decision rules' wrapper), scanned with V4 before it runs and run with `./scripts/db -f`, with its `.out` saved beside it. Numbers 25-26 are S1's; take the next free number from 29 (27-28 are used). `Q=/srv/critter-ai/agent-state/missions/cc-schema-map/queries` below. Commit code and plan together and push after each step.

- [x] S1. **Schema check: the privileges it misses** (A1, A4; target design step 1). Riskiest and enabling: it is the only new SQL run against live, and S2-S4 check against its output [25].
  - Files: `db/analysis/schema-check.sql`. Query log (outside git): `$Q/25-live-schema-check.{sql,out}`, `$Q/26-dev-schema-check.{sql,out}`.
  - Do: target design step 1 (a)-(d) plus its header lines, all inside the `grants` CTE. Handle every item in **Failure modes** FM1-FM12. Then build 25 and 26 the way 20 and 21 were built: the committed file, with a line-3 comment and the `SELECT 1 / (current_database() = '<db>')::int AS guard_<x> \gset` guard inserted after its two wrapper lines. Scan both with V4, then run them:
    ```bash
    ./scripts/db -qAt -f $Q/25-live-schema-check.sql > $Q/25-live-schema-check.out
    ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy || exit 1; set +a
      : "${DATABASE_URL:?dev-copy settings not loaded}"
      ./scripts/db -qAt -f $Q/26-dev-schema-check.sql > $Q/26-dev-schema-check.out )
    ```
  - Check:
    - Both runs exit 0 with empty stderr. Line 1 of each output names its database.
    - `diff $Q/20-live-schema-check.out $Q/25-live-schema-check.out` adds exactly these 7 lines and nothing else:
      ```
      grant extension pg_stat_statements functions to PUBLIC EXECUTE 2 of 3
      grant extension pg_stat_statements relations to PUBLIC SELECT 2 of 2
      grant extension pgcrypto functions to PUBLIC EXECUTE 36 of 36
      grant extension plpgsql functions to PUBLIC EXECUTE 3 of 3
      grant extension postgis functions to PUBLIC EXECUTE 776 of 776
      grant extension postgis relations to PUBLIC SELECT 3 of 3
      grant extension uuid-ossp functions to PUBLIC EXECUTE 10 of 10
      ```
      The counts come from [24] and [27]. A count that differs is a fact to record, never a reason to bend the query.
    - `diff 21 26` gives the same 7 lines plus `grant database to PUBLIC CONNECT,TEMPORARY`.
    - `diff 25 26` shows line 1, owners and the database grants only.
    - No `grant role` lines and no column-grant lines ([07]/[17]: none).
    - `npm run typecheck`, `npm run lint`.
  - Record: a `Result:` sub-bullet under this step with the real extension lines and the three diff results. S4 copies them into the map.
  - Result (2026-11-26, [25] live, [26] dev; both exit 0, empty stderr, line 1 names its database; V4 scan clean on both):
    - `diff 20 25`: adds exactly the 7 expected lines, nothing else. Real lines (sorted as printed): `grant extension pg_stat_statements functions to PUBLIC EXECUTE 2 of 3`, `... pg_stat_statements relations to PUBLIC SELECT 2 of 2`, `... pgcrypto functions to PUBLIC EXECUTE 36 of 36`, `... plpgsql functions to PUBLIC EXECUTE 3 of 3`, `... postgis functions to PUBLIC EXECUTE 776 of 776`, `... postgis relations to PUBLIC SELECT 3 of 3`, `... uuid-ossp functions to PUBLIC EXECUTE 10 of 10`. All counts as predicted.
    - `diff 21 26`: the same 7 lines plus `grant database to PUBLIC CONNECT,TEMPORARY` (FM1: the copy's NULL `datacl` now reads as its default).
    - `diff 25 26`: line 1, schema/relation owners (`postgres` vs `critter_dev`), and the database grants (live `PUBLIC TEMPORARY` + `critter_app CONNECT`; copy `PUBLIC CONNECT,TEMPORARY`) only. Extension lines identical in both (FM12).
    - No `grant role` and no column-grant lines in either (FM6-FM8). Typecheck, lint pass.
- [x] S2. **`db/schema.sql` to live, plus the change rule's other copies** (target design steps 2 and 5, A3, A6). Fable MISSED 2 asks for both copies of the change rule to be edited in the same step.
  - Files: `db/schema.sql`, `AGENTS.md`, `docs/CLUE_MATCH.md`, `docs/DATABASE_ACCESS.md`.
  - Do:
    - **`db/schema.sql`**, exactly as target design step 2 says:
      - the header's change rule, the `eco_sym_colors` "kept" line and the Extensions line (keep lines 1-3 and the "fails at the first CREATE" sentence);
      - `species`: `created_at` and `updated_at` follow `conservation_code`;
      - clues: two moves, to `..., is_filtering, created_at, species_id, source_key, source_url`, then fix the commas;
      - `habitat_colormap`: `value integer PRIMARY KEY, label text NOT NULL`, with A3's comment. Hand-written; no view SQL touched.
    - **The same change rule** (names the map and the check) in:
      - `AGENTS.md:55`'s Data line;
      - the last sentence of `docs/CLUE_MATCH.md`'s Database section ("Change the database with SQL, then update the file to match."). That is a third copy the architecture missed. Leaving it would make the copies disagree, which is what Fable MISSED 2 warns about.
    - **Pointers:** `AGENTS.md`'s Docs Map line and `docs/DATABASE_ACCESS.md`'s Related line (target design step 5).
    - **Decisions:** add one line. The `CLUE_MATCH.md` copy follows the A6 decision. `docs/DRIZZLE_ORM_GUIDE.md:39` ("Edit `db/schema.sql` to match, then update the query and its `Row` type") stays: it isn't in the brief's list of docs, and it is a step for query changes that doesn't contradict the rule.
  - Check:
    - `npm test` (186/186; `tests/clueGame/content.test.ts` pins the view literals), `npm run typecheck`, `npm run lint`.
    - `git diff origin/main -- db/schema.sql` has no hunk at or below `-- Range maps`.
    - V5's column-order loop against `$Q/25-live-schema-check.out` prints `same-order` 5 times.
    - V2's CI greps come back empty.
    - Read the three change rules side by side (`git grep -n 'schema-check.sql' -- AGENTS.md docs/CLUE_MATCH.md db/schema.sql`): one rule.
  - Result (2026-11-26): header (change rule names map + check; `eco_sym_colors` kept line; Extensions line: postgis, pg_stat_statements, pgcrypto, uuid-ossp, plpgsql built in), `species` and clue column order, `habitat_colormap` PK + NOT NULL + A3 comment. Same rule in `AGENTS.md:55` and `docs/CLUE_MATCH.md` Database section; pointers in AGENTS.md Docs Map and DATABASE_ACCESS.md Related. Column-order loop vs [25]: `same-order` x5. schema.sql hunks end above `-- Range maps` (no view SQL touched). CI guards empty. `npm test` 186/186, typecheck, lint pass.
- [x] S3. **Record the schema check, object by object** (Definition of done, "The schema check").
  - Files: the plan only, a new `## Schema check result` section above `## Summary`.
  - Do: read `$Q/25-live-schema-check.out` against the edited `db/schema.sql`, object by object, with no parser:
    - the 12 objects of the Data model's table;
    - the grants in `deploy/db/app-role.sql`;
    - one row for what the file leaves out by design (`iucn`, `oneearth.*`, `natural_earth.countries`, extension members), which the map covers.
    - Views: the hand-written SQL is read against [25]'s `pg_get_viewdef`, and `diff 20 25` has no `view` line change, so live hasn't moved since [05].

    Each row: matches or differs, how, and what was done (S2's edit, or "file ahead: finding + handoff line"). Add the dev copy's result (`diff 25 26`) and the rerun command.
  - If an object still differs:
    - file behind: add a fix step before S4;
    - file ahead: add a finding row, and a line for S5's handoff item.

    Never fix the database.
  - Check: 12 of 12 match (the Architecture expects this after S2), plus the `app-role.sql` row. `npm run typecheck`, `npm run lint`.
- [x] S4. **The map and proposals cite the edited file by object** (A2, A3, A5; target design steps 3-4).
  - Files: `docs/DATABASE_SCHEMA.md`, `db/proposals/02-drop-redundant-indexes.sql`, `db/proposals/04-drop-unused-extensions.sql`.
  - Do:
    - **Refs by object, not line:** every `db/schema.sql:N` ref becomes a reference to the object or step. In the map:
      - `#species`: both views' `ranges` step;
      - `#species_deduction_clues`: the `playable` step;
      - `#habitat_colormap`: its keys line;
      - the views' intro: "match `db/schema.sql`'s two `CREATE MATERIALIZED VIEW`";
      - `#natural_earthcountries`: `clue_match_places`' `country_parts` step;
      - `#roles-and-grants`: `db/schema.sql`'s closing grant `DO` block.
    - **Sentences that call the file behind:** rewrite them for the new state. That is `#species_deduction_clues` ("lists `species_id` second"), `#habitat_colormap`'s keys, `#oneeartheco_sym_colors` ("header doesn't mention it"), and `#species`' column-order line, which now matches the file.
    - **A3:** `#habitat_colormap`'s first line, in the same words as the `db/schema.sql` comment.
    - **A5:** in `#schema-check`:
      - the dev subshell gets `|| exit 1` and `${DATABASE_URL:?}`;
      - its expect comment becomes "owners and the database's grants only";
      - the covers list adds memberships, column grants and extension members (summed);
      - its pointer goes to the plan's "Schema check result".
    - `#dev-copy-phaser_june_dev`: [20] vs [21] becomes [25] vs [26].
    - `#roles-and-grants`: add S1's real `grant extension` lines, and "memberships and column grants: none [25]".
    - Proposals, comments only:
      - 02's rollback ref becomes "the four CREATE INDEX lines in db/schema.sql";
      - 04's header ref becomes "db/schema.sql's header says so".
  - Check:
    - `git grep -nE 'schema\.sql:[0-9]' -- . ':!plans'` prints nothing. It needs the `[0-9]`: the Architecture's bare `schema\.sql:` also matches the prose at `scripts/content.ts:45`, which is out of scope.
    - Every remaining `db/schema.sql` mention in the map and the proposals names a step or block that is in the file. `grep -nE '^(WITH )?[a-z_]+ AS \(|^\), [a-z_]+ AS \(|^DO ' db/schema.sql` lists them.
    - `git diff db/proposals/` changes `--` lines only, and V8 prints `ok` 5 times.
    - `npm run typecheck`, `npm run lint`.
  - Result (2026-11-26): every `db/schema.sql:N` ref in the map and proposals 02/04 now names its object, step or block (`ranges`/`playable` steps, `CREATE TABLE habitat_colormap`, the two `CREATE MATERIALIZED VIEW`, `country_parts`, closing grant `DO` block, the four `CREATE INDEX` lines, the header); file-behind sentences rewritten (clue/species order, habitat keys, `eco_sym_colors` kept); A3 first line; A5 dev subshell guard, expect comment, covers list, pointer to "Schema check result"; dev copy [25] vs [26]; roles/grants: S1's 7 `grant extension` lines + no memberships/column grants [25]. Line-ref grep empty, proposal diff `--` lines only, V8 `ok` x5, typecheck, lint pass.
- [x] S5. **Handoff item for Danby** (Definition of done 5).
  - Files: `/srv/critter-ai/handoff/critter-connect.md` (outside git), and the plan (Log; a Decisions line with the item's number).
  - Do: take the next unused number (`grep -n '^### H' /srv/critter-ai/handoff/critter-connect.md`; the highest today is H22, so H23). Add the item under `## Open`, in `~/AGENTS.md`'s exact format:
    - Title with no values, e.g. `### H23 · Database proposals from cc-schema-map: pick which to apply`.
    - `Status: waiting on you`; `From: cc-schema-map · <date>`; `Blocks: nothing`.
    - **Why:** the map exists, and nothing was applied.
    - **Steps:** read `docs/DATABASE_SCHEMA.md` and each proposal (`https://github.com/kc0588615/phaser-june/tree/agent/cc-schema-map/db/proposals`; on `main` after the release). Then one line each, from the Data model's "Handoff lines": P01-P05 with risk and recommendation, F2 (a code change, no proposal), and any "file ahead" line from S3.
    - **Your reply:**
      - `P01 =` … `P05 =` (apply / skip / later);
      - `P04: does any tool of yours outside the repo call pgcrypto or uuid-ossp functions? =`;
      - `F2: queue a code mission to widen the clue-id rule? =`.
  - Check:
    - Every format field is present.
    - The title and body hold no secret, IP address or connection string.
    - `npm run typecheck`, `npm run lint`.
- [x] S6. **Full Verification:** V1-V10 below. Run V2-V9 first (seconds each) and V1, the E2E, last.
  - Fix any failure before checking this off. A fix bigger than a few lines becomes a new step before S6.
  - Log each V's result in one line, with the E2E artifact's path.

- [x] S7. **P01: narrow the read-only claim to what the role enforces** (Astra code MUST-FIX 1). `default_transaction_read_only` is only a default, and PUBLIC keeps EXECUTE on `lo_create`/`lo_from_bytea`, so the reader can still create large objects (and temp tables, P05). Say so in the header and beside `writes_none`; no new grant or revoke.
  - Check: V8 (target guard) unchanged; `git diff` on the proposal is comment-only; typecheck, lint.
  - Result: [30] (live, read-only): PUBLIC executes lo_create, lo_creat, lo_from_bytea, lo_open, lo_put, lowrite, lo_unlink (not lo_import); lo_compat_privileges off; 0 large objects. P01 header, Scope, Risk and the writes_none comment now say: no relation writable; temp tables (P05) and large objects still creatable once a session turns read-only off. H23's P01 line says the same.
- [x] S8. **P01: rollback keeps the earlier state, and covers both databases** (MUST-FIX 2). Rollback grants PUBLIC CONNECT on the copy only if the pre-checks showed `public_connect` true; runs `DROP OWNED BY critter_reader` in `phaser_june_dev` too (a refresh from live copies the reader's grants there) before `DROP ROLE`. Note that a refresh (`dropdb`/`createdb`, `docs/DATABASE_ACCESS.md` refresh steps) reopens the copy's PUBLIC CONNECT, so the REVOKE is rerun after it.
  - Check: comment-only diff; V8; typecheck, lint.
  - Result: Before block gains one read-only line, `dev_public_connect_before` (the rollback needs the earlier state, which the post-checks print only after the REVOKE); [31] runs it on live: `t`, and no `critter_reader` yet. Rollback is now two transactions: `DROP OWNED BY critter_reader` in `phaser_june_dev` first, then on live the conditional `GRANT CONNECT ... TO PUBLIC`, `DROP OWNED`, `DROP ROLE`. Refresh note: rerun the REVOKE after `dropdb`/`createdb` until `dev-role.sql` does it. Rest of the diff comment-only.
- [x] S9. **Schema check shows grant options** (MUST-FIX 3). `db/analysis/schema-check.sql` marks a grantable privilege `*` (aclitem style) in every grant branch that uses `aclexplode`.
  - Check: rerun live and dev read-only as new query files from 32 (S7 took 30, S8 31) (guard, wrapper, V4 scan); `diff` against [25]/[26] is empty (nothing is grantable today); typecheck, lint.
  - Result: all 6 `aclexplode` branches (relations, schemas, database, functions, columns, extension members) aggregate `privilege_type || '*'` when `is_grantable`; header says so, map's `#schema-check` covers list too. [32] live / [33] dev: guards pass, V4 scan clean, `diff` vs [25]/[29] and [26] empty, 0 grant lines with `*`. [34] (read-only, literal ACL) proves the mark fires: `critter_app|INSERT*,SELECT`. Next free query number: 35.
- [ ] S10. **Map: what the content hashes prove** (MUST-FIX 4, plus SHOULD-CONSIDER 2). `docs/DATABASE_SCHEMA.md` "Same content" says which columns [09]/[19] hash (not every column: e.g. `natural_earth.countries` 5 of its columns; `iucn` geometry hashed apart from row ids) and so what it shows; "View output" gives the saved counts (`clue_match_ranges`: 7 SVG paths, 9 GeoJSON values, 10 species; 4 of 5 outlines). Sequences line: the content build resets four; `iucn_ogc_fid_seq` advances through its column default.
  - Check: the counts recomputed from `diff $Q/09-*.out $Q/19-*.out`; V7; typecheck, lint.
- [ ] S11. **Map: `critter_app`'s effective privileges stated exactly** (MUST-FIX 5). Replace "SELECT and nothing else on every relation" with: SELECT on its 6 relations and PUBLIC's catalog/extension relations, no write privilege on any relation [07].
  - Check: the sentence matches [07]; typecheck, lint.
- [ ] S12. **Schema check rerun asserts each database** (MUST-FIX 6). The rerun block in `docs/DATABASE_SCHEMA.md` and the plan's "Schema check result" stops unless line 1 is `database phaser_june ...` / `database phaser_june_dev ...` (e.g. `head -1 ... | grep -q '^database phaser_june_dev '  || exit 1`), before the diff.
  - Check: run the block as written (read-only) and see it pass; point the dev part at live once (load `.env.local`) and see it stop; typecheck, lint.

## Verification

Run from the worktree root, one heavy job at a time, on the step's final commit. `Q=/srv/critter-ai/agent-state/missions/cc-schema-map/queries`; `S=/srv/critter-ai/agent-state/missions/cc-schema-map`. The Summary unit and the release (after its rebase) rerun all of it.

- **V1. E2E** (the owner's primary test). No new scenario: nothing a player sees changes, and no code under `src/` or `scripts/` changes. The existing `e2e:fresh` scenario reads every database path the game has: `/api/places` and its outline (globe), `/api/clue-game/pool`, range and ranges. It plays globe → continent → 4 rounds at `/explore` (seed 7), with resume, two tabs, Anywhere load and the IDN split, checking invariants on every move.
  ```bash
  CHROME_PATH=~/.local/bin/chrome-nosandbox npm run e2e:fresh 2>&1 | tee /tmp/cc-schema-map-e2e-final.log
  run=$(grep -oE 'Artifact: e2e-artifacts/[^ ]+/' /tmp/cc-schema-map-e2e-final.log | tail -1 | cut -d' ' -f2)
  rm -rf $S/e2e-final && mkdir -p $S/e2e-final && cp -r "$run". $S/e2e-final/ && cp /tmp/cc-schema-map-e2e-final.log $S/e2e-final/run.log
  ```
  - Must show: the last line reads `N/N checks passed. Artifact: ...`, with 0 failed. Baseline: 1563/1563. N changes only if a rebase brought e2e changes.
  - Artifact: `$S/e2e-final/` (`report.json`, screenshots, `run.log`). Reproduce with the same command; seed 7 is the default.
  - Disk: keep only `e2e-s0-baseline/` and `e2e-final/`.
- **V2. Static and CI.** `npm run typecheck` and `npm run lint` exit 0. `npm test` passes 186/186 (the mission adds no tests; `content.test.ts` pins `db/schema.sql`). CI's `! git ...` guard lines (the legacy-ORM greps and the legal-links grep), run verbatim from the workflow, print nothing:
  ```bash
  for n in $(grep -n '^ *! git ' .github/workflows/ci.yml | cut -d: -f1); do bash -c "$(sed -n ${n}p .github/workflows/ci.yml)" || echo "CI guard ci.yml:$n FAILED"; done
  ```
- **V3. Scope.** These print nothing:
  - `git diff --name-only origin/main...HEAD | grep -E '^(src|scripts|db/content|init|deploy)/'`;
  - `git diff --name-only origin/main...HEAD | grep -E '(^|/)\.env'`.

  `git diff origin/main...HEAD -- db/schema.sql` touches only the header and the Content section.
- **V4. Query log is read-only** (Definition of done, "Query log"). The command prints only `scan-done`. Every file has the wrapper, no forbidden token outside strings and comments, and an `.out` beside it:
  ```bash
  cd $Q && for f in *.sql; do
    [ "$(sed -n 1p "$f")" = 'BEGIN TRANSACTION READ ONLY;' ] && [ "$(sed -n 2p "$f")" = "SET LOCAL statement_timeout = '30s';" ] \
      && [ "$(grep -v '^[[:space:]]*$' "$f" | tail -1)" = 'ROLLBACK;' ] || echo "WRAPPER $f"
    sed -E "s/'[^']*'//g; s/--.*$//" "$f" | grep -niE '\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|GRANT|REVOKE|TRUNCATE|VACUUM|ANALYZE|REFRESH|LOCK|COPY|CLUSTER|REINDEX|COMMIT|SAVEPOINT|PREPARE|DO|CALL|LISTEN|NOTIFY)\b|^[[:space:]]*END[[:space:]]*;|SET[[:space:]]+(SESSION[[:space:]]+)?TRANSACTION|\\!|\\(c|connect|gexec|copy|o|setenv)\b|pg_stat_reset|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|set_config|nextval|setval|pg_authid|pg_shadow|pg_user_mapping|pg_subscription|pg_hba_file_rules|pg_stat_activity|pg_stat_ssl|pg_stat_replication|pg_stat_statements' | sed "s|^|$f:|"
    ls "${f%.sql}"*.out >/dev/null 2>&1 || echo "NO OUTPUT $f"
  done; echo scan-done; cd - >/dev/null
  ```
  It passes on files 01-28 today. `ANALYZE` covers `EXPLAIN ANALYZE`.
- **V5. Schema check reruns and matches** (Definition of done, "The schema check"; "a later mission can rerun").
  - Write `$Q/<next free>-live-schema-check-final.sql` (29 at first), built as 25 was. Scan it with V4, run it as in S1, then `diff $Q/25-live-schema-check.out <it>.out`. Expect empty: the query is stateless, and live hasn't changed since S1.
  - A non-empty diff is live drift. Record it in the Summary and the handoff item; the database is never fixed.
  - Then the column order, against the final output. It prints `same-order` 5 times:
  ```bash
  for t in content_sources species species_deduction_clues species_facts habitat_colormap; do
    diff <(grep "^column $t " <final>.out | awk '{print $4}') \
         <(sed -n "/^CREATE TABLE $t (/,/^);/p" db/schema.sql | sed '1d;$d' | grep -v '^ *UNIQUE (' | awk '{print $1}') && echo "$t same-order"; done
  ```
  - `## Schema check result` (S3) still reads 12 of 12 match.
- **V6. ERD** (Definition of done, "ERD"). Every line passes:
  ```bash
  node $S/erd-build/parse-mmd.mjs docs/schema/phaser-june.mmd 11,118,8          # exit 0, "counts match the map: 11,118,8"
  P=$(ls -d ~/.claude/plugins/cache/diagram-design/diagram-design/*/ | tail -1)
  for h in docs/schema/phaser-june.html docs/schema/phaser-june-dark.html; do
    python3 ${P}skills/diagram-design/scripts/self_check.py $h; python3 ${P}scripts/verify-geometry.py $h; done   # OK, 0 findings each
  for s in docs/schema/phaser-june.svg docs/schema/phaser-june-dark.svg; do python3 -c 'import sys,xml.etree.ElementTree as E; E.parse(sys.argv[1])' $s; done
  # tables and FKs = the live check's (prints entities-match, fks-match)
  diff <(grep -E '^relation ' <final>.out | grep -v ' sequence ' | awk '{print $2}' | sed 's/.*\.//' | sort) \
       <(grep -E '^[a-z_]+ \{$' docs/schema/phaser-june.mmd | awk '{print $1}' | sort) && echo entities-match
  diff <(grep 'FOREIGN KEY' <final>.out | sed -E 's/^constraint ([a-z_.]+) [a-z_]+ FOREIGN KEY \(([a-z_]+)\) REFERENCES ([a-z_.]+)\(.*/\3 \1 \2/' | sort) \
       <(grep -E '^[a-z_]+ [|}][|o]--[o|][|{}] ' docs/schema/phaser-june.mmd | sed -E 's/^([a-z_]+) [^ ]+ ([a-z_]+) : "FK ([a-z_]+).*/\1 \2 \3/' | sort) && echo fks-match
  ```
  - Each of the 4 renders names all 11 entities.
  - The map links the `.mmd` and the 4 renders, and embeds `schema/phaser-june.svg`.
  - `~/.diagram-design/profiles/critter-connect.md` exists, and `.diagram-design` reads `profile: critter-connect`.
- **V7. Map coverage** (Definition of done 1). Every non-sequence relation in `<final>.out` has a `` ### `<name>` `` heading in `docs/DATABASE_SCHEMA.md`. The map has its extensions/functions/triggers, roles and grants, dev copy, schema check and diagrams sections. `git grep -nE 'schema\.sql:[0-9]' -- . ':!plans'` prints nothing.
- **V8. Proposals** (Definition of done 4). Prints `ok` 5 times. Nothing in `queries/` runs a proposal's DDL (V4).
  ```bash
  for f in db/proposals/*.sql; do head -1 "$f" | grep -q '^-- DRAFT: not applied' && grep -q '^BEGIN;' "$f" && grep -q '^COMMIT;' "$f" \
    && grep -q '^-- Before' "$f" && grep -q '^-- After' "$f" && grep -q '^-- Rollback' "$f" && grep -q '^-- Risk' "$f" \
    && grep -q 'guard_target' "$f" && grep -q '^\\set ON_ERROR_STOP on' "$f" && echo "ok $f" || echo "INCOMPLETE $f"; done
  ```
- **V9. No secrets or player data** in committed files. This prints nothing (the brackets keep the pattern from matching itself in this plan):
  ```bash
  git diff --name-only --diff-filter=d origin/main...HEAD | xargs grep -nE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b|postgres(ql)?://|PGPASS[W]ORD|password *=|SCRAM-SH[A]|md5[0-9a-f]{32}|PRIVATE[ ]KEY'
  ```
  No sampled rows outside the content tables (species, clues, facts, sources).
- **V10. Handoff.** `grep -n '^### H23 · ' /srv/critter-ai/handoff/critter-connect.md` (or S5's number) finds one item under `## Open`, with `Status: waiting on you`, `Blocks: nothing`, the P01-P05 lines and a **Your reply** block.

## Failure modes

Only S1's grant additions to `db/analysis/schema-check.sql` are exercised on their own, by running them read-only, not by unit tests. These are written before the code. S1's run must show each one handled.

- **FM1. NULL ACL read as "no grants":** a database or function on the default ACL (the copy's `datacl`; most functions) prints nothing. Fix: `coalesce(..., acldefault('d'|'f', owner))`. Seen in: [26] prints `grant database to PUBLIC CONNECT,TEMPORARY`; [25] keeps [20]'s `PUBLIC TEMPORARY` and `critter_app CONNECT`.
- **FM2. Extension members outside the 3 schemas missed:** plpgsql's handlers live in `pg_catalog`. Fix: the sums select members through `pg_depend` `deptype = 'e'`, in any schema. Seen in: the `plpgsql functions ... 3 of 3` line.
- **FM3. One line per member:** about 830 lines. Fix: group by extension, kind, grantee and privileges. Seen in: exactly 7 `grant extension` lines.
- **FM4. Wrong `k of n`:** `n` must count every member of that kind, with or without a grant, or a revoke hides. Seen in: `pg_stat_statements functions ... 2 of 3` (its reset function is owner-only [27]).
- **FM5. NULL relation ACL taken as PUBLIC:** a relation's default is owner-only. Fix: no `acldefault` for relations; `aclexplode(NULL)` gives no rows. Seen in: relation counts 3 and 2, as [07].
- **FM6. Built-in role nesting floods the memberships:** Fix: drop members named `pg_*`; a `pg_*` role granted to one of ours still prints. Seen in: no `grant role` line ([07]/[17]: 0).
- **FM7. Duplicate membership lines,** one pair with several grantors. Fix: `DISTINCT`.
- **FM8. Column ACLs:** a NULL `attacl` must mean none, not an error. Seen in: no column line [07].
- **FM9. Unstable order:** new lines sort under section 12 like the rest (`section, object, pos, line`). Seen in: V5's rerun diff is empty.
- **FM10. A secret or a forbidden catalog:** only `pg_auth_members` (oids and options), `pg_roles`, `pg_proc`, `pg_class`, `pg_attribute`, `pg_depend`, `pg_extension`; no `pg_authid`. Seen in: V4 passes on 25 and 26; the output has role and privilege names only.
- **FM11. The dev run reads live:** the settings file fails to load and `scripts/db` falls back to `.env.local`. Fix: `|| exit 1`, `${DATABASE_URL:?}`, and the `guard_dev` `\gset`. Seen in: line 1 of [26] is `database phaser_june_dev`.
- **FM12. Server version:** `inherit_option` and `set_option` need PG 16+; both servers are 17.5 [01]. On an older server the query errors loudly, which is fail fast, and acceptable. The extension owner may differ in the copy: if any `grant extension` line differs between 25 and 26, record it as a fact.

## Risks / open questions

- **Live can change mid-mission** (Danby's WSL content build, another mission). V5's rerun diff shows it. Record it as drift; never fix the database.
- **Release rebase:** `origin/main` may have touched `db/schema.sql`, `AGENTS.md` or the docs. Resolve keeping both, then rerun Verification. The map pins code `file:line` refs to `62c63c32`. If `git diff --stat 62c63c32 origin/main -- src scripts deploy init` shows cited files changed, say so in the Summary rather than chase refs.
- **The E2E reads live** through `.env.local`; the game writes nothing. If a timing check fails while every invariant passes, rerun once and record both runs.
- **P04's dev route** (`-d phaser_june_dev` as `postgres`) is untried, and its header says so. It is for a later mission; not tested here, because that would be a write.
- **Out of the brief's doc list:** the `DRIZZLE_ORM_GUIDE.md:39` copy of the change rule stays (S2's Decision line). The Summary names it for the owner.

## Code review (Astra)

`astra-review --code origin/main` on `675e8197` (base `62c63c32`), 2026-11-26, exit 0. Six MUST-FIX items, all real: S7-S12 fix them. Fetch from this session worked: `origin/main` is still `62c63c32`, the merge base (its SHOULD-CONSIDER 3).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. [db/proposals/01-read-only-agent-role.sql:82](/srv/critter-ai/worktrees/cc-schema-map/db/proposals/01-read-only-agent-role.sql:82) — `writes_none` can pass while the reader can still create persistent large objects through PostgreSQL’s default function privileges. P05 only removes temporary-table access. Verify that boundary or narrow the read-only guarantee. [PostgreSQL large-object functions](https://www.postgresql.org/docs/17/lo-funcs.html)
2. [db/proposals/01-read-only-agent-role.sql:107](/srv/critter-ai/worktrees/cc-schema-map/db/proposals/01-read-only-agent-role.sql:107) — The rollback grants PUBLIC `CONNECT` even if dev was already closed before P01. After a normal dev refresh, copied reader grants also survive `DROP OWNED` on live and make `DROP ROLE` fail. Preserve the prior access state and account for grants in both databases. [Refresh procedure](/srv/critter-ai/worktrees/cc-schema-map/docs/DATABASE_ACCESS.md:224) · [PostgreSQL `DROP OWNED`](https://www.postgresql.org/docs/17/sql-drop-owned.html)
3. [db/analysis/schema-check.sql:36](/srv/critter-ai/worktrees/cc-schema-map/db/analysis/schema-check.sql:36) — The grant output discards `is_grantable`. Giving `critter_app` grant option on its existing `species` SELECT produces an identical report despite allowing it to grant access to others.
4. [docs/DATABASE_SCHEMA.md:331](/srv/critter-ai/worktrees/cc-schema-map/docs/DATABASE_SCHEMA.md:331) — Queries 09/19 omit fields such as `countries.iso_a2` and hash IUCN geometries independently of row IDs. They cannot establish identical content. The saved outputs also show **7 SVG paths and 9 GeoJSON values** differ, affecting **10 distinct species**.
5. [docs/DATABASE_SCHEMA.md:305](/srv/critter-ai/worktrees/cc-schema-map/docs/DATABASE_SCHEMA.md:305) — The map says `critter_app` can SELECT every relation. Query 07 shows it lacks SELECT on `iucn`, `habitat_colormap` and all three imported-schema tables.
6. [docs/DATABASE_SCHEMA.md:358](/srv/critter-ai/worktrees/cc-schema-map/docs/DATABASE_SCHEMA.md:358) — A dev settings file pointing at live passes the nonempty-variable check, compares live against itself and returns a clean diff. Assert the expected database before collecting each snapshot.

SHOULD-CONSIDER:

- [db/proposals/02-drop-redundant-indexes.sql:49](/srv/critter-ai/worktrees/cc-schema-map/db/proposals/02-drop-redundant-indexes.sql:49) — Verify the covering indexes’ leading columns and predicates. A same-name replacement passes the current guard.
- [docs/DATABASE_SCHEMA.md:30](/srv/critter-ai/worktrees/cc-schema-map/docs/DATABASE_SCHEMA.md:30) — The content build resets four sequences. The IUCN importer advances the fifth through its column default.
- Recheck remote freshness before the PR. This review covered `agent/cc-schema-map` at `675e8197` against local `origin/main` at `62c63c32`. Fetch was blocked and the remote lookup failed.

## Code review (Gemini)

## Release

## Decisions

- 2026-11-26 · Scope: A6 adds one Docs Map line (AGENTS.md), one Related line (docs/DATABASE_ACCESS.md) and the map + check to the change rule (AGENTS.md:55, db/schema.sql header), past the brief's "change those facts only": the brief creates the map and check, and with nothing pointing at them and a change rule that skips them, the next schema change drifts them unseen. No database fact changes (Fable SC2).
- 2026-11-26 · Revision: both reviews' 8 MUST-FIX items resolved (db-designer: .mmd parse, cardinality, proposal target guards, P01 scope; architect: clue column order, check-query privilege gaps, AGENTS.md change rule). Astra SC1 (P03 exact timestamp restore) rejected: values unread and wrong; the pre-run dump keeps them. Fable SC1 (cite schema.sql by object) adopted. No second review round, per pipeline.
- 2026-11-26 · S2: the change rule's third copy, `docs/CLUE_MATCH.md`'s Database section, follows the A6 decision (same words as AGENTS.md). `docs/DRIZZLE_ORM_GUIDE.md:39` stays: not in the brief's doc list, and its query-change step doesn't contradict the rule.
- 2026-11-26 · S5: handoff item is **H23** (`Blocks: nothing`): P01-P05 one line each with risk + recommendation, F2 as code-only, no file-ahead line (S3).
- 2026-11-26 · S6: V7 read as passing: the 3 import tables' headings are schema-qualified (`` `natural_earth.countries` ``, `` `oneearth.oneearth_bioregion` ``, `` `oneearth.eco_sym_colors` ``), so the literal unqualified grep misses them. V9 read on the branch's added lines (none match): its whole-file grep hits only lines already on `origin/main` (localhost tunnel ports, the Docker-internal db address, a `<password>` placeholder).
- 2026-11-26 · Astra code review: all 6 MUST-FIX adopted as S7-S12. SHOULD-CONSIDER 2 (sequence reset wording) folded into S10, being one line of the same doc. SHOULD-CONSIDER 1 (P02's guard should check the covering indexes' columns, not just their names) left for the owner: P02 is a draft he may never pick; in the Summary.
- 2026-11-26 · S8: not comment-only as the step's check says: one read-only `SELECT` added to P01's Before block, since "only if the pre-checks showed it" needs a pre-check that prints it before the REVOKE.

## Log

- 2026-11-26 09:05 UTC · Baseline: typecheck, lint, 186/186 unit, e2e:fresh 1563/1563 pass; artifact `e2e-s0-baseline/`.
- 2026-11-26 09:50 UTC · Architecture A: split stage into A/B/C; db-designer mapped live+dev (24 read-only query files in `queries/`), wrote `docs/DATABASE_SCHEMA.md`, `db/analysis/schema-check.sql`, Data model (12 schema.sql objects: 7 match, 5 file-behind; F1 medium + F2–F6 low), `db/proposals/01`–`05`. Query files checked (wrapper, no writes); typecheck, lint, 186/186 unit pass.
- 2026-11-26 09:55 UTC · Architecture B: db-designer added the profile `~/.diagram-design/profiles/critter-connect.md`, the `.diagram-design` marker, `docs/schema/phaser-june.mmd` (11 entities, 118 cols, 8 links) and light/dark HTML+SVG renders, embedded in `DATABASE_SCHEMA.md` (fixed iucn numeric(65,30) and ranges cardinality). SVGs parse, light render checked by eye in headless Chrome; typecheck, lint pass.
- 2026-11-26 10:10 UTC · Architecture C: architect wrote Architecture (A1–A2 medium: check query misses default ACLs; stale schema.sql line refs; A3–A6 low), docs DB facts all verified correct (pointers only), target design: 6 ordered edits. Plan-only change; no DB access.
- 2026-11-26 10:25 UTC · Fable review: APPROVE WITH CHANGES, 3 MUST-FIX (.mmd bare `%%` breaks Mermaid parse; species_deduction_clues column order needs two moves; iucn/oneearth logical links should be zero-or-one). Plan-only change.
- 2026-11-26 10:12 UTC · Astra review: APPROVE_WITH_CHANGES, 5 MUST-FIX (proposals must assert target DB before DDL; P01 grants too broad, scope off pg_read_all_data; check query misses memberships/column/function grants; Mermaid parse + cardinality; deduction-clues column order), 2 SHOULD-CONSIDER. Plan-only change.
- 2026-11-26 10:26 UTC · Revision: db-designer fixed .mmd parse (real Mermaid 12.2.0 parse: 11/118/8), iucn/eco_sym cardinality in .mmd+renders+map, target-DB guards on P01–P05 (proven read-only [28]), P01 scoped off pg_read_all_data (+ dev-copy PUBLIC CONNECT revoke); architect revised target design (clue order 2 moves, check-query memberships/column/extension grants, AGENTS.md change rule, cite schema.sql by object). Lint, typecheck pass.
- 2026-11-26 10:37 UTC · Steps: planner wrote S1–S6 (check-query privileges, schema.sql edits + change rule copies, object-by-object check record, cite by object, handoff H23, full Verification), Verification V1–V10, Failure modes. Plan-only change.
- 2026-11-26 10:40 UTC · S1: schema-check.sql reads NULL database/function ACLs as defaults, adds role memberships, column grants and per-extension grant sums (`k of n`); header names the expected dev diff. Ran [25] live / [26] dev read-only: diffs exactly as predicted (7 extension lines; dev +PUBLIC CONNECT,TEMPORARY; 25 vs 26 owners + db grants only). Typecheck, lint pass.
- 2026-11-26 10:43 UTC · S2: `db/schema.sql` matches live (header change rule + extensions + eco_sym_colors kept; species/clue column order; habitat_colormap PK/NOT NULL, A3 comment); change rule + pointers in AGENTS.md, CLUE_MATCH.md, DATABASE_ACCESS.md. same-order x5 vs [25], CI guards empty, 186/186 unit, typecheck, lint pass.
- 2026-11-26 10:50 UTC · S3: read [25] against the edited `db/schema.sql` and `deploy/db/app-role.sql` object by object (no parser, no new query): 12 of 12 match (5 fixed by S2), app-role matches; view md5s equal in [05]/[20]/[25]/[26]; dev diff owners + db grants only. Recorded under `## Schema check result`. Nothing file-ahead, so no extra handoff line. Typecheck, lint pass.
- 2026-11-26 10:47 UTC · S4: map + proposals 02/04 cite `db/schema.sql` by object, not line; file-behind sentences rewritten for the S2 state; A3/A5 applied; grants section gets S1's extension sums. `schema\.sql:[0-9]` grep empty, proposals comment-only diff, V8 ok x5, typecheck, lint pass.
- 2026-11-26 10:49 UTC · S5: added H23 to `/srv/critter-ai/handoff/critter-connect.md` (format fields all present; no secret, IP or connection string). Typecheck, lint pass.
- 2026-11-26 11:05 UTC · S6: full Verification on `c5e1c485`. V1 e2e:fresh 1563/1563, artifact `/srv/critter-ai/agent-state/missions/cc-schema-map/e2e-final/`. V2 typecheck, lint, 186/186 unit, CI guards empty. V3 scope empty, schema.sql hunks header + Content only. V4 scan-done (01-29). V5 [29] rerun = [25] (diff empty), same-order x5, 12/12 still. V6 parse 11,118,8, self_check + geometry 0 findings x2, SVGs parse, entities-match, fks-match, 11/11 in 4 renders, links + embed, profile + marker. V7 every relation headed (3 schema-qualified), all sections, no `schema.sql:N`. V8 ok x5. V9 no added line matches. V10 H23 open, waiting, Blocks nothing, P01-P05 + reply.
- 2026-11-26 11:30 UTC · Astra code review: APPROVE_WITH_CHANGES, 6 MUST-FIX (P01 large objects + rollback, grant options, content-hash claim, critter_app wording, rerun database assert) -> S7-S12; 3 SHOULD-CONSIDER. Plan-only change.
- 2026-11-26 11:14 UTC · S7: P01 read-only claim narrowed to no-relation-writes (temp tables + large objects remain, [30]); comment-only diff; H23 P01 line updated. V4 (01-30), V8 5 ok, typecheck, lint pass.
- 2026-11-26 11:16 UTC · S8: P01 rollback covers both databases (copy's DROP OWNED first) and restores PUBLIC CONNECT only if the new pre-check `dev_public_connect_before` was t ([31] live: t); refresh note added. V8 5 ok, typecheck, lint pass.
- 2026-11-26 11:19 UTC · S9: schema-check.sql marks grant-option privileges `*` in all 6 aclexplode branches; [32]/[33] reruns identical to [25]/[29]/[26] (nothing grantable today), [34] literal-ACL check shows `INSERT*`. V4 scan clean, typecheck, lint pass.

## Schema check result

From S3, 2026-11-26. `$Q/25-live-schema-check.out` (live `phaser_june`, the committed `db/analysis/schema-check.sql` of S1) read against `db/schema.sql` at S2's commit `3003afa3` and `deploy/db/app-role.sql`, object by object, by eye. No parser, no scratch database, no new query.

| Object | Result | How it was read, and what was done |
|---|---|---|
| Header: "Also needed" (`iucn`, `oneearth.oneearth_bioregion`, `natural_earth.countries`) | matches | all three are `relation ... table` lines in [25] |
| Header: Extensions line | matches | [25] `extension`: `pg_stat_statements` 1.11, `pgcrypto` 1.3, `plpgsql` 1.0 (`pg_catalog`), `postgis` 3.5.2, `uuid-ossp` 1.1; the line names the four, plus plpgsql as built in. Differed before S2 (named only postgis and pgcrypto): S2 rewrote it |
| Header: `oneearth.eco_sym_colors` kept | matches | [25] has the table (PK `eco_sym`, hex CHECK); the header names it as kept (Q18). Not mentioned before S2: S2 added the line |
| `content_sources` | matches | 6 columns in order, types, NOT NULLs, `DEFAULT ''`; `content_sources_pkey`, `content_sources_key_key UNIQUE (key)`, `content_sources_tier_check` (`tier >= 1 AND tier <= 4` is `BETWEEN 1 AND 4`); 2 indexes, both from the constraints |
| `species` | matches | 16 columns in live's order (`created_at`, `updated_at` at 10-11), `timestamptz NOT NULL DEFAULT now()`; `species_pkey`, `species_iucn_id_key UNIQUE (iucn_id)`; no other index. Column order differed before S2: S2 moved two lines |
| `species_deduction_clues` | matches | 10 columns in live's order (`..., is_filtering, created_at, species_id, source_key, source_url`); the 9-value category CHECK in the same order; `species_id` FK `ON DELETE CASCADE`, `source_key` FK to `content_sources(key)` with no action; `uq_deduction_clues_species_cat_order` unique index (an index, not a constraint, in both), `ix_deduction_clues_species`, `_category`, `_compare` (gin). Column order differed before S2: S2 made the two moves |
| `species_facts` | matches | 7 columns in order; `species_facts_species_id_category_sort_order_key UNIQUE`, both FKs (`species_id` cascades); `ix_species_facts_species`, `_category` |
| `habitat_colormap` | matches | `value integer NOT NULL` with `habitat_colormap_pkey PRIMARY KEY (value)`, `label text NOT NULL`. Differed before S2 (no key, no NOT NULLs): S2 added them, and A3's comment |
| `clue_match_ranges` | matches | the hand-written SQL read CTE by CTE against [25]'s `pg_get_viewdef` (`playable`, `ranges`, `kept`, `merged`, `parts`, `shapes`, `simple`, the 6 output columns; thresholds 0.05, 0.3/0.01/30, rounding 2, `1e6`). Live adds only implicit casts (`s.iucn_id::numeric`, `ANY (ARRAY[1::numeric, 2::numeric])`). md5 `df5c94a5...` in [05], [20], [25] and [26]: unchanged. `clue_match_ranges_species_id` unique index |
| `clue_match_places` | matches | read the same way: the 5 `country_parts` branches (France < -30 and > 40, Russia's two envelopes at 60°E, IDN west and IDP east of Lydekker's Line at 133.2 / 130 and -3.5), `LEAST(0.05 * area, 5e9)`, `HAVING count(*) >= 2`, the 12 output columns, rounding 3, outline `LEAST(0.1, GREATEST(0.01, sqrt / 100))`. Live adds only casts (`l.part::box3d`). md5 `bb614da8...` in all four runs: unchanged. `clue_match_places_key` unique index |
| The grant `DO` block | matches | [25]: `grant clue_match_places to critter_app SELECT`, `grant clue_match_ranges to critter_app SELECT` |
| Serial sequences | matches | the file's 4 `serial` columns have their 4 `integer` sequences, each `owned by` its `id` in [25]. The 5th, `iucn_ogc_fid_seq`, belongs to the imported `iucn` (left out by design, below) |
| `deploy/db/app-role.sql` | matches | `grant database to critter_app CONNECT`, `grant schema public to critter_app USAGE`, SELECT on exactly its 6 relations, no sequence grant, `role critter_app login settings {statement_timeout=15s}`. The file creates the role NOLOGIN, and its header gives the owner's `ALTER ROLE ... LOGIN` step, which was done: live is as the file says |
| Left out by design | covered by the map | `iucn`, `oneearth.*`, `natural_earth.countries` and their keys, indexes and `iucn_ogc_fid_seq`; the schemas `oneearth` and `natural_earth` (owner `postgres`) and `public`'s default (`pg_database_owner`, PUBLIC USAGE); extension members (7 `grant extension` sums, S1's Result). All in `docs/DATABASE_SCHEMA.md`. `grant database to PUBLIC TEMPORARY` is in neither file: finding F6, P05. PUBLIC EXECUTE on the 46 `pgcrypto`/`uuid-ossp` functions: F5, P04 |

**Result:** 12 of 12 match, plus `app-role.sql`. Five of them (the extensions line, `eco_sym_colors`, `species`, the clues, `habitat_colormap`) were "file behind" and S2 fixed them by hand; the database wasn't touched. Nothing is "file ahead", so S5 gets no drift line. `diff 20 25` changes no `view` line, so live's view definitions haven't moved since [05].

**Dev copy** (`diff 25 26`): line 1 (database name), the owners of the 2 import schemas and the 16 relations (`postgres` vs `critter_dev`), and the database grants (live `PUBLIC TEMPORARY` + `critter_app CONNECT`; copy `PUBLIC CONNECT,TEMPORARY`, its default ACL). Nothing else: columns, constraints, indexes, both view definitions, table grants and the 7 extension sums are identical. Both are by design (`docs/DATABASE_SCHEMA.md#dev-copy-phaser_june_dev`); the copy's PUBLIC CONNECT is closed by P01.

**Rerun** (a later mission), from the repo root:

```bash
./scripts/db -qAt -f db/analysis/schema-check.sql > /tmp/schema-check-live.out
( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy || exit 1; set +a
  : "${DATABASE_URL:?dev-copy settings not loaded}"
  ./scripts/db -qAt -f db/analysis/schema-check.sql > /tmp/schema-check-dev.out )
head -1 /tmp/schema-check-*.out                                # each names its database
diff /tmp/schema-check-live.out /tmp/schema-check-dev.out      # owners and the database's grants only
```

Then read the live output against `db/schema.sql` as this table does. Under a mission's query-log rule, copy the file into `queries/` with the `current_database()` guard first, as [25] and [26] were built.

## Summary
