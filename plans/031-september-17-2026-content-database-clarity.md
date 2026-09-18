# Plan 031 — September 17, 2026: Content Database Clarity

Created 2026-09-17. Author: Claude (review of plan 030 and live database). Executor: Codex.

## Goal

Make the game's authored content (species, deduction profiles, evidence cards and hints, mystery cases, and the six-species pools they form) live entirely in PostgreSQL in a shape a human can read, query, and extend by hand. Remove every table, file, and code path left over from the retired per-gem trivia system. Do not change how a globe click harvests GIS waypoints and compiles an expedition; that generation path stays exactly as it is, it just reads the pool and cases from the database instead of from TypeScript constants.

The owner wants to author new species, profiles, evidence content, and cases themselves using `psql` and JSON seed files. Every design choice below favors "a person can understand this table by reading it" over cleverness.

## Verified state (2026-09-17, production database via tunnel)

| Table | Rows | Status |
|---|---|---|
| `species` | 50 | live; 48 columns; only 28 rows have prose fields filled |
| `species_deduction_profiles` | 28 | live; read by the run compiler |
| `evidence_family_cards` | 30 | live; 6 species × 5 families |
| `evidence_family_hints` | 120 | live |
| `cascade_hints` | 15 | live |
| `species_deduction_clues` | 371 | dead; only `scripts/seed-deduction.ts` writes it; runtime never reads it |
| `evidence_cards` | 132 | retired v1/v2; zero readers in `src/` or `scripts/` |
| `species_facts` | 218 | zero readers in `src/` or `scripts/` |
| `player_clue_unlocks` | ? | written only by the legacy free-play clue path |

Code facts that shape this plan:

- The candidate pool is the hardcoded array `EVIDENCE_PROTOTYPE_IUCN_IDS` in `src/lib/evidenceSeedValidation.ts`, and `PROTOTYPE_SPECIES_COUNT = 6` in `src/lib/caseTraits.ts`. `POST /api/runs` loads exactly those six and returns 503 otherwise.
- Every `evidence_family_cards` row is an exclusion aimed at one other pool member (for example `comparison_lineage:not_fruit_bat`). Cards are therefore only meaningful inside their pool. "Adding a species" means "authoring a pool of six".
- The six mystery cases are a hardcoded `Map` in `src/lib/mysteryCaseCatalog.server.ts`, looked up by IUCN id. They are the only authored content not in the database.
- The legacy per-gem trivia path is still compiled: `src/game/clueConfig.ts` (`GemCategory`, progressive `getClue` sequences), the `clue-revealed` emission branches in `src/game/scenes/Game.ts` (roughly lines 929–1030, plus `handleClueRevealed` near line 748 which posts `trackClueUnlock`), and the `clueCategory` field carried by `src/game/gemSemantics.ts` and `GEM_REGISTRY` in `src/expedition/domain.ts`. The expedition flow bypasses all of it via `inExpeditionRun`.
- `species` prose columns `key_fact_1..3`, `behavior_1..2`, `life_description_1..2` are repeating groups. Nothing in the deduction runtime reads them; the old `clueConfig.ts` was their only consumer.
- The GIS side (`harvestExpeditionWaypoints`, `applyWaypointsToRunNodes`, `buildAnswerPrior`, `deriveExpeditionMapView`, `eco_run_*` tables, PostGIS layers) is out of scope and must not be modified.

## Firm decisions (do not redesign)

