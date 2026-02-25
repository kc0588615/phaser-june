# GIS Data Ingestion (South America)

All commands assume `$DATABASE_URL` is set and `ogr2ogr` (GDAL) is installed.

## 1. Protected Planet (WDPA/WD-OECM)

Download: https://www.protectedplanet.net/en/thematic-areas/wdpa (shapefile, all countries)

```bash
# Load into staging table (South America filter)
ogr2ogr -f PostgreSQL "$DATABASE_URL" \
  WDPA_WDOECM_*_Public_all_shp-polygons.shp \
  -nln wdpa_staging -overwrite -lco GEOMETRY_NAME=wkb_geometry \
  -where "ISO3 IN ('BRA','COL','PER','VEN','ECU','BOL','GUY','SUR','GUF','ARG','CHL','URY','PRY')"

# Transform + insert
psql "$DATABASE_URL" -f scripts/load-wdpa.sql
```

## 2. HydroRIVERS

Download: https://www.hydrosheds.org/products/hydrorivers (South America shapefile)

```bash
# Load directly, filter Strahler order >= 3
ogr2ogr -f PostgreSQL "$DATABASE_URL" \
  HydroRIVERS_v10_sa.shp \
  -nln hydro_rivers_staging -overwrite -lco GEOMETRY_NAME=geom \
  -where "ORD_STRA >= 3"

# Insert from staging
psql "$DATABASE_URL" -c "
INSERT INTO hydro_rivers (hyriv_id, ord_stra, ord_flow, upland_skm, length_km, dis_m3_pyr, geom)
SELECT
  \"HYRIV_ID\"::integer,
  \"ORD_STRA\"::smallint,
  \"ORD_FLOW\"::smallint,
  \"UPLAND_SKM\"::numeric,
  \"LENGTH_KM\"::numeric,
  \"DIS_M3_PYR\"::numeric,
  geom
FROM hydro_rivers_staging
ON CONFLICT (hyriv_id) DO NOTHING;
DROP TABLE IF EXISTS hydro_rivers_staging;
"
```

## 3. HydroLAKES

Download: https://www.hydrosheds.org/products/hydrolakes (global shapefile, filter in ogr2ogr)

```bash
ogr2ogr -f PostgreSQL "$DATABASE_URL" \
  HydroLAKES_polys_v10.shp \
  -nln hydro_lakes_staging -overwrite -lco GEOMETRY_NAME=geom \
  -spat -82 -56 -34 13

psql "$DATABASE_URL" -c "
INSERT INTO hydro_lakes (hylak_id, lake_name, lake_type, lake_area, vol_total, shore_len, depth_avg, elevation, geom)
SELECT
  \"Hylak_id\"::integer,
  \"Lake_name\",
  \"Lake_type\"::smallint,
  \"Lake_area\"::numeric,
  \"Vol_total\"::numeric,
  \"Shore_len\"::numeric,
  \"Depth_avg\"::numeric,
  \"Elevation\"::numeric,
  ST_Multi(ST_MakeValid(geom))
FROM hydro_lakes_staging
WHERE \"Lake_area\" >= 1
ON CONFLICT (hylak_id) DO NOTHING;
DROP TABLE IF EXISTS hydro_lakes_staging;
"
```

## 4. Marine Regions EEZ

Download: https://www.marineregions.org/downloads.php (EEZ v12 shapefile)

```bash
ogr2ogr -f PostgreSQL "$DATABASE_URL" \
  eez_v12.shp \
  -nln marine_eez_staging -overwrite -lco GEOMETRY_NAME=geom \
  -where "SOVEREIGN1 IN ('Brazil','Colombia','Peru','Venezuela','Ecuador','Chile','Argentina','Uruguay','Guyana','Suriname','France')"

psql "$DATABASE_URL" -c "
INSERT INTO marine_eez (mrgid, geoname, sovereign1, territory1, area_km2, geom)
SELECT
  \"MRGID\"::integer,
  \"GEONAME\",
  \"SOVEREIGN1\",
  \"TERRITORY1\",
  \"AREA_KM2\"::numeric,
  ST_Multi(ST_MakeValid(geom))
FROM marine_eez_staging
ON CONFLICT (mrgid) DO NOTHING;
DROP TABLE IF EXISTS marine_eez_staging;
"
```

## 5. Enable layers

```sql
UPDATE eco_gis_layers SET enabled = true
WHERE layer_key IN ('hydrorivers', 'hydrolakes', 'marine_eez');
```
