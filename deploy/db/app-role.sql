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

-- Read: the Clue Match pool, the globe's places, range maps.
GRANT SELECT ON species, species_deduction_clues, species_facts, content_sources, clue_match_places, clue_match_ranges TO critter_app;

-- Write: a player's profile on first solve, and each solve.
GRANT SELECT, INSERT, UPDATE ON profiles TO critter_app;
GRANT SELECT, INSERT ON clue_match_solves TO critter_app;
GRANT USAGE ON SEQUENCE clue_match_solves_id_seq TO critter_app;

-- A statement that runs away can't hold a connection for long.
ALTER ROLE critter_app SET statement_timeout = '15s';

COMMIT;