1. **Pools become a table.** `case_pools` holds one row per six-species set; `case_pool_members` joins pools to species. The run compiler selects a `reviewed` pool instead of reading `EVIDENCE_PROTOTYPE_IUCN_IDS`. With one pool seeded, behavior is identical to today.
2. **Mystery cases become tables.** Six normalized tables plus one public view, schema given in Phase 2. The TypeScript catalog is deleted after the seed round-trips.
3. **Evidence cards and hints gain a `pool_id`.** A card's exclusion target only makes sense inside its pool, so the row must say which pool it belongs to. Existing rows are backfilled to the first pool.
4. **Validation moves toward the database.** Where a rule can be a `CHECK`, `UNIQUE`, partial unique index, or foreign key, it becomes one. TypeScript validators stay for rules the database cannot express (for example "no answer name appears in public copy") but are trimmed of anything now enforced by the schema.
5. **Dead tables are dropped**, not archived: `species_facts`, `species_deduction_clues`, `evidence_cards`, `player_clue_unlocks`. Take a `pg_dump -t` of each into `db/archive/` before dropping so nothing is lost.
6. **Repeating prose columns on `species` are dropped** (`key_fact_1..3`, `behavior_1..2`, `life_description_1..2`, `taxonomic_comment`, `distribution_comment`, `maturity`, `reproduction_type`, `clutch_size`, `lifespan`, `threats`) after confirming with `grep` that no runtime reader remains. The JSON seed dossiers in `db/seeds/deduction/*.json` keep this text under a `species` key; move that text into a new `species_notes` table (Phase 4) so the owner still has a place to keep it. Keep taxonomy, habitat, geography, color, size, and diet columns: `buildAnswerPrior` and the species album read them.
7. **Legacy trivia code is deleted**, not flagged: `clueConfig.ts`, the `clue-revealed` branches of `Game.ts`, `clueCategory` on gem definitions, `trackClueUnlock` in the player-tracking route. Free-play boards (a globe click outside an expedition) keep working as plain match-3 with no clue output.
8. **Seed loaders are the authoring interface.** One JSON file per pool under `db/seeds/pools/<pool-slug>/`, one loader script, idempotent upserts keyed on natural keys, `--check` and `--write` flags, whole load in one transaction. The owner authors by editing JSON and running the loader, or by writing SQL directly. Both must work.
9. **Migrations are plain SQL files** in `src/db/migrations/`, numbered from `027`. Each migration applies inside a transaction and is safe to re-run (`IF NOT EXISTS`, `IF EXISTS`). Update the Drizzle schema in `src/db/schema/*.ts` to match; do not use `drizzle-kit push`.
10. **No new tests unless a phase says so.** The repo has 31 test files. Add at most one test file in this plan (Phase 2, the seed round-trip). Extend existing tests only when a change breaks them. Do not write tests for SQL constraints; the database enforces those.
11. **Documentation is one file**: `docs/CONTENT_AUTHORING.md`, written in Phase 6. It replaces the content sections of `docs/DATABASE_USER_GUIDE.md`, `docs/DEDUCTION_CLUE_SYSTEM_PLAN.md`, and `db/seeds/evidence/README.md`. Delete or trim those after writing it.

## Execution rules

- Phases in order. Gate per phase: `npm run typecheck` clean, `npm run verify:case-compiler` passes (from Phase 1 onward it must read from the database), then `git commit` with a concise subject like `phase 2: mystery case tables`.
- Apply migrations to `phaser_june_rehearsal` first, then to production through the tunnel with `./scripts/db -1 -f src/db/migrations/0NN_name.sql`. Print the row counts before and after each production write. Never run a `DROP` in production until the archive dump in `db/archive/` exists and the phase's read path is already committed. There is no Vercel or remote deploy: the app runs as `next dev` on the owner's WSL machine against the Hetzner database, and hot-reloads committed code. "Deployed" in this plan means that commit exists and `npm run typecheck` passed. Docker is not available in WSL; the local rehearsal target is the same-server database `phaser_june_rehearsal` (a TEMPLATE copy of production made 2026-09-17), reached through the tunnel on 127.0.0.1:55432. Apply every migration there first.
- If a file cited here has moved or a signature differs, adapt minimally and note it in the commit body. If genuinely blocked, print `BLOCKED: <reason>` and stop.
- No npm installs. No changes under `src/lib/waypointHarvesting.ts`, `src/lib/answerPrior.ts`, `src/lib/gisFeatureSampling.ts`, `src/lib/expeditionRoute.ts`, `src/components/MapLibreExploreMap.tsx`, or any `eco_*` table.
- Do not run the dev server or a browser. Manual playtest is handled by the owner.
- Keep AGENTS.md's "prefer simplicity" rule in mind: no repositories, no service layers, no abstract base loaders. Plain Drizzle queries and plain SQL.

