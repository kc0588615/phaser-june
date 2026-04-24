-- =============================================================================
-- Migration 007: Action run loop schema + GIS sampling tables
-- =============================================================================
-- Purpose:
--   Add persistent tables for the Orbit -> Node Route -> Fieldwork -> Analysis
--   gameplay loop, while linking outcomes into existing player tracking tables.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Run sessions (one route run from a map click)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_run_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  game_session_id UUID REFERENCES player_game_sessions(id) ON DELETE SET NULL,

  run_status TEXT NOT NULL DEFAULT 'active',
  run_seed BIGINT,
  node_count_planned SMALLINT NOT NULL DEFAULT 6,
  node_index_current SMALLINT NOT NULL DEFAULT 1,

  selected_lng DOUBLE PRECISION NOT NULL,
  selected_lat DOUBLE PRECISION NOT NULL,
  selected_point geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(selected_lng, selected_lat), 4326)) STORED,
  selection_zoom NUMERIC(6, 2),
  location_key TEXT NOT NULL, -- e.g. geohash/h3/s2 token produced by app logic

  realm TEXT,
  biome TEXT,
  bioregion TEXT,

  move_budget INTEGER NOT NULL DEFAULT 0,
  moves_used INTEGER NOT NULL DEFAULT 0,
  score_total INTEGER NOT NULL DEFAULT 0,
  species_discovered_count INTEGER NOT NULL DEFAULT 0,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT ck_eco_run_sessions_status
    CHECK (run_status IN ('active', 'completed', 'failed', 'abandoned')),
  CONSTRAINT ck_eco_run_sessions_node_count
    CHECK (node_count_planned BETWEEN 1 AND 12),
  CONSTRAINT ck_eco_run_sessions_node_index
    CHECK (node_index_current >= 1)
);

CREATE INDEX IF NOT EXISTS ix_eco_run_sessions_player_started
  ON eco_run_sessions (player_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_eco_run_sessions_status_started
  ON eco_run_sessions (run_status, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_eco_run_sessions_location_key
  ON eco_run_sessions (location_key);
CREATE INDEX IF NOT EXISTS ix_eco_run_sessions_selected_point
  ON eco_run_sessions USING GIST (selected_point);

-- -----------------------------------------------------------------------------
-- Run nodes (individual encounters within a run)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_run_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES eco_run_sessions(id) ON DELETE CASCADE,
  node_order SMALLINT NOT NULL,

  node_type TEXT NOT NULL,
  node_status TEXT NOT NULL DEFAULT 'locked',

  objective_type TEXT NOT NULL DEFAULT 'match_count',
  objective_target INTEGER NOT NULL DEFAULT 0,
  objective_progress INTEGER NOT NULL DEFAULT 0,
  move_budget INTEGER NOT NULL DEFAULT 0,
  moves_used INTEGER NOT NULL DEFAULT 0,

  board_seed BIGINT,
  board_sampling_method TEXT NOT NULL DEFAULT 'center_point',
  board_context JSONB NOT NULL DEFAULT '{}'::jsonb, -- includes 8x8 sampling snapshot

  hazard_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,

  wager_tier TEXT,
  wager_result TEXT,
  guessed_species_id INTEGER REFERENCES icaa(ogc_fid) ON DELETE SET NULL,
  guess_correct BOOLEAN,
  score_earned INTEGER NOT NULL DEFAULT 0,

  dominant_habitat TEXT,
  center_point geometry(Point, 4326),
  bbox geometry(Polygon, 4326),

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_eco_run_nodes_run_order UNIQUE (run_id, node_order),
  CONSTRAINT ck_eco_run_nodes_order CHECK (node_order >= 1),
  CONSTRAINT ck_eco_run_nodes_type CHECK (
    node_type IN (
      'riverbank_sweep',
      'dense_canopy',
      'urban_fringe',
      'elevation_ridge',
      'storm_window',
      'crisis',
      'analysis',
      'custom'
    )
  ),
  CONSTRAINT ck_eco_run_nodes_status CHECK (
    node_status IN ('locked', 'active', 'completed', 'failed', 'skipped')
  ),
  CONSTRAINT ck_eco_run_nodes_sampling_method CHECK (
    board_sampling_method IN ('center_point', 'majority')
  ),
  CONSTRAINT ck_eco_run_nodes_wager_tier CHECK (
    wager_tier IS NULL OR wager_tier IN ('none', 'bronze', 'silver', 'gold')
  ),
  CONSTRAINT ck_eco_run_nodes_wager_result CHECK (
    wager_result IS NULL OR wager_result IN ('none', 'won', 'lost')
  )
);

CREATE INDEX IF NOT EXISTS ix_eco_run_nodes_run_status
  ON eco_run_nodes (run_id, node_status);
CREATE INDEX IF NOT EXISTS ix_eco_run_nodes_type
  ON eco_run_nodes (node_type);
CREATE INDEX IF NOT EXISTS ix_eco_run_nodes_center_point
  ON eco_run_nodes USING GIST (center_point);
CREATE INDEX IF NOT EXISTS ix_eco_run_nodes_bbox
  ON eco_run_nodes USING GIST (bbox);

-- -----------------------------------------------------------------------------
-- Node attempts (supports retries/rerolls without losing per-node history)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_node_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES eco_run_nodes(id) ON DELETE CASCADE,
  attempt_no SMALLINT NOT NULL DEFAULT 1,
  result TEXT NOT NULL DEFAULT 'in_progress',

  moves_used INTEGER NOT NULL DEFAULT 0,
  clues_unlocked INTEGER NOT NULL DEFAULT 0,
  score_delta INTEGER NOT NULL DEFAULT 0,
  telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  CONSTRAINT uq_eco_node_attempts_node_attempt UNIQUE (node_id, attempt_no),
  CONSTRAINT ck_eco_node_attempts_result CHECK (
    result IN ('in_progress', 'success', 'failure', 'abort')
  )
);

