-- =============================================================================
-- Migration 009: Water body vector layers (HydroRIVERS + HydroLAKES)
-- =============================================================================
-- Stores pre-downloaded HydroSHEDS vector features for proximity scoring.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS hydro_rivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hyriv_id INTEGER NOT NULL UNIQUE,
  ord_stra SMALLINT,            -- Strahler stream order
  ord_flow SMALLINT,            -- flow order
  upland_skm NUMERIC,           -- upstream drainage area km²
  length_km NUMERIC,
  dis_m3_pyr NUMERIC,           -- mean annual discharge m³/year
  geom geometry(MultiLineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_hydro_rivers_geom ON hydro_rivers USING GIST (geom);
CREATE INDEX IF NOT EXISTS ix_hydro_rivers_ord_stra ON hydro_rivers (ord_stra);

CREATE TABLE IF NOT EXISTS hydro_lakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hylak_id INTEGER NOT NULL UNIQUE,
  lake_name TEXT,
  lake_type SMALLINT,           -- 1=lake 2=reservoir 3=other
  lake_area NUMERIC,            -- km²
  vol_total NUMERIC,            -- volume km³
  shore_len NUMERIC,            -- shoreline length km
  depth_avg NUMERIC,            -- m
  elevation NUMERIC,            -- m
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_hydro_lakes_geom ON hydro_lakes USING GIST (geom);
CREATE INDEX IF NOT EXISTS ix_hydro_lakes_lake_type ON hydro_lakes (lake_type);

COMMIT;
