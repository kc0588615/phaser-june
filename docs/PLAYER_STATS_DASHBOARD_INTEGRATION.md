# PlayerStatsDashboard Integration

The dashboard is mounted at `/stats` and loads `player_stats` through `src/lib/playerStatsService.ts` for the signed-in Clerk profile. Tracking tables today: `profiles` (Clerk mapping), `player_stats` (aggregates), `player_game_sessions`, `player_species_discoveries`, `high_scores`, `eco_run_sessions` / `eco_run_nodes` / `eco_node_attempts` / `eco_node_gis_samples`, `eco_location_mastery`, `run_memories`, `species_cards`, and `species_card_unlocks`.
