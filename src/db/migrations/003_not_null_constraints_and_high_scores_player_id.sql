-- =============================================================================
-- Migration 003: Add NOT NULL constraints and high_scores.player_id
-- =============================================================================
-- Fixes:
--   [P0] Nullable FK columns bypass unique constraint (NULL bypass attack)
--   [P1] Type/schema mismatch - fields must be required per TypeScript types
--   [P2] high_scores lacks FK to profiles for authenticated player tracking
--
-- This migration includes backfills to ensure no NULLs exist before constraints.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1A: Backfill player_game_sessions before NOT NULL constraints
-- =============================================================================
UPDATE player_game_sessions SET
  started_at = COALESCE(started_at, created_at, NOW()),
  total_moves = COALESCE(total_moves, 0),
  total_score = COALESCE(total_score, 0),
  species_discovered_in_session = COALESCE(species_discovered_in_session, 0),
  clues_unlocked_in_session = COALESCE(clues_unlocked_in_session, 0),
  created_at = COALESCE(created_at, NOW())
WHERE started_at IS NULL
   OR total_moves IS NULL
   OR total_score IS NULL
   OR species_discovered_in_session IS NULL
   OR clues_unlocked_in_session IS NULL
   OR created_at IS NULL;

-- =============================================================================
-- PART 1B: Add NOT NULL constraints to player_game_sessions
-- =============================================================================
-- Pre-check: Fail if any player_id is NULL (cannot backfill FK)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM player_game_sessions WHERE player_id IS NULL) THEN
    RAISE EXCEPTION 'Found rows with NULL player_id in player_game_sessions. Delete orphans first.';
  END IF;
END $$;

ALTER TABLE player_game_sessions
  ALTER COLUMN player_id SET NOT NULL,
  ALTER COLUMN started_at SET NOT NULL,
  ALTER COLUMN total_moves SET NOT NULL,
  ALTER COLUMN total_score SET NOT NULL,
  ALTER COLUMN species_discovered_in_session SET NOT NULL,
  ALTER COLUMN clues_unlocked_in_session SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE player_game_sessions
  ALTER COLUMN total_moves SET DEFAULT 0,
  ALTER COLUMN total_score SET DEFAULT 0,
  ALTER COLUMN species_discovered_in_session SET DEFAULT 0,
  ALTER COLUMN clues_unlocked_in_session SET DEFAULT 0;

-- =============================================================================
-- PART 2A: Backfill player_species_discoveries before NOT NULL constraints
-- =============================================================================
UPDATE player_species_discoveries SET
  discovered_at = COALESCE(discovered_at, NOW()),
  clues_unlocked_before_guess = COALESCE(clues_unlocked_before_guess, 0),
  incorrect_guesses_count = COALESCE(incorrect_guesses_count, 0),
  score_earned = COALESCE(score_earned, 0)
WHERE discovered_at IS NULL
   OR clues_unlocked_before_guess IS NULL
   OR incorrect_guesses_count IS NULL
   OR score_earned IS NULL;

-- =============================================================================
-- PART 2B: Add NOT NULL constraints to player_species_discoveries
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM player_species_discoveries WHERE player_id IS NULL OR species_id IS NULL) THEN
    RAISE EXCEPTION 'Found rows with NULL player_id or species_id in player_species_discoveries. Delete orphans first.';
  END IF;
END $$;

ALTER TABLE player_species_discoveries
  ALTER COLUMN player_id SET NOT NULL,
  ALTER COLUMN species_id SET NOT NULL,
  ALTER COLUMN discovered_at SET NOT NULL,
  ALTER COLUMN clues_unlocked_before_guess SET NOT NULL,
  ALTER COLUMN incorrect_guesses_count SET NOT NULL,
  ALTER COLUMN score_earned SET NOT NULL;

ALTER TABLE player_species_discoveries
  ALTER COLUMN clues_unlocked_before_guess SET DEFAULT 0,
  ALTER COLUMN incorrect_guesses_count SET DEFAULT 0,
  ALTER COLUMN score_earned SET DEFAULT 0;

-- =============================================================================
-- PART 3A: Backfill player_clue_unlocks before NOT NULL constraints
-- =============================================================================
UPDATE player_clue_unlocks SET
  unlocked_at = COALESCE(unlocked_at, NOW())
WHERE unlocked_at IS NULL;

-- =============================================================================
-- PART 3B: Add NOT NULL constraints to player_clue_unlocks
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM player_clue_unlocks WHERE player_id IS NULL OR species_id IS NULL) THEN
    RAISE EXCEPTION 'Found rows with NULL player_id or species_id in player_clue_unlocks. Delete orphans first.';
  END IF;
END $$;

ALTER TABLE player_clue_unlocks
  ALTER COLUMN player_id SET NOT NULL,
  ALTER COLUMN species_id SET NOT NULL,
  ALTER COLUMN unlocked_at SET NOT NULL;

-- Note: discovery_id remains NULLABLE (clues can be unlocked before discovery)