## Phase 1 — Pools

Migration `027_case_pools.sql`:

```sql
CREATE TABLE IF NOT EXISTS case_pools (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS case_pool_members (
  pool_id    bigint  NOT NULL REFERENCES case_pools(id) ON DELETE CASCADE,
  species_id integer NOT NULL REFERENCES species(id)    ON DELETE RESTRICT,
  PRIMARY KEY (pool_id, species_id)
);

ALTER TABLE evidence_family_cards ADD COLUMN IF NOT EXISTS pool_id bigint REFERENCES case_pools(id) ON DELETE CASCADE;
ALTER TABLE evidence_family_hints ADD COLUMN IF NOT EXISTS pool_id bigint REFERENCES case_pools(id) ON DELETE CASCADE;
```

Then in the same migration: insert the pool `prototype-six` with the six species whose `iucn_id` is in (512, 5748, 7140, 12763, 15955, 18732), backfill `pool_id` on both evidence tables, set both columns `NOT NULL`, and replace `uq_evidence_family_cards_species_family` with `UNIQUE (pool_id, species_id, family)` (same change for the hints unique index, adding `pool_id`). Set the pool to `reviewed`.

Pool size six is a compiler requirement, not a schema one. Enforce it in the loader and in `verify:case-compiler`, not with a trigger.

Code:

- Add `casePools` and `casePoolMembers` to `src/db/schema/species.ts`; add `poolId` to the two evidence tables.
- In `POST /api/runs`, replace the `EVIDENCE_PROTOTYPE_IUCN_IDS` query with: select one `reviewed` pool (there is one; if several exist, pick uniformly using the existing `caseSeed` stream so it stays deterministic per run), load its members, then load profiles, cards, and hints filtered by `pool_id`. Keep the 503 on a malformed pool.
- Delete `EVIDENCE_PROTOTYPE_IUCN_IDS`. Fix the four other importers (`fieldPlateCatalog.ts`, `seed-evidence-family.ts`, `verify-case-compiler.ts`, and the validation module itself) to take a pool from the database or from the seed file instead.
- `PROTOTYPE_SPECIES_COUNT` stays; rename it `POOL_SIZE`.

Gate: `verify:case-compiler` still validates all 360 evidence-family paths, now reading pool membership from the database.

## Phase 2 — Mystery case tables

Migration `028_mystery_cases.sql`:

```sql
CREATE TABLE IF NOT EXISTS mystery_cases (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pool_id       bigint  NOT NULL REFERENCES case_pools(id) ON DELETE CASCADE,
  species_id    integer NOT NULL REFERENCES species(id)    ON DELETE CASCADE,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text NOT NULL,
  incident      text NOT NULL,
  atmosphere    text NOT NULL,
  question      text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed')),
  UNIQUE (pool_id, species_id)
);

CREATE TABLE IF NOT EXISTS mystery_explanations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id     bigint NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  slug        text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text NOT NULL,
  description text NOT NULL,   -- public
  feedback    text NOT NULL,   -- private
  is_answer   boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL,
  UNIQUE (case_id, slug),
  UNIQUE (case_id, sort_order)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mystery_one_answer ON mystery_explanations (case_id) WHERE is_answer;

CREATE TABLE IF NOT EXISTS mystery_resolutions (
  case_id         bigint PRIMARY KEY REFERENCES mystery_cases(id) ON DELETE CASCADE,
  headline        text NOT NULL,
  diagnosis       text NOT NULL,
  ecological_role text NOT NULL,
  taxonomy        text NOT NULL,
  misconception   text NOT NULL
);

CREATE TABLE IF NOT EXISTS mystery_evidence_steps (
  case_id        bigint   NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  sequence_index smallint NOT NULL CHECK (sequence_index BETWEEN 0 AND 9),
  step_text      text NOT NULL,
  PRIMARY KEY (case_id, sequence_index)
);

CREATE TABLE IF NOT EXISTS mystery_rejected_alternatives (
  case_id        bigint   NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  sequence_index smallint NOT NULL CHECK (sequence_index BETWEEN 0 AND 9),
  alternative_text text NOT NULL,
  PRIMARY KEY (case_id, sequence_index)
);

CREATE TABLE IF NOT EXISTS mystery_sources (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id bigint NOT NULL REFERENCES mystery_cases(id) ON DELETE CASCADE,
  label   text NOT NULL,
  url     text NOT NULL CHECK (url LIKE 'https://%')
);

CREATE OR REPLACE VIEW mystery_cases_public AS
SELECT c.id AS case_id, c.pool_id, c.species_id, c.slug, c.title, c.incident, c.atmosphere, c.question,
       e.slug AS explanation_slug, e.label, e.description, e.sort_order
FROM mystery_cases c
JOIN mystery_explanations e ON e.case_id = c.id
WHERE c.review_status = 'reviewed';
```

