-- DRAFT: not applied. Proposal 01 (cc-schema-map, finding F1; docs/DATABASE_SCHEMA.md#roles-and-grants).
--
-- A read-only login role, critter_reader, for agents' and scripts' read-only work on the live phaser_june. Today every
-- agent session connects as postgres, a superuser (rolsuper and rolbypassrls), so a read-only task stays read-only only
-- because its query file opens with BEGIN TRANSACTION READ ONLY. With this role, the role enforces it. Writes (content
-- builds, view refreshes, range imports, schema changes) keep using postgres, as the owner decided on 2026-11-01.
--
-- Scope: live only, and only the mapped objects (revised after the Astra review; query log 27):
--   - CONNECT on phaser_june; USAGE on public, oneearth and natural_earth; SELECT on the map's 11 tables and
--     materialized views and the 5 sequences of public. Catalogs, and the PostGIS and pg_stat_statements relations,
--     it reads through PUBLIC, like every role.
--   - Not pg_read_all_data: that predefined role reads every table of every database on the cluster, the dev copy
--     included.
--   - REVOKE CONNECT ON DATABASE phaser_june_dev FROM PUBLIC. The copy keeps the default ACL, so today any role can
--     connect to it, critter_app included [27], and so could this one. Who still connects after it: critter_dev, the
--     copy's owner (CI's e2e, docs/DATABASE_ACCESS.md), and postgres, a superuser. Nothing else uses the copy (git grep).
--   - No default privileges. A table added later stays closed to this role until someone grants it
--     (GRANT SELECT ON <schema.table> TO critter_reader;), so a future table about people is never readable by accident.
--   - default_transaction_read_only and a 30 s statement_timeout.
--   - What's left, catalogs only: PUBLIC's CONNECT on the maintenance database postgres and on template1 [27].
--     PgBouncer routes neither (docker-compose.yml, pgbouncer DATABASE_URLS), and neither holds app data.
--
-- Run once, as postgres, on phaser_june, naming the target (a missing or different name stops before any change):
--   ./scripts/db -v target=phaser_june -f db/proposals/01-read-only-agent-role.sql
-- The role is created NOLOGIN. Read the post-checks' output (effective access) first. Then the owner, once, in
-- ./scripts/db:  \password critter_reader  and  ALTER ROLE critter_reader LOGIN;
-- Then a settings file beside the dev-copy one, /srv/critter-ai/agent-state/secrets/critter-connect.env.local.read-only
-- (mode 600): the same DATABASE_URL with this role. PgBouncer needs no change: other roles log in through its
-- auth_user (docker-compose.yml, pgbouncer service). Load the file so that a failed load stops: scripts/db otherwise
-- falls back to .env.local, which is postgres, and the role protects nothing:
--   ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.read-only || exit 1; set +a
--     : "${DATABASE_URL:?read-only settings not loaded}"
--     [ "$(./scripts/db -tA -c 'select current_user')" = critter_reader ] || { echo 'FAIL: not critter_reader'; exit 1; }
--     ./scripts/db -f <query file> )
-- Same later change: deploy/db/dev-role.sql gains the REVOKE CONNECT on phaser_june_dev, because a refreshed copy
-- starts from the default ACL again; docs/DATABASE_ACCESS.md gives read-only work this route.
--
-- Risk:
--   - Locks and data: catalog writes only, no rewrite, no data change. lock_timeout caps any wait at 5 s.
--   - Players: nothing. The live app connects only to phaser_june, as critter_app.
--   - The dev copy: from then on only critter_dev and postgres can connect. Sessions already open keep running.
--   - A session can turn off default_transaction_read_only, but the role holds no write privilege anywhere. The one
--     exception is PUBLIC's TEMPORARY on phaser_june, which proposal 05 removes.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Before: the named target is this database and is live, the copy exists, and there's no such role yet.
\if :{?target}
\else
  \echo 'Stopped: name the target, -v target=phaser_june. Nothing was changed.'
  \set target '(not set)'
\endif
SELECT current_database() AS connected_to, :'target' AS target;
SELECT 1 / (current_database() = :'target' AND :'target' = 'phaser_june')::int AS guard_target;
SELECT 1 / (count(*) = 1)::int AS dev_copy_exists FROM pg_database WHERE datname = 'phaser_june_dev';
SELECT 1 / (count(*) = 0)::int AS role_absent FROM pg_roles WHERE rolname = 'critter_reader';

