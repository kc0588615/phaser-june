# Player Tracking Implementation Summary

`src/lib/playerTracking.ts` starts and ends game sessions and rebuilds `player_stats`. `Game.ts` posts only `endGameSession` (on scene shutdown) through `POST /api/player/track`, which validates the totals and closes a still-open session once; plan 039 removed the route's discovery and session-progress actions. A correct expedition guess also writes `player_species_discoveries`, `species_cards`, and `species_card_unlocks`. `player_stats` is rebuilt from those tables. Clue-era counters are gone.
