-- DRAFT: not applied. Proposal 04 (cc-schema-map, finding F5; docs/DATABASE_SCHEMA.md#extensions-functions-triggers).
--
-- Drops pgcrypto and uuid-ossp.
--   - init/01-extensions.sql installed them on the first container start.
--   - No SQL in the repo calls them (db/schema.sql's header says so), and no object outside them depends
--     on them (query log 22: 0 dependents each, live and in the dev copy).
--   - Their 46 functions (pgcrypto 36, uuid-ossp 10) sit in public, executable by critter_app through PUBLIC (query log 24).
-- postgis, pg_stat_statements (monitoring) and plpgsql stay.
--
-- Every run names its target; a missing or different name stops before any change (scripts/db defaults to live).
-- Run as postgres, the extensions' owner; critter_dev can't drop them.
-- The dev copy first. No settings file gives postgres on the copy, so use .env.local's postgres login and switch the
-- database with psql's -d, which overrides the URL's database. PgBouncer routes phaser_june_dev (docker-compose.yml,
-- pgbouncer DATABASE_URLS). cc-schema-map didn't try this route, since it read the copy only as critter_dev. If the
-- run lands anywhere else, the target guard stops it:
--   ./scripts/db -d phaser_june_dev -v target=phaser_june_dev -f db/proposals/04-drop-unused-extensions.sql
-- Then live, after a fresh dump (deploy/backup/pg-backup.sh on the server, AGENTS.md):
--   ./scripts/db -v target=phaser_june -f db/proposals/04-drop-unused-extensions.sql
-- Same later change: init/01-extensions.sql and init/README.md lose the two, and db/schema.sql's header lists the
-- extensions that stay.
--
-- Risk:
--   - Locks: catalog only. No app table is touched.
--   - Data loss: none. The extensions hold no data, only functions and types.
--   - Players: nothing. The app never calls them, and RESTRICT stops the drop if anything depends on them.
--   - A tool of the owner's outside the repo (QGIS, a saved query) that calls gen_random_uuid() keeps working: that is
--     core Postgres since 13. Calls to uuid_generate_v4(), crypt() or digest() would fail. Check with the owner first
--     (handoff line).
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the named target is this database, and nothing outside each extension depends on its members.
\if :{?target}
\else
  \echo 'Stopped: name the target, -v target=phaser_june_dev (rehearsal) or -v target=phaser_june (live). Nothing was changed.'
  \set target '(not set)'
\endif
SELECT current_database() AS connected_to, :'target' AS target;
SELECT 1 / (current_database() = :'target' AND :'target' IN ('phaser_june_dev', 'phaser_june'))::int AS guard_target;
WITH members AS (
  SELECT de.classid, de.objid
  FROM pg_depend de JOIN pg_extension e ON e.oid = de.refobjid
  WHERE de.refclassid = 'pg_extension'::regclass AND de.deptype = 'e' AND e.extname IN ('pgcrypto', 'uuid-ossp')
)
SELECT 1 / (count(*) = 0)::int AS no_outside_dependents
FROM pg_depend d JOIN members m ON d.refclassid = m.classid AND d.refobjid = m.objid
WHERE d.deptype <> 'e' AND NOT EXISTS (SELECT 1 FROM members x WHERE x.classid = d.classid AND x.objid = d.objid);

DROP EXTENSION pgcrypto, "uuid-ossp" RESTRICT;

-- After: postgis, pg_stat_statements and plpgsql remain.
SELECT 1 / (count(*) = 0)::int AS dropped FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp');
SELECT extname, extversion FROM pg_extension ORDER BY 1;

COMMIT;

-- Rollback (the same versions, 1.3 and 1.1, are the server's defaults):
--   BEGIN;
--   CREATE EXTENSION pgcrypto SCHEMA public;
--   CREATE EXTENSION "uuid-ossp" SCHEMA public;
--   COMMIT;
