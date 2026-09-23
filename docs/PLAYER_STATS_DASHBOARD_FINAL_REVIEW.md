# PlayerStatsDashboard — Final Review

> **2026-09-22 (plan 039):** `src/components/PlayerStatsDashboard/` was never mounted and has been deleted. `/stats` now renders `ProfileContent` from `/api/player/profile`. The review below is historical.

`/stats` (`src/pages/stats.tsx`, `src/components/PlayerStatsDashboard/`) reads `player_stats` for discovery, score, play-time, taxonomy, geography, habitat, and IUCN aggregates. Clue-era columns are gone; the dashboard no longer shows clue tiles. `profiles` maps Clerk users to player ids and is not truncated with the rest of player progress.
