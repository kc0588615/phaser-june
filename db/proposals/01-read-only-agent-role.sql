-- DRAFT: not applied. Proposal 01 (cc-schema-map, finding F1; docs/DATABASE_SCHEMA.md#roles-and-grants).
--
-- A read-only login role, critter_reader, for agents' and scripts' read-only work on the live phaser_june. Today every
-- agent session connects as postgres, a superuser (rolsuper and rolbypassrls), so a read-only task stays read-only only
-- because its query file opens with BEGIN TRANSACTION READ ONLY. With this role, the role enforces it. Writes (content
-- builds, view refreshes, range imports, schema changes) keep using postgres, as the owner decided on 2026-11-01.
--
-- How: pg_read_all_data (SELECT on every table, view, matview and sequence, and USAGE on every schema, now and later),
-- CONNECT on phaser_june (PUBLIC has none), default_transaction_read_only, and a 30 s statement_timeout.
-- Run once, as postgres, on phaser_june (roles are cluster-wide; the dev copy's default ACL already lets it connect):
--   ./scripts/db -f db/proposals/01-read-only-agent-role.sql
-- Then the owner, once, in ./scripts/db:  \password critter_reader  and  ALTER ROLE critter_reader LOGIN;
-- and a new settings file beside the dev-copy one, e.g. /srv/critter-ai/agent-state/secrets/critter-connect.env.local.read-only
-- (mode 600), the same DATABASE_URL with this role. PgBouncer needs no change: other roles log in through its auth_user
-- (docker-compose.yml, pgbouncer service).
--
-- Risk: catalog writes only. No lock on any app table, no rewrite, no data change, nothing players see.
--   pg_read_all_data reads every table, including any future one; today none holds data about people (M13).
--   If such a table ever arrives, revisit this grant.
--   A session can turn off default_transaction_read_only, but the role still has no write privilege anywhere.
--   The one exception is PUBLIC's TEMPORARY on the database, which proposal 05 removes.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the right database, and no such role yet.
SELECT 1 / (current_database() = 'phaser_june')::int AS guard_live;
SELECT 1 / (count(*) = 0)::int AS role_absent FROM pg_roles WHERE rolname = 'critter_reader';

CREATE ROLE critter_reader NOLOGIN;
GRANT pg_read_all_data TO critter_reader;
GRANT CONNECT ON DATABASE phaser_june TO critter_reader;
ALTER ROLE critter_reader SET default_transaction_read_only = on;
ALTER ROLE critter_reader SET statement_timeout = '30s';

-- After: it reads everything and can write nothing (each check fails loud).
SELECT rolname, rolsuper, rolcanlogin, rolconfig FROM pg_roles WHERE rolname = 'critter_reader';
SELECT 1 / (bool_and(has_table_privilege('critter_reader', c.oid, 'SELECT')))::int AS reads_all,
       1 / (NOT bool_or(has_table_privilege('critter_reader', c.oid, 'INSERT, UPDATE, DELETE, TRUNCATE')))::int AS writes_none
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'oneearth', 'natural_earth') AND c.relkind IN ('r', 'v', 'm');
SELECT 1 / (NOT has_schema_privilege('critter_reader', 'public', 'CREATE'))::int AS no_create_in_public;

COMMIT;

-- Rollback (as postgres, any time; nothing depends on the role):
--   BEGIN;
--   REVOKE CONNECT ON DATABASE phaser_june FROM critter_reader;
--   REVOKE pg_read_all_data FROM critter_reader;
--   DROP ROLE critter_reader;
--   COMMIT;
