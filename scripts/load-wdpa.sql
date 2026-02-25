-- =============================================================================
-- WDPA Shapefile → protected_planet_parcels transform
-- =============================================================================
-- Usage:
--   1. ogr2ogr to load WDPA shapefile into staging table:
--      ogr2ogr -f PostgreSQL "PG:host=... dbname=..." \
--        WDPA_WDOECM_Feb2024_Public_all_shp/WDPA_WDOECM_Feb2024_Public_all_shp-polygons.shp \
--        -nln wdpa_staging -overwrite -lco GEOMETRY_NAME=wkb_geometry \
--        -where "ISO3 IN ('BRA','COL','PER','VEN','ECU','BOL','GUY','SUR','GUF','ARG','CHL','URY','PRY')"
--
--   2. Run this SQL to transform + insert into protected_planet_parcels.
--
--   3. The staging table is dropped at the end.
-- =============================================================================

BEGIN;

INSERT INTO protected_planet_parcels (
  site_id,
  site_pid,
  site_type,
  parcel_ordinal,
  name_english,
  name,
  iucn_category_name,
  designation_name,
  designation_eng,
  governance_type,
  ownership_type,
  country_iso3,
  iso3,
  marine,
  rep_area,
  gis_area,
  source_updated_year,
  geom
)
SELECT
  s."WDPAID"::integer,
  s."WDPA_PID"::text,
  CASE WHEN s."PA_DEF" = '1' THEN 'pa' ELSE 'oecm' END,
  ROW_NUMBER() OVER (PARTITION BY s."WDPA_PID" ORDER BY s.ogc_fid) AS parcel_ordinal,
  s."NAME" AS name_english,
  s."ORIG_NAME" AS name,
  NULLIF(s."IUCN_CAT", 'Not Reported'),
  s."DESIG",
  s."DESIG_ENG",
  s."GOV_TYPE",
  s."OWN_TYPE",
  s."ISO3",
  s."ISO3",
  CASE WHEN s."MARINE"::integer >= 1 THEN true ELSE false END,
  s."REP_AREA"::numeric,
  s."GIS_AREA"::numeric,
  s."STATUS_YR"::integer,
  ST_Multi(ST_CollectionExtract(ST_MakeValid(s.wkb_geometry), 3))
FROM wdpa_staging s
WHERE NOT ST_IsEmpty(s.wkb_geometry)
  AND ST_GeometryType(ST_CollectionExtract(ST_MakeValid(s.wkb_geometry), 3)) IN ('ST_Polygon', 'ST_MultiPolygon')
ON CONFLICT (site_pid, parcel_ordinal) DO NOTHING;

DROP TABLE IF EXISTS wdpa_staging;

COMMIT;
