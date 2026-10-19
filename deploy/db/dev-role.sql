-- critter_dev: the Oracle VPS agents' role. Owns phaser_june_dev (a copy of
-- phaser_june, docs/DATABASE_ACCESS.md#agents-on-the-oracle-vps) and has no
-- access to prod. Run as postgres in phaser_june after each copy; safe to rerun.
-- The login password is set once by the owner (\password critter_dev).
-- Undo: DROP DATABASE phaser_june_dev; DROP ROLE critter_dev;
--       GRANT CONNECT ON DATABASE phaser_june TO PUBLIC;
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'critter_dev') THEN
    CREATE ROLE critter_dev NOLOGIN;
  END IF;
END $$;
ALTER ROLE critter_dev SET statement_timeout = '60s';

-- Close prod to PUBLIC, after granting every role that connects today (all the
-- login roles there are, 2026-10-18): critter_app (live app, straight to the db
-- container) and postgres (superuser: PgBouncer auth_user, QGIS, postgres-mcp,
-- WSL agents, backups).
GRANT CONNECT ON DATABASE phaser_june TO critter_app, postgres;
REVOKE CONNECT ON DATABASE phaser_june FROM PUBLIC;
ALTER DATABASE phaser_june_dev OWNER TO critter_dev;

\connect phaser_june_dev
BEGIN;

-- No player identities in the copy; solves stay, anonymous.
UPDATE clue_match_solves SET player_id = NULL WHERE player_id IS NOT NULL;
DELETE FROM profiles;

-- critter_dev owns every app object (content builds, range imports, view
-- refreshes, schema changes). Extension objects (PostGIS) stay postgres's.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT nspname FROM pg_namespace WHERE nspname IN ('oneearth', 'natural_earth') LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO critter_dev', r.nspname);
  END LOOP;
  FOR r IN
    SELECT c.oid::regclass AS obj,
           CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END AS kind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
      -- serial/identity sequences move with their table
      AND NOT (c.relkind = 'S' AND EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i')))
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO critter_dev', r.kind, r.obj);
  END LOOP;
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'oneearth', 'natural_earth')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO critter_dev', r.fn);
  END LOOP;
END $$;

COMMIT;
