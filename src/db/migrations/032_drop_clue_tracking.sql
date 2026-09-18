BEGIN;
ALTER TABLE player_stats
  DROP COLUMN IF EXISTS total_clues_unlocked,
  DROP COLUMN IF EXISTS average_clues_per_discovery,
  DROP COLUMN IF EXISTS fastest_discovery_clues,
  DROP COLUMN IF EXISTS slowest_discovery_clues,
  DROP COLUMN IF EXISTS clues_by_category,
  DROP COLUMN IF EXISTS favorite_clue_category;
ALTER TABLE player_game_sessions      DROP COLUMN IF EXISTS clues_unlocked_in_session;
ALTER TABLE player_species_discoveries DROP COLUMN IF EXISTS clues_unlocked_before_guess;
ALTER TABLE eco_node_attempts         DROP COLUMN IF EXISTS clues_unlocked;
ALTER TABLE species_cards             DROP COLUMN IF EXISTS clue_categories_unlocked;
COMMIT;
