BEGIN;
TRUNCATE TABLE
  player_stats, player_game_sessions, player_species_discoveries, high_scores,
  eco_run_sessions, eco_run_nodes, eco_node_attempts, eco_node_gis_samples,
  eco_location_mastery, run_memories, species_cards, species_card_unlocks
  RESTART IDENTITY CASCADE;
DROP TABLE IF EXISTS species_combat_traits;
DROP TABLE IF EXISTS conservation_statuses;
COMMIT;
