-- Convert app-owned timestamps to timestamptz and align index/constraint names.
-- Assumes existing timestamps are stored in UTC; adjust 'UTC' if needed.

BEGIN;

-- Timestamp conversions
ALTER TABLE profiles
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE player_game_sessions
  ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN ended_at TYPE timestamptz USING ended_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE player_species_discoveries
  ALTER COLUMN discovered_at TYPE timestamptz USING discovered_at AT TIME ZONE 'UTC';

ALTER TABLE player_clue_unlocks
  ALTER COLUMN unlocked_at TYPE timestamptz USING unlocked_at AT TIME ZONE 'UTC';

ALTER TABLE player_stats
  ALTER COLUMN first_discovery_at TYPE timestamptz USING first_discovery_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_discovery_at TYPE timestamptz USING last_discovery_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE high_scores
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

COMMIT;

-- Rename foreign keys to fk_ prefix (update names if your DB differs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_game_sessions_player_id_fkey'
      AND conrelid = 'player_game_sessions'::regclass
  ) THEN
    ALTER TABLE player_game_sessions
      RENAME CONSTRAINT player_game_sessions_player_id_fkey
      TO fk_player_game_sessions_player_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_species_discoveries_player_id_fkey'
      AND conrelid = 'player_species_discoveries'::regclass
  ) THEN
    ALTER TABLE player_species_discoveries
      RENAME CONSTRAINT player_species_discoveries_player_id_fkey
      TO fk_player_species_discoveries_player_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_species_discoveries_species_id_fkey'
      AND conrelid = 'player_species_discoveries'::regclass
  ) THEN
    ALTER TABLE player_species_discoveries
      RENAME CONSTRAINT player_species_discoveries_species_id_fkey
      TO fk_player_species_discoveries_species_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_species_discoveries_session_id_fkey'
      AND conrelid = 'player_species_discoveries'::regclass
  ) THEN
    ALTER TABLE player_species_discoveries
      RENAME CONSTRAINT player_species_discoveries_session_id_fkey
      TO fk_player_species_discoveries_session_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_clue_unlocks_player_id_fkey'
      AND conrelid = 'player_clue_unlocks'::regclass
  ) THEN
    ALTER TABLE player_clue_unlocks
      RENAME CONSTRAINT player_clue_unlocks_player_id_fkey
      TO fk_player_clue_unlocks_player_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_clue_unlocks_species_id_fkey'
      AND conrelid = 'player_clue_unlocks'::regclass
  ) THEN
    ALTER TABLE player_clue_unlocks
      RENAME CONSTRAINT player_clue_unlocks_species_id_fkey
      TO fk_player_clue_unlocks_species_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_clue_unlocks_discovery_id_fkey'
      AND conrelid = 'player_clue_unlocks'::regclass
  ) THEN
    ALTER TABLE player_clue_unlocks
      RENAME CONSTRAINT player_clue_unlocks_discovery_id_fkey
      TO fk_player_clue_unlocks_discovery_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_stats_player_id_fkey'
      AND conrelid = 'player_stats'::regclass
  ) THEN
    ALTER TABLE player_stats
      RENAME CONSTRAINT player_stats_player_id_fkey
      TO fk_player_stats_player_id;
  END IF;
END $$;

-- Rename unique constraints (update names if your DB differs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_key'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles
      RENAME CONSTRAINT profiles_username_key TO uq_profiles_username;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_species_discoveries_player_id_species_id_key'
      AND conrelid = 'player_species_discoveries'::regclass
  ) THEN
    ALTER TABLE player_species_discoveries
      RENAME CONSTRAINT player_species_discoveries_player_id_species_id_key
      TO uq_player_species_discoveries_player_species;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'player_clue_unlocks_player_id_species_id_clue_category_clue_key'
      AND conrelid = 'player_clue_unlocks'::regclass
  ) THEN
    ALTER TABLE player_clue_unlocks
      RENAME CONSTRAINT player_clue_unlocks_player_id_species_id_clue_category_clue_key
      TO uq_player_clue_unlocks_player_species_category_field;
  END IF;
END $$;

-- Keep index names in sync (safe if indexes already renamed)
ALTER INDEX IF EXISTS profiles_username_key RENAME TO uq_profiles_username;
ALTER INDEX IF EXISTS player_species_discoveries_player_id_species_id_key
  RENAME TO uq_player_species_discoveries_player_species;
ALTER INDEX IF EXISTS player_clue_unlocks_player_id_species_id_clue_category_clue_key
  RENAME TO uq_player_clue_unlocks_player_species_category_field;

-- Optional: align import-owned spatial index names (may be overwritten by re-imports)
ALTER INDEX IF EXISTS idx_icaa_geometry RENAME TO ix_icaa_wkb_geometry;
ALTER INDEX IF EXISTS idx_bioregion_geometry RENAME TO ix_oneearth_bioregion_wkb_geometry;

-- Missing indexes for FKs and hot paths
CREATE INDEX IF NOT EXISTS ix_player_game_sessions_player_id
  ON player_game_sessions (player_id);

CREATE INDEX IF NOT EXISTS ix_player_species_discoveries_session_id
  ON player_species_discoveries (session_id);

CREATE INDEX IF NOT EXISTS ix_player_clue_unlocks_discovery_id
  ON player_clue_unlocks (discovery_id);

CREATE INDEX IF NOT EXISTS ix_high_scores_score
  ON high_scores (score DESC);
