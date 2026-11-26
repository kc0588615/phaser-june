-- DRAFT: not applied. Proposal 03 (cc-schema-map, finding F3; docs/DATABASE_SCHEMA.md#species).
--
-- Drops species.created_at, species.updated_at and species_deduction_clues.created_at.
--   - Nothing reads them: no code under src/ or scripts/, no test, no practice SQL, and no view.
--   - The content build never sets them (scripts/content.ts:28-37 upserts only the profile's columns).
--   - So species.updated_at is wrong: live, 48 of 76 rows still have updated_at = created_at, and the newest is
--     2026-09-30, though the build rewrote rows through 2026-11-24 (query log 08 and 02).
--   - species_deduction_clues.created_at only records the last build, because the build deletes and re-inserts every clue.
-- The real record of content changes is git history of db/content/. The alternative, a trigger that stamps
-- updated_at, would stamp every row on every build (the upsert rewrites all of them), which is no better.
--
-- Every run names its target; a missing or different name stops before any change (scripts/db defaults to live).
-- The dev copy first, as critter_dev, its owner. Load its settings so that a failed load stops, since scripts/db
-- would otherwise fall back to .env.local, which is live:
--   ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy || exit 1; set +a
--     : "${DATABASE_URL:?dev-copy settings not loaded}"
--     ./scripts/db -v target=phaser_june_dev -f db/proposals/03-drop-unread-timestamps.sql )
-- Then live, as postgres, after a fresh dump (deploy/backup/pg-backup.sh on the server, AGENTS.md):
--   ./scripts/db -v target=phaser_june -f db/proposals/03-drop-unread-timestamps.sql
-- Afterwards db/schema.sql loses the three column lines (species created_at/updated_at, the clues' created_at).
--
-- Risk:
--   - Locks: ACCESS EXCLUSIVE on species and species_deduction_clues until COMMIT, milliseconds.
--     DROP COLUMN only marks the columns dropped; there is no table rewrite. Pool and places requests wait that long.
--     lock_timeout gives up after 5 s instead; nothing changes then: rerun later.
--   - Data loss: the three columns' values. They are unread and partly wrong; the fresh dump before the live run keeps them.
--   - What players see: nothing.
--   - Both views read species and species_deduction_clues but not these columns. RESTRICT stops the drop if anything
--     depends on them.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the named target is this database, the columns exist, and no view or other object depends on them (only
-- their own defaults).
\if :{?target}
\else
  \echo 'Stopped: name the target, -v target=phaser_june_dev (rehearsal) or -v target=phaser_june (live). Nothing was changed.'
  \set target '(not set)'
\endif
SELECT current_database() AS connected_to, :'target' AS target;
SELECT 1 / (current_database() = :'target' AND :'target' IN ('phaser_june_dev', 'phaser_june'))::int AS guard_target;
SELECT 1 / (count(*) = 3)::int AS three_columns FROM information_schema.columns
WHERE table_schema = 'public' AND (table_name, column_name) IN
  (('species', 'created_at'), ('species', 'updated_at'), ('species_deduction_clues', 'created_at'));
SELECT 1 / (count(*) = 0)::int AS no_dependents
FROM pg_depend d JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
WHERE d.refclassid = 'pg_class'::regclass
  AND d.refobjid IN ('public.species'::regclass, 'public.species_deduction_clues'::regclass)
  AND a.attname IN ('created_at', 'updated_at')
  AND d.classid <> 'pg_attrdef'::regclass;

ALTER TABLE species DROP COLUMN created_at RESTRICT, DROP COLUMN updated_at RESTRICT;
ALTER TABLE species_deduction_clues DROP COLUMN created_at RESTRICT;

-- After: gone; the game's pool queries (src/lib/cluePool.ts:13-22) still plan (plain EXPLAIN).
SELECT 1 / (count(*) = 0)::int AS dropped FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('species', 'species_deduction_clues') AND column_name IN ('created_at', 'updated_at');
EXPLAIN SELECT id, common_name, scientific_name, class, taxon_order, family, genus, conservation_code, redlist_url,
               photo_url, photo_credit, photo_license, photo_page FROM species;
EXPLAIN SELECT c.id, c.species_id, c.category, c.label, c.compare_tags, c.reveal_order, c.is_filtering, c.source_key
        FROM species_deduction_clues c;

COMMIT;

-- Rollback: the columns come back, with the rollback's time in every row. It doesn't restore the old values row by
-- row (declined in revision, Astra SC1): nothing reads them, species.updated_at is stale in 48 of 76 rows, and a clue's
-- created_at only records its last build, so an exact restore would bring back wrong data. The dump taken before the
-- live run keeps every old value, should anyone ever want one.
--   BEGIN;
--   SET LOCAL lock_timeout = '5s';
--   ALTER TABLE species ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
--   ALTER TABLE species_deduction_clues ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
--   COMMIT;
-- (now() is stable, so ADD COLUMN stores it once as a fast default: no table rewrite.)