Seed data: export the six cases from `mysteryCaseCatalog.server.ts` into `db/seeds/pools/prototype-six/cases/<slug>.json`, one file per case, same field names as `AuthoredMysteryCase` plus `species_iucn_id`. Write `scripts/seed-mystery-cases.ts` modeled on `seed-evidence-family.ts`: `--check` validates, `--write` upserts inside one transaction keyed on `slug`, deleting and reinserting child rows for each case it touches. Add `npm run seed:mystery-cases`.

Code:

- Add the Drizzle tables and the view to `src/db/schema/species.ts`.
- In `POST /api/runs`, replace `getMysteryCaseForIucnId` with a query that loads every `reviewed` case for the chosen pool and assembles `AuthoredMysteryCase` objects. Put that assembly in a small function in `src/lib/mysteryCase.ts` (which already owns the types), not a new module.
- Keep `validateAuthoredMysteryCase` but delete the checks now covered by constraints (slug format, HTTPS, one answer). Keep the answer-name leak check; that one cannot live in SQL.
- Delete `src/lib/mysteryCaseCatalog.server.ts`.

Test allowance for this plan: one file, `tests/lib/mysteryCaseSeed.test.ts`, asserting that a JSON case file parses into an `AuthoredMysteryCase` that passes `validateAuthoredMysteryCase`. Nothing else.

Gate: `verify:case-compiler` compiles all six cases from database rows. `npm run seed:mystery-cases -- --check` reports zero differences against production after `--write`.

## Phase 3 — Remove the legacy trivia path

Verify first with `grep -rn` that each item has no remaining reader beyond the ones named here, then delete:

- `src/game/clueConfig.ts` entirely. Move the `GemCategory` numeric enum only if something outside the clue path still needs it; the expected answer is nothing does once the branches below are gone.
- In `src/game/scenes/Game.ts`: `handleClueRevealed`, `revealAllCluesForCategory`, the progressive-clue helpers, the `revealedClues`, `completedClueCategories`, `seenClueCategories`, `clueCountThisSpecies`, `allCluesRevealed` fields, and the `clue-revealed` emits. The scene must still boot and play a free board when no expedition is active.
- `clueCategory` from `GemSemanticDef`, from `GEM_REGISTRY` in `src/expedition/domain.ts`, and `getClueCategoryForGemType`.
- `clue-revealed` from the `EventBus` type catalog and every listener.
- `trackClueUnlock` from `src/pages/api/player/track.ts` and `src/lib/playerTracking.ts`.

Do not touch `species_cards`, `species_card_unlocks`, `clue_categories_unlocked`, or the album components in this phase. They are a separate feature that may or may not survive; verify first whether the album still displays per-category progress, and if it only reads the legacy column, record that in the commit body for a later decision rather than acting on it.

