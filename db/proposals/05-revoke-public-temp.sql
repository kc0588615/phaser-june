-- DRAFT: not applied. Proposal 05 (cc-schema-map, finding F6; docs/DATABASE_SCHEMA.md#roles-and-grants).
--
-- Revokes PUBLIC's TEMPORARY privilege on phaser_june. The database still grants it by default (datacl
-- {=T/postgres,...}, query log 07). So critter_app, which M13 made SELECT-only, can still create temporary
-- tables, and fill disk with them, through any bug in the app's SQL. postgres keeps TEMPORARY through its own entry.
--
-- Run as postgres on phaser_june, naming the target (a missing or different name stops before any change):
--   ./scripts/db -v target=phaser_june -f db/proposals/05-revoke-public-temp.sql
-- Live only. The dev copy isn't touched here: only critter_dev, its owner, and postgres use it, and proposal 01
-- closes PUBLIC's CONNECT there, which leaves PUBLIC's TEMPORARY on it unusable.
-- Same later change: deploy/db/app-role.sql carries the REVOKE, because a database recreated for a restore starts
-- from the default ACL again.
--
-- Risk:
--   - Locks: none on any table; it updates one row of pg_database.
--   - Data loss: none.
--   - Players: nothing. No code here creates a temporary table: src/ sends only the SELECTs in docs/DATABASE_SCHEMA.md,
--     and scripts/ and the content build run as postgres.
--   - Sessions already connected keep any temporary tables they hold until they end.
\set ON_ERROR_STOP on
BEGIN;

-- Before: the named target is this database and is live, and PUBLIC (hence critter_app) holds TEMPORARY.
\if :{?target}
\else
  \echo 'Stopped: name the target, -v target=phaser_june. Nothing was changed.'
  \set target '(not set)'
\endif
SELECT current_database() AS connected_to, :'target' AS target;
SELECT 1 / (current_database() = :'target' AND :'target' = 'phaser_june')::int AS guard_target;
SELECT 1 / has_database_privilege('critter_app', 'phaser_june', 'TEMPORARY')::int AS app_has_temp_before;
SELECT 1 / has_database_privilege('postgres', 'phaser_june', 'TEMPORARY')::int AS postgres_has_temp;

REVOKE TEMPORARY ON DATABASE phaser_june FROM PUBLIC;

-- After: critter_app can't create temporary tables; it still connects; postgres keeps its own grant.
SELECT 1 / (NOT has_database_privilege('critter_app', 'phaser_june', 'TEMPORARY'))::int AS app_has_no_temp;
SELECT 1 / has_database_privilege('critter_app', 'phaser_june', 'CONNECT')::int AS app_still_connects;
SELECT datacl FROM pg_database WHERE datname = 'phaser_june';

COMMIT;

-- Rollback:
--   GRANT TEMPORARY ON DATABASE phaser_june TO PUBLIC;
