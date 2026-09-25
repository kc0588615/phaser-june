-- Clue Match: which place a solve was played in (clue_match_places.key, e.g.
-- 'country:KEN'), so play can be analyzed by place. NULL for play without a
-- place. Idempotent.
BEGIN;
SET LOCAL search_path = public;

ALTER TABLE clue_match_solves
  ADD COLUMN IF NOT EXISTS place_key text CHECK (place_key IS NULL OR place_key ~ '^(country|area|continent):[A-Za-z0-9-]{1,80}$');

CREATE INDEX IF NOT EXISTS ix_clue_match_solves_place ON clue_match_solves (place_key) WHERE place_key IS NOT NULL;

COMMIT;
