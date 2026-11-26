-- DRAFT: not applied. Proposal 02 (cc-schema-map, finding F4; docs/DATABASE_SCHEMA.md#content-tables-public).
--
-- Drops four btree indexes whose keys are the leading columns of a unique index on the same table, so Postgres can
-- use the unique index for every lookup they serve (including the ON DELETE CASCADE from species):
--   ix_deduction_clues_species  (species_id)            and ix_deduction_clues_category (species_id, category)
--     are covered by uq_deduction_clues_species_cat_order (species_id, category, reveal_order);
--   ix_species_facts_species    (species_id)            and ix_species_facts_category  (species_id, category)
--     are covered by species_facts_species_id_category_sort_order_key (species_id, category, sort_order).
-- Every content build deletes and re-inserts all clues and facts, maintaining these four for nothing.
--
-- Every run names its target; a missing or different name stops before any change (scripts/db defaults to live).
-- The dev copy first (CI's e2e reads it), as critter_dev, its owner. Load its settings so that a failed load stops,
-- since scripts/db would otherwise fall back to .env.local, which is live:
--   ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy || exit 1; set +a
--     : "${DATABASE_URL:?dev-copy settings not loaded}"
--     ./scripts/db -v target=phaser_june_dev -f db/proposals/02-drop-redundant-indexes.sql )
-- Then live, as postgres, after a fresh dump (deploy/backup/pg-backup.sh on the server, AGENTS.md):
--   ./scripts/db -v target=phaser_june -f db/proposals/02-drop-redundant-indexes.sql
-- Not CONCURRENTLY: DROP INDEX CONCURRENTLY can't run inside a transaction. These tables are tiny (3,653 and 491 rows),
-- so a plain DROP holds its lock for milliseconds, and all four drops commit or roll back together.
-- Afterwards db/schema.sql loses its four CREATE INDEX lines (ix_deduction_clues_species, ix_deduction_clues_category,
-- ix_species_facts_species, ix_species_facts_category).
--
-- Risk:
--   - Locks: ACCESS EXCLUSIVE on species_deduction_clues and species_facts until COMMIT, a few milliseconds.
--     A /api/clue-game/pool request arriving then waits that long. lock_timeout gives up after 5 s rather than queue
--     players behind a long reader; if it times out, nothing changed: rerun it later.
--   - Rewrites and data loss: none.
--   - Players: nothing, apart from that wait.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the named target is this database, the four indexes are as described, and both covering unique indexes
-- are valid.
\if :{?target}
\else
  \echo 'Stopped: name the target, -v target=phaser_june_dev (rehearsal) or -v target=phaser_june (live). Nothing was changed.'
  \set target '(not set)'
\endif
SELECT current_database() AS connected_to, :'target' AS target;
SELECT 1 / (current_database() = :'target' AND :'target' IN ('phaser_june_dev', 'phaser_june'))::int AS guard_target;
SELECT 1 / (count(*) = 4)::int AS four_redundant FROM pg_indexes
WHERE schemaname = 'public' AND (indexname, indexdef) IN (
  ('ix_deduction_clues_species', 'CREATE INDEX ix_deduction_clues_species ON public.species_deduction_clues USING btree (species_id)'),
  ('ix_deduction_clues_category', 'CREATE INDEX ix_deduction_clues_category ON public.species_deduction_clues USING btree (species_id, category)'),
  ('ix_species_facts_species', 'CREATE INDEX ix_species_facts_species ON public.species_facts USING btree (species_id)'),
  ('ix_species_facts_category', 'CREATE INDEX ix_species_facts_category ON public.species_facts USING btree (species_id, category)'));
SELECT 1 / (count(*) = 2)::int AS covering_valid FROM pg_index
WHERE indisunique AND indisvalid AND indexrelid IN ('public.uq_deduction_clues_species_cat_order'::regclass,
                                                    'public.species_facts_species_id_category_sort_order_key'::regclass);

DROP INDEX public.ix_deduction_clues_species, public.ix_deduction_clues_category,
           public.ix_species_facts_species, public.ix_species_facts_category RESTRICT;

-- After: gone, and per-species lookups use the unique indexes (plain EXPLAIN).
SELECT 1 / (count(*) = 0)::int AS dropped FROM pg_class
WHERE relname IN ('ix_deduction_clues_species', 'ix_deduction_clues_category', 'ix_species_facts_species', 'ix_species_facts_category');
SET LOCAL enable_seqscan = off;  -- the tables are small enough that the planner would otherwise scan them
EXPLAIN SELECT id FROM species_deduction_clues WHERE species_id = 1;
EXPLAIN SELECT id FROM species_facts WHERE species_id = 1 AND category = 'key_fact';

COMMIT;

-- Rollback (the four CREATE INDEX lines in db/schema.sql; each builds in well under a second):
--   BEGIN;
--   SET LOCAL lock_timeout = '5s';
--   CREATE INDEX ix_deduction_clues_species ON species_deduction_clues (species_id);
--   CREATE INDEX ix_deduction_clues_category ON species_deduction_clues (species_id, category);
--   CREATE INDEX ix_species_facts_species ON species_facts (species_id);
--   CREATE INDEX ix_species_facts_category ON species_facts (species_id, category);
--   COMMIT;