Migration `029_drop_legacy_clue_tables.sql`, applied only after the Phase 3 code commit exists: archive with `pg_dump --data-only -t public.player_clue_unlocks` into `db/archive/2026-09-17-player_clue_unlocks.sql`, then `DROP TABLE IF EXISTS player_clue_unlocks`. Remove it from the Drizzle schema and `src/db/types.ts`.

Gate: typecheck clean, `npm test` passes (fix or delete tests that only exercised the deleted path; do not rewrite them against the new path).

## Phase 4 — Species table cleanup and notes

Migration `030_species_notes.sql`:

```sql
CREATE TABLE IF NOT EXISTS species_notes (
  species_id integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  topic      text NOT NULL CHECK (topic IN ('behavior', 'life_cycle', 'key_fact', 'taxonomy', 'distribution', 'reproduction', 'threats')),
  sort_order smallint NOT NULL CHECK (sort_order BETWEEN 1 AND 9),
  note_text  text NOT NULL,
  source_url text CHECK (source_url IS NULL OR source_url LIKE 'https://%'),
  PRIMARY KEY (species_id, topic, sort_order)
);
```

Backfill in the same migration with `INSERT ... SELECT` from the repeating columns for the 28 species that have them (one row per non-null column, `sort_order` from the column suffix). Then archive the old `species_facts`, `species_deduction_clues`, and `evidence_cards` tables to `db/archive/` and drop them. Finally drop the repeating prose columns listed in firm decision 6. Do this as three separate statements groups in one transaction with a `SELECT count(*)` after each so the output is readable.

Code:

- Update `speciesTable` in the Drizzle schema, `src/db/types.ts`, `src/types/database.ts`, and any component that displayed the dropped columns (expected: the species detail panel and album card; replace with a query on `species_notes`, or drop the display if it was only feeding the trivia path).
- Update `scripts/seed-deduction.ts`: stop writing `species_deduction_clues`; write the `species` JSON block's prose into `species_notes` instead; keep writing `species_deduction_profiles`. Rename it `seed-species.ts` and the npm script `seed:species`.
- Delete the `speciesDeductionClues` table definition, the clue-list functions in `src/lib/deductionEngine.ts` that consumed it, and the `species_facts` and `evidence_cards` definitions.

Gate: `verify:case-compiler` passes; `buildAnswerPrior` still receives every field it reads (it reads `habitatDescription`, `habitatTags`, `geographicDescription`, `distributionComment`, `conservationText`, `conservationCode`, `threats`, `marine`, `freshwater`). Note: `distributionComment` and `threats` are in the drop list. Either keep those two columns or extend `buildAnswerPrior`'s input to join `species_notes` topics `distribution` and `threats`. Keeping the two columns is the simpler answer; do that and remove them from the drop list.

## Phase 5 — Trait tag vocabulary

This phase is the one place where the database gets stricter about content the owner will type by hand.

Migration `031_trait_tags.sql`:

```sql
CREATE TABLE IF NOT EXISTS trait_tags (
  tag         text PRIMARY KEY CHECK (tag ~ '^[a-z_]+:[a-z0-9_]+$'),
  category    text NOT NULL CHECK (category IN ('habitat','morphology','diet','behavior','reproduction','taxonomy','key_fact','geography','conservation')),
  is_filtering boolean NOT NULL DEFAULT true,
  description text
);
```

Populate it from the canonical vocabulary in `src/lib/deductionTags.ts` (one `INSERT` per tag; generate the statements with a short script, commit the resulting SQL). Then add a trigger-free integrity check the owner can run by hand, as a view:

```sql
CREATE OR REPLACE VIEW deduction_profile_unknown_tags AS
SELECT p.species_id, t.tag
FROM species_deduction_profiles p
CROSS JOIN LATERAL unnest(
  p.habitat_tags || p.morphology_tags || p.diet_tags || p.behavior_tags || p.reproduction_tags
  || p.taxonomy_tags || p.geography_tags || p.conservation_tags || p.key_fact_tags
) AS t(tag)
LEFT JOIN trait_tags k ON k.tag = t.tag
WHERE k.tag IS NULL;
```

