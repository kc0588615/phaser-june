-- critter_app: the web app's own database role, with only what the running app
-- needs (src/lib/*.ts, src/app/api/**). Content builds (`npm run content`) and
-- schema changes keep using the owner role. Safe to rerun.
--
-- The role is created without a login. To switch the app over, as the owner:
--   ALTER ROLE critter_app LOGIN PASSWORD '<a new strong password>';
-- then put it in deploy/app.env (docs/DEPLOY.md). Undo: DROP OWNED BY critter_app; DROP ROLE critter_app;
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'critter_app') THEN
    CREATE ROLE critter_app NOLOGIN;
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO critter_app', current_database());
END $$;

GRANT USAGE ON SCHEMA public TO critter_app;

-- Read only. A restored dump brings back the grants it was taken with (one from
-- before 2026-11-15 21:23 UTC also the old player tables' writes), so take everything back first.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM critter_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM critter_app;

-- Read: the Clue Match pool, the globe's places, range maps.
GRANT SELECT ON species, species_deduction_clues, species_facts, content_sources, clue_match_places, clue_match_ranges TO critter_app;

-- A statement that runs away can't hold a connection for long.
ALTER ROLE critter_app SET statement_timeout = '15s';

COMMIT;
