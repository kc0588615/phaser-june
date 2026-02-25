-- =============================================================================
-- Migration 010: Marine Regions EEZ boundaries
-- =============================================================================
-- Exclusive Economic Zone polygons for coastal/marine node scoring.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS marine_eez (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrgid INTEGER NOT NULL UNIQUE,
  geoname TEXT,
  sovereign1 TEXT,
  territory1 TEXT,
  area_km2 NUMERIC,
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_marine_eez_geom ON marine_eez USING GIST (geom);
CREATE INDEX IF NOT EXISTS ix_marine_eez_sovereign ON marine_eez (sovereign1);

COMMIT;
