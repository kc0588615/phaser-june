# Player Tracking Integration Plan

Clerk supplies the player id via `profiles`. Session progress and discoveries go through `/api/player/track`; completed runs also write `eco_run_*`, `run_memories`, `eco_location_mastery`, and album `species_cards`. LocalStorage discoveries still migrate through `/api/discoveries/migrate`. There is no per-gem clue tracker.
