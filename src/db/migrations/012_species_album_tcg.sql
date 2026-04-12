-- Migration 012: Species Album TCG tables
-- species_cards: per-player collection state for each species
-- run_memories: durable expedition memory for card backs
-- species_card_unlocks: timeline log of unlock events

BEGIN;

-- 1. species_cards
CREATE TABLE IF NOT EXISTS species_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  species_id    integer NOT NULL REFERENCES icaa(ogc_fid) ON DELETE CASCADE,
  discovered    boolean NOT NULL DEFAULT false,
  first_discovered_at timestamptz,
  last_encountered_at timestamptz,
  times_encountered   integer NOT NULL DEFAULT 0,
  best_run_id   uuid REFERENCES eco_run_sessions(id) ON DELETE SET NULL,
  best_run_score integer,
  completion_pct integer NOT NULL DEFAULT 0,
  rarity_tier   text NOT NULL DEFAULT 'common',
  conservation_code text,
  affinity_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  facts_unlocked jsonb NOT NULL DEFAULT '[]'::jsonb,
  clue_categories_unlocked jsonb NOT NULL DEFAULT '[]'::jsonb,
  gis_stamps    jsonb NOT NULL DEFAULT '[]'::jsonb,
  expedition_regions_seen jsonb NOT NULL DEFAULT '[]'::jsonb,
  card_variant  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_species_cards_player_species
  ON species_cards(player_id, species_id);
CREATE INDEX IF NOT EXISTS ix_species_cards_player
  ON species_cards(player_id);
CREATE INDEX IF NOT EXISTS ix_species_cards_discovered
  ON species_cards(player_id, discovered);

-- 2. run_memories
CREATE TABLE IF NOT EXISTS run_memories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL REFERENCES eco_run_sessions(id) ON DELETE CASCADE,
  player_id       uuid REFERENCES profiles(user_id) ON DELETE SET NULL,
  species_id      integer REFERENCES icaa(ogc_fid) ON DELETE SET NULL,
  location_key    text NOT NULL,
  start_lon       double precision NOT NULL,
  start_lat       double precision NOT NULL,
  route_polyline  jsonb NOT NULL DEFAULT '[]'::jsonb,
  route_bounds    jsonb,
  nodes           jsonb NOT NULL DEFAULT '[]'::jsonb,
  gis_features_nearby jsonb NOT NULL DEFAULT '[]'::jsonb,
  events_triggered jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_used      jsonb NOT NULL DEFAULT '[]'::jsonb,
  deduction_summary jsonb,
  final_score     integer,
  realm           text,
  biome           text,
  bioregion       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_run_memories_run
  ON run_memories(run_id);
CREATE INDEX IF NOT EXISTS ix_run_memories_player
  ON run_memories(player_id);
CREATE INDEX IF NOT EXISTS ix_run_memories_species
  ON run_memories(species_id);

-- 3. species_card_unlocks
CREATE TABLE IF NOT EXISTS species_card_unlocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  species_id  integer NOT NULL REFERENCES icaa(ogc_fid) ON DELETE CASCADE,
  run_id      uuid REFERENCES eco_run_sessions(id) ON DELETE SET NULL,
  unlock_type text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_species_card_unlocks_player
  ON species_card_unlocks(player_id);
CREATE INDEX IF NOT EXISTS ix_species_card_unlocks_species
  ON species_card_unlocks(species_id);
CREATE INDEX IF NOT EXISTS ix_species_card_unlocks_run
  ON species_card_unlocks(run_id);

COMMIT;
