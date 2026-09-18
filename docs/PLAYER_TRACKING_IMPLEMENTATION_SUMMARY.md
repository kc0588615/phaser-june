# Player Tracking Implementation Summary

`src/lib/playerTracking.ts` writes sessions and first discoveries; `Game.ts` posts `updateSessionProgress`, `forceSessionUpdate`, `trackSpeciesDiscovery`, and `endGameSession` through `POST /api/player/track`. A correct expedition guess also writes `player_species_discoveries`, `species_cards`, and `species_card_unlocks`. `player_stats` is rebuilt from those tables. Clue-era counters are gone.