CREATE INDEX IF NOT EXISTS ix_eco_node_attempts_node
  ON eco_node_attempts (node_id, attempt_no);

-- -----------------------------------------------------------------------------
-- Location mastery (persistent progression per player + area key)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_location_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  location_key TEXT NOT NULL,

  center_point geometry(Point, 4326),
  realm TEXT,
  biome TEXT,
  bioregion TEXT,

  runs_started INTEGER NOT NULL DEFAULT 0,
  runs_completed INTEGER NOT NULL DEFAULT 0,
  best_run_score INTEGER NOT NULL DEFAULT 0,
  best_species_chain INTEGER NOT NULL DEFAULT 0,
  total_species_discovered INTEGER NOT NULL DEFAULT 0,
  mastery_tier SMALLINT NOT NULL DEFAULT 0,

  first_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT uq_eco_location_mastery_player_location UNIQUE (player_id, location_key),
  CONSTRAINT ck_eco_location_mastery_tier CHECK (mastery_tier BETWEEN 0 AND 10)
);

CREATE INDEX IF NOT EXISTS ix_eco_location_mastery_player
  ON eco_location_mastery (player_id);
CREATE INDEX IF NOT EXISTS ix_eco_location_mastery_location_key
  ON eco_location_mastery (location_key);
CREATE INDEX IF NOT EXISTS ix_eco_location_mastery_center_point
  ON eco_location_mastery USING GIST (center_point);

-- -----------------------------------------------------------------------------
-- GIS layer catalog + per-node sampled signal values
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_gis_layers (
  id SERIAL PRIMARY KEY,
  layer_key TEXT NOT NULL UNIQUE, -- e.g. "iucn_habitat", "cop_dem", "ghsl_built"
  display_name TEXT NOT NULL,
  source_org TEXT NOT NULL,
  source_url TEXT,
  license TEXT,

  geometry_type TEXT NOT NULL DEFAULT 'raster',
  spatial_resolution_m NUMERIC(10, 2),
  temporal_resolution TEXT,
  coverage TEXT NOT NULL DEFAULT 'global',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_eco_gis_layers_geometry_type CHECK (geometry_type IN ('raster', 'vector'))
);

