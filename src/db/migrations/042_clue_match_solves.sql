-- Clue Match: one row per solved mystery, so play can be analyzed with SQL
-- (db/analysis/clue-match/07_solve_stats.sql). Written by POST /api/clue-game/solves.
-- Anonymous play is kept (player_id NULL); signed-in players get their profile id.
BEGIN;
SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS clue_match_solves (
  id              bigserial PRIMARY KEY,
  player_id       uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  session_seed    bigint NOT NULL CHECK (session_seed BETWEEN 1 AND 4294967295),
  round           smallint NOT NULL CHECK (round BETWEEN 1 AND 10000),
  species_id      integer NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  moves           smallint NOT NULL CHECK (moves BETWEEN 0 AND 10000),
  wrong_guesses   smallint NOT NULL CHECK (wrong_guesses BETWEEN 0 AND 5),
  clues_seen      smallint NOT NULL CHECK (clues_seen BETWEEN 0 AND 1000),
  relatives       smallint NOT NULL CHECK (relatives BETWEEN 0 AND 5),
  points          integer NOT NULL CHECK (points BETWEEN 0 AND 1000),
  -- Clues and notes read per gem color, e.g. {"red": 2, "blue": 1}.
  revealed_by_gem jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(revealed_by_gem) = 'object'),
  solved_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_clue_match_solves_species ON clue_match_solves (species_id);
CREATE INDEX IF NOT EXISTS ix_clue_match_solves_player ON clue_match_solves (player_id) WHERE player_id IS NOT NULL;

COMMIT;