CREATE ROLE critter_reader NOLOGIN;
GRANT CONNECT ON DATABASE phaser_june TO critter_reader;
GRANT USAGE ON SCHEMA public, oneearth, natural_earth TO critter_reader;
GRANT SELECT ON public.species, public.species_deduction_clues, public.species_facts, public.content_sources,
                public.habitat_colormap, public.iucn, public.clue_match_ranges, public.clue_match_places,
                natural_earth.countries, oneearth.oneearth_bioregion, oneearth.eco_sym_colors TO critter_reader;
GRANT SELECT ON SEQUENCE public.species_id_seq, public.species_deduction_clues_id_seq, public.species_facts_id_seq,
                public.content_sources_id_seq, public.iucn_ogc_fid_seq TO critter_reader;
ALTER ROLE critter_reader SET default_transaction_read_only = on;
ALTER ROLE critter_reader SET statement_timeout = '30s';
REVOKE CONNECT ON DATABASE phaser_june_dev FROM PUBLIC;

-- After, while it still can't log in: what the role can actually do (has_*_privilege counts PUBLIC's grants too).
-- Each check fails loud.
SELECT rolname, rolsuper, rolcanlogin, rolconfig FROM pg_roles WHERE rolname = 'critter_reader';
SELECT 1 / (NOT rolsuper AND NOT rolcanlogin AND NOT rolbypassrls)::int AS plain_nologin
FROM pg_roles WHERE rolname = 'critter_reader';
SELECT 1 / (count(*) = 0)::int AS member_of_nothing
FROM pg_auth_members WHERE member = 'critter_reader'::regrole;
-- Every relation and sequence in the three schemas readable (a table created since this draft fails here: decide
-- whether to grant it); none writable.
SELECT 1 / bool_and(CASE WHEN c.relkind = 'S' THEN has_sequence_privilege('critter_reader', c.oid, 'SELECT')
                         ELSE has_table_privilege('critter_reader', c.oid, 'SELECT') END)::int AS reads_all,
       1 / (NOT bool_or(CASE WHEN c.relkind = 'S' THEN has_sequence_privilege('critter_reader', c.oid, 'USAGE, UPDATE')
                             ELSE has_table_privilege('critter_reader', c.oid,
                                                      'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') END))::int AS writes_none
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'oneearth', 'natural_earth') AND c.relkind IN ('r', 'p', 'v', 'm', 'S');
SELECT 1 / (NOT bool_or(has_schema_privilege('critter_reader', nspname, 'CREATE')))::int AS creates_nothing
FROM pg_namespace WHERE nspname IN ('public', 'oneearth', 'natural_earth');
SELECT 1 / (NOT has_database_privilege('critter_reader', 'phaser_june', 'CREATE'))::int AS no_create_schema;
-- Databases: live only for the reader; the copy still open to its owner; the live app unchanged. (reader_temp stays
-- true where PUBLIC keeps its default TEMPORARY, but without CONNECT it can't be used.)
SELECT d.datname,
       has_database_privilege('critter_reader', d.oid, 'CONNECT') AS reader_connect,
       has_database_privilege('critter_reader', d.oid, 'TEMPORARY') AS reader_temp,
       has_database_privilege('public', d.oid, 'CONNECT') AS public_connect
FROM pg_database d WHERE d.datallowconn ORDER BY 1;
SELECT 1 / has_database_privilege('critter_reader', 'phaser_june', 'CONNECT')::int AS reader_reaches_live,
       1 / (NOT has_database_privilege('critter_reader', 'phaser_june_dev', 'CONNECT'))::int AS reader_not_dev_copy,
       1 / has_database_privilege('critter_dev', 'phaser_june_dev', 'CONNECT')::int AS critter_dev_keeps_copy,
       1 / has_database_privilege('critter_app', 'phaser_june', 'CONNECT')::int AS app_keeps_live;

COMMIT;

-- Rollback (as postgres, on phaser_june, any time; nothing depends on the role). DROP OWNED BY revokes the role's
-- grants in this database and on the databases; the GRANT gives the copy back its earlier PUBLIC CONNECT:
--   BEGIN;
--   GRANT CONNECT ON DATABASE phaser_june_dev TO PUBLIC;
--   DROP OWNED BY critter_reader;
--   DROP ROLE critter_reader;
--   COMMIT;