CREATE TABLE IF NOT EXISTS eco_node_gis_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES eco_run_nodes(id) ON DELETE CASCADE,
  layer_id INTEGER NOT NULL REFERENCES eco_gis_layers(id) ON DELETE RESTRICT,

  signal_key TEXT NOT NULL, -- e.g. "water_ratio", "urban_pressure", "slope_mean"
  signal_value_numeric NUMERIC,
  signal_value_text TEXT,
  signal_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  sample_method TEXT NOT NULL DEFAULT 'center_point',
  sample_geometry geometry(Polygon, 4326),
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_eco_node_gis_samples_key UNIQUE (node_id, layer_id, signal_key),
  CONSTRAINT ck_eco_node_gis_samples_method CHECK (
    sample_method IN ('center_point', 'majority', 'zonal_stats')
  )
);

CREATE INDEX IF NOT EXISTS ix_eco_node_gis_samples_node
  ON eco_node_gis_samples (node_id);
CREATE INDEX IF NOT EXISTS ix_eco_node_gis_samples_layer
  ON eco_node_gis_samples (layer_id);
CREATE INDEX IF NOT EXISTS ix_eco_node_gis_samples_geometry
  ON eco_node_gis_samples USING GIST (sample_geometry);

-- -----------------------------------------------------------------------------
-- Link new run/node entities into existing discovery + clue tracking
-- -----------------------------------------------------------------------------
ALTER TABLE player_species_discoveries
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES eco_run_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS run_node_id UUID REFERENCES eco_run_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_player_species_discoveries_run_id
  ON player_species_discoveries (run_id);
CREATE INDEX IF NOT EXISTS ix_player_species_discoveries_run_node_id
  ON player_species_discoveries (run_node_id);

ALTER TABLE player_clue_unlocks
  ADD COLUMN IF NOT EXISTS run_node_id UUID REFERENCES eco_run_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_player_clue_unlocks_run_node_id
  ON player_clue_unlocks (run_node_id);

-- -----------------------------------------------------------------------------
-- Seed eco_gis_layers catalog (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO eco_gis_layers (layer_key, display_name, source_org, source_url, license, geometry_type, spatial_resolution_m, coverage, enabled)
VALUES
  ('iucn_habitat', 'IUCN Habitat Classification', 'IUCN', 'https://www.iucnredlist.org/', 'IUCN Terms', 'raster', 100.00, 'global', true),
  ('oneearth_bioregion', 'One Earth Bioregions', 'One Earth', 'https://www.oneearth.org/datasets/', 'CC BY 4.0', 'vector', NULL, 'global', true),
  ('jrc_surface_water', 'JRC Global Surface Water', 'EC JRC', 'https://global-surface-water.appspot.com/', 'Copernicus', 'raster', 30.00, 'global', false),
  ('cop_dem_glo30', 'Copernicus DEM GLO-30', 'ESA/Copernicus', 'https://doi.org/10.5270/ESA-c5d3d65', 'Copernicus', 'raster', 30.00, 'global', false),
  ('ghsl_built_up', 'GHSL Built-Up Surface', 'EC JRC', 'https://ghsl.jrc.ec.europa.eu/', 'CC BY 4.0', 'raster', 10.00, 'global', false),
  ('hydrorivers', 'HydroRIVERS v1.0', 'HydroSHEDS/WWF', 'https://www.hydrosheds.org/products/hydrorivers', 'HydroSHEDS License', 'vector', NULL, 'global', false),
  ('hydrolakes', 'HydroLAKES v1.0', 'HydroSHEDS/WWF', 'https://www.hydrosheds.org/products/hydrolakes', 'HydroSHEDS License', 'vector', NULL, 'global', false),
  ('marine_eez', 'Marine Regions EEZ v12', 'VLIZ', 'https://www.marineregions.org/downloads.php', 'CC BY 4.0', 'vector', NULL, 'global', false)
ON CONFLICT (layer_key) DO NOTHING;

COMMIT;
