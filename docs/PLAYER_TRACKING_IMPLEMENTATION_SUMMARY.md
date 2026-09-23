# Player Tracking Implementation Summary

`src/lib/playerTracking.ts` writes sessions and first discoveries; `Game.ts` posts only `endGameSession` (on scene shutdown) through `POST /api/player/track`; its never-wired mid-session and discovery posts were removed in plan 039. A correct expedition guess also writes `player_species_discoveries`, `species_cards`, and `species_card_unlocks`. `player_stats` is rebuilt from those tables. Clue-era counters are gone.
