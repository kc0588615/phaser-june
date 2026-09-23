# PlayerStatsDashboard Integration

`/stats` (`src/pages/stats.tsx`) renders `ProfileContent`, which reads `/api/player/profile`. The old `PlayerStatsDashboard` component and `src/lib/playerStatsService.ts` were never mounted and were deleted on 2026-09-22 (plan 039). Tracking tables today: `profiles` (Clerk mapping), `player_stats` (aggregates), `player_game_sessions`, `player_species_discoveries`, `high_scores`, `eco_run_sessions` / `eco_run_nodes` / `eco_node_attempts` / `eco_node_gis_samples`, `eco_location_mastery`, `run_memories`, `species_cards`, and `species_card_unlocks`.
