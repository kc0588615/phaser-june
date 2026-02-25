-- =============================================================================
-- Migration 008: Protected Planet v4 parcel cache (PostGIS)
-- =============================================================================
-- Purpose:
--   Store v4 protected/conserved area parcels with geometry so gameplay can run
--   low-latency local point/square intersection queries.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS protected_planet_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_id INTEGER NOT NULL,
  site_pid TEXT NOT NULL,          -- v4 string identifier
  site_type TEXT NOT NULL,         -- 'pa' | 'oecm'
  parcel_ordinal SMALLINT NOT NULL DEFAULT 1, -- index within protected_area_parcels

  name_english TEXT,
  name TEXT,                       -- original/local language name
  realm_id INTEGER,
  realm_name TEXT,

  iucn_category_name TEXT,
  designation_name TEXT,
  designation_eng TEXT,
  governance_type TEXT,
  governance_subtype TEXT,
  ownership_type TEXT,
  ownership_subtype TEXT,
  inland_waters TEXT,
  oecm_assessment TEXT,

  country_iso3 TEXT,
  iso3 TEXT,
  marine BOOLEAN,
  no_take TEXT,
  no_take_area NUMERIC,
  rep_area NUMERIC,                -- reported area, units depend on upstream payload
  gis_area NUMERIC,

  source_updated_year INTEGER,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- full parcel payload fragment
  source_meta JSONB NOT NULL DEFAULT '{}'::jsonb,    -- sources[] and request metadata

  geom geometry(MultiPolygon, 4326) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_protected_planet_parcels_pid_ordinal
    UNIQUE (site_pid, parcel_ordinal),
  CONSTRAINT ck_protected_planet_parcels_site_type
    CHECK (site_type IN ('pa', 'oecm'))
);

CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_site_id
  ON protected_planet_parcels (site_id);
CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_site_pid
  ON protected_planet_parcels (site_pid);
CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_site_type
  ON protected_planet_parcels (site_type);
CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_country_iso3
  ON protected_planet_parcels (country_iso3);
CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_realm
  ON protected_planet_parcels (realm_name);
CREATE INDEX IF NOT EXISTS ix_protected_planet_parcels_geom
  ON protected_planet_parcels USING GIST (geom);

COMMIT;
