-- Migration 016: Natural Earth support tables for expedition waypoint harvesting.
-- Data is loaded separately from Natural Earth GeoJSON exports.

CREATE SCHEMA IF NOT EXISTS natural_earth;

CREATE TABLE IF NOT EXISTS natural_earth.populated_places (
  gid INTEGER PRIMARY KEY,
  name TEXT,
  nameascii TEXT,
  adm0name TEXT,
  adm0_a3 VARCHAR(3),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  pop_max DOUBLE PRECISION,
  pop_min DOUBLE PRECISION,
  featurecla TEXT,
  scalerank INTEGER,
  natscale INTEGER,
  capital TEXT,
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS natural_earth_populated_places_geom_idx
  ON natural_earth.populated_places USING GIST (geom);

CREATE INDEX IF NOT EXISTS natural_earth_populated_places_pop_max_idx
  ON natural_earth.populated_places (pop_max);

CREATE TABLE IF NOT EXISTS natural_earth.countries (
  gid INTEGER PRIMARY KEY,
  name TEXT,
  name_long TEXT,
  admin TEXT,
  adm0_a3 VARCHAR(3),
  iso_a2 VARCHAR(2),
  iso_a3 VARCHAR(3),
  continent TEXT,
  region_un TEXT,
  subregion TEXT,
  pop_est DOUBLE PRECISION,
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS natural_earth_countries_geom_idx
  ON natural_earth.countries USING GIST (geom);