Do not convert the nine `text[]` columns into a junction table in this plan. The GIN-indexed arrays work, the compiler reads them directly, and a junction rewrite is a large change with no player-visible benefit. The lookup table plus the view gives the owner a way to catch typos with `SELECT * FROM deduction_profile_unknown_tags`. Make `seed-species.ts` fail on any tag missing from `trait_tags`, and make `deductionTags.ts` read its vocabulary list from a generated file or keep both in sync with a check in `verify:case-compiler`. Pick whichever is fewer lines.

Gate: the view returns zero rows in production.

## Phase 6 — Authoring documentation

Write `docs/CONTENT_AUTHORING.md` for a reader who knows basic SQL and is learning database design. It must contain:

- An entity diagram in text: `species` → `species_deduction_profiles` (1:1), `species` → `species_notes` (1:many), `case_pools` → `case_pool_members` → `species`, `case_pools` → `evidence_family_cards` / `evidence_family_hints`, `case_pools` → `mystery_cases` → explanations / resolution / steps / alternatives / sources, `trait_tags` as vocabulary.
- For each table, a two-line purpose statement and the one constraint that matters most (for example "exactly one explanation per case has `is_answer = true`, enforced by a partial unique index").
- The three authoring workflows, each as a numbered list with the exact commands:
  1. Add a species: JSON dossier in `db/seeds/species/`, `npm run seed:species -- --check`, then `--write`.
  2. Build a new pool: create the pool row, six members, thirty cards, hints, then cases, using the JSON layout under `db/seeds/pools/<slug>/`; run each loader's `--check`; run `verify:case-compiler`; flip `review_status` to `reviewed`.
  3. Edit content directly in SQL: a worked `UPDATE` inside `BEGIN ... COMMIT`, then `npm run seed:mystery-cases -- --check` to export the drift back into JSON or accept the JSON as truth.
- A short "what the database refuses" section listing the constraints an author will hit and the error text they produce.
- A short "what the code still checks" section for the rules that stay in TypeScript (pool size six, no answer-name leaks, 360-path compiler validation).

Correct the stale hosting line in `AGENTS.md` (line 24 says Vercel hosts the frontend; the app runs locally via `next dev` and only the database lives on the Hetzner VPS) and remove `vercel.json` plus the `vercel-build` npm script if `grep` shows nothing else depends on them. Then delete `db/seeds/evidence/README.md` and the empty directory, trim `docs/DATABASE_USER_GUIDE.md` and `docs/DEDUCTION_CLUE_SYSTEM_PLAN.md` to a one-paragraph pointer each, and update `docs/CODEBASE_TOUR.md` and `AGENTS.md` "Where Things Live" to remove `clueConfig.ts` and add the new seed directories.

## Explicit non-goals

- No change to GIS harvesting, waypoint spacing, answer prior, map view, or board rules.
- No junction-table rewrite of the profile tag arrays.
- No procedural case generation or second pool of content. The schema must support a second pool; this plan does not author one.
- No new test files beyond the single one named in Phase 2.
- No ORM migration tooling, no `drizzle-kit push`, no generated migration folders.
- No admin UI. `psql` and JSON are the interface.
- No change to run snapshot version 4 payloads. Clients must not notice this work.

## Done state

- Migrations 027 through 031 applied to `phaser_june_rehearsal` and then `phaser_june`, each with before/after counts printed in the commit body.
- `db/archive/` holds data-only dumps of every dropped table.
- `src/lib/mysteryCaseCatalog.server.ts`, `src/game/clueConfig.ts`, `EVIDENCE_PROTOTYPE_IUCN_IDS`, and all `species_deduction_clues` / `species_facts` / `evidence_cards` / `player_clue_unlocks` references are gone.
- `npm run typecheck`, `npm test`, `npm run verify:case-compiler`, and `npm run build` pass.
- `docs/CONTENT_AUTHORING.md` exists and its three workflows have each been executed once against `phaser_june_rehearsal`.
- Finish by printing the list of commits (hash and subject) and the final production row counts for every table in the entity diagram.