-- =============================================================================
-- PART 4A: Backfill player_stats before NOT NULL constraints
-- =============================================================================
UPDATE player_stats SET
  total_species_discovered = COALESCE(total_species_discovered, 0),
  total_clues_unlocked = COALESCE(total_clues_unlocked, 0),
  total_score = COALESCE(total_score, 0),
  total_moves_made = COALESCE(total_moves_made, 0),
  total_games_played = COALESCE(total_games_played, 0),
  total_play_time_seconds = COALESCE(total_play_time_seconds, 0),
  species_by_order = COALESCE(species_by_order, '{}'::jsonb),
  species_by_family = COALESCE(species_by_family, '{}'::jsonb),
  species_by_genus = COALESCE(species_by_genus, '{}'::jsonb),
  species_by_realm = COALESCE(species_by_realm, '{}'::jsonb),
  species_by_biome = COALESCE(species_by_biome, '{}'::jsonb),
  species_by_bioregion = COALESCE(species_by_bioregion, '{}'::jsonb),
  marine_species_count = COALESCE(marine_species_count, 0),
  terrestrial_species_count = COALESCE(terrestrial_species_count, 0),
  freshwater_species_count = COALESCE(freshwater_species_count, 0),
  aquatic_species_count = COALESCE(aquatic_species_count, 0),
  species_by_iucn_status = COALESCE(species_by_iucn_status, '{}'::jsonb),
  clues_by_category = COALESCE(clues_by_category, '{}'::jsonb),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE total_species_discovered IS NULL
   OR total_clues_unlocked IS NULL
   OR total_score IS NULL
   OR total_moves_made IS NULL
   OR total_games_played IS NULL
   OR total_play_time_seconds IS NULL
   OR species_by_order IS NULL
   OR species_by_family IS NULL
   OR species_by_genus IS NULL
   OR species_by_realm IS NULL
   OR species_by_biome IS NULL
   OR species_by_bioregion IS NULL
   OR marine_species_count IS NULL
   OR terrestrial_species_count IS NULL
   OR freshwater_species_count IS NULL
   OR aquatic_species_count IS NULL
   OR species_by_iucn_status IS NULL
   OR clues_by_category IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- =============================================================================
-- PART 4B: Add NOT NULL constraints to player_stats
-- =============================================================================
ALTER TABLE player_stats
  ALTER COLUMN total_species_discovered SET NOT NULL,
  ALTER COLUMN total_clues_unlocked SET NOT NULL,
  ALTER COLUMN total_score SET NOT NULL,
  ALTER COLUMN total_moves_made SET NOT NULL,
  ALTER COLUMN total_games_played SET NOT NULL,
  ALTER COLUMN total_play_time_seconds SET NOT NULL,
  ALTER COLUMN species_by_order SET NOT NULL,
  ALTER COLUMN species_by_family SET NOT NULL,
  ALTER COLUMN species_by_genus SET NOT NULL,
  ALTER COLUMN species_by_realm SET NOT NULL,
  ALTER COLUMN species_by_biome SET NOT NULL,
  ALTER COLUMN species_by_bioregion SET NOT NULL,
  ALTER COLUMN marine_species_count SET NOT NULL,
  ALTER COLUMN terrestrial_species_count SET NOT NULL,
  ALTER COLUMN freshwater_species_count SET NOT NULL,
  ALTER COLUMN aquatic_species_count SET NOT NULL,
  ALTER COLUMN species_by_iucn_status SET NOT NULL,
  ALTER COLUMN clues_by_category SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE player_stats
  ALTER COLUMN total_species_discovered SET DEFAULT 0,
  ALTER COLUMN total_clues_unlocked SET DEFAULT 0,
  ALTER COLUMN total_score SET DEFAULT 0,
  ALTER COLUMN total_moves_made SET DEFAULT 0,
  ALTER COLUMN total_games_played SET DEFAULT 0,
  ALTER COLUMN total_play_time_seconds SET DEFAULT 0,
  ALTER COLUMN marine_species_count SET DEFAULT 0,
  ALTER COLUMN terrestrial_species_count SET DEFAULT 0,
  ALTER COLUMN freshwater_species_count SET DEFAULT 0,
  ALTER COLUMN aquatic_species_count SET DEFAULT 0,
  ALTER COLUMN species_by_order SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_family SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_genus SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_realm SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_biome SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_bioregion SET DEFAULT '{}'::jsonb,
  ALTER COLUMN species_by_iucn_status SET DEFAULT '{}'::jsonb,
  ALTER COLUMN clues_by_category SET DEFAULT '{}'::jsonb;

-- =============================================================================
-- PART 5: Add NOT NULL to high_scores.created_at (with backfill)
-- =============================================================================
UPDATE high_scores SET created_at = NOW() WHERE created_at IS NULL;

ALTER TABLE high_scores
  ALTER COLUMN created_at SET NOT NULL;

-- =============================================================================
-- PART 6: Add player_id column to high_scores (optional FK for authenticated players)
-- =============================================================================
ALTER TABLE high_scores
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES profiles(user_id);

-- Full index (matches Drizzle schema - not partial to avoid drift)
CREATE INDEX IF NOT EXISTS ix_high_scores_player_id
  ON high_scores (player_id);

COMMIT;

-- =============================================================================
-- NOTE: player_stats drift repair is handled by the app's refreshPlayerStats()
-- function, called on discovery and session end. No migration-time repair needed.
-- =============================================================================
