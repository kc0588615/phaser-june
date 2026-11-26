-- DRAFT: not applied. Proposal 04 (cc-schema-map, finding F5; docs/DATABASE_SCHEMA.md#extensions-functions-triggers).
--
-- Drops pgcrypto and uuid-ossp.
--   - init/01-extensions.sql installed them on the first container start.
--   - No SQL in the repo calls them (db/schema.sql:13 already says so for pgcrypto), and no object outside them depends
--     on them (query log 22: 0 dependents each, live and in the dev copy).
--   - Their 46 functions (pgcrypto 36, uuid-ossp 10) sit in public, executable by critter_app through PUBLIC (query log 24).
-- postgis, pg_stat_statements (monitoring) and plpgsql stay.
--
-- Run as postgres (extension owner) on the dev copy first, then live (after a fresh dump). critter_dev can't drop them.
--   ./scripts/db -f db/proposals/04-drop-unused-extensions.sql
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
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the right database, and nothing outside each extension depends on its members.
SELECT 1 / (current_database() IN ('phaser_june', 'phaser_june_dev'))::int AS guard;
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
