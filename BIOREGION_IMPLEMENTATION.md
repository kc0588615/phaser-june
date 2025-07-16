# Bioregion Implementation for Species Habitat Classification

This document describes the implementation of automatic bioregion classification for species based on their habitat polygons.

## Overview

Each species habitat polygon is spatially analyzed against the `oneearth_bioregion` table to determine which ecoregion has the most overlapping area with the species' habitat. This provides additional ecological context for each species.

## Setup Instructions

To enable the bioregion feature, you need to create the following PostgreSQL functions in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL functions below into the editor
4. Click "Run" to create the functions

**IMPORTANT**: Without these functions, the ecoregion section will not appear in the species cards.

## Database Schema

### oneearth_bioregion Table
Contains polygons representing different ecoregions with the following relevant fields:
- `ogc_fid`: Primary key
- `bioregio_1`: Bioregion name
- `realm`: Major biogeographic realm
- `sub_realm`: Sub-realm classification
- `biome`: Biome type
- `wkb_geometry`: Polygon geometry (SRID: 900914 - Spherical Mercator)

### icaa Table (Species)
- `wkb_geometry`: Species habitat polygon (SRID: 4326 - WGS84)

## SQL Functions

### 1. get_species_bioregion(species_id INT)
Returns bioregion data for a single species:

```sql
CREATE OR REPLACE FUNCTION get_species_bioregion(species_id INT)
RETURNS TABLE (
  bioregio_1 TEXT,
  realm TEXT,
  sub_realm TEXT,
  biome TEXT,
  overlap_area FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.bioregio_1::TEXT,
    b.realm::TEXT,
    b.sub_realm::TEXT,
    b.biome::TEXT,
    ST_Area(ST_Intersection(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)::geography) / 1000000 as overlap_area
  FROM icaa s
  JOIN oneearth_bioregion b ON ST_Intersects(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)
  WHERE s.ogc_fid = species_id
  ORDER BY ST_Area(ST_Intersection(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)::geography) DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

### 2. get_species_bioregions(species_ids INT[])
Batch function for multiple species (more performant):

```sql
CREATE OR REPLACE FUNCTION get_species_bioregions(species_ids INT[])
RETURNS TABLE (
  species_id INT,
  bioregio_1 TEXT,
  realm TEXT,
  sub_realm TEXT,
  biome TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH species_bioregion AS (
    SELECT DISTINCT ON (s.ogc_fid)
      s.ogc_fid as sp_id,
      b.bioregio_1::TEXT as bio_1,
      b.realm::TEXT as r,
      b.sub_realm::TEXT as sr,
      b.biome::TEXT as bi,
      ST_Area(ST_Intersection(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)::geography) as overlap_area
    FROM icaa s
    JOIN oneearth_bioregion b ON ST_Intersects(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)
    WHERE s.ogc_fid = ANY(species_ids)
    ORDER BY s.ogc_fid, ST_Area(ST_Intersection(ST_Transform(s.wkb_geometry, 900914), b.wkb_geometry)::geography) DESC
  )
  SELECT 
    sp_id as species_id,
    bio_1 as bioregio_1,
    r as realm,
    sr as sub_realm,
    bi as biome
  FROM species_bioregion;
END;
$$ LANGUAGE plpgsql;
```

## Key Implementation Details

1. **Coordinate System Transformation**: The species polygons (SRID 4326) are transformed to match the bioregion polygons (SRID 900914) using `ST_Transform`.

2. **Spatial Intersection**: `ST_Intersects` finds all bioregions that overlap with a species habitat.

3. **Area Calculation**: `ST_Area(ST_Intersection(...))` calculates the overlapping area in square meters, converted to km².

4. **Selection Logic**: The bioregion with the largest overlapping area is selected using `DISTINCT ON` with `ORDER BY overlap_area DESC`.

5. **Performance**: The batch function processes multiple species in a single query for better performance.

## Frontend Integration

### Species Service (`speciesService.ts`)
The `getSpeciesByIds` method now:
1. Fetches species data
2. Calls `getSpeciesBioregions` to get bioregion data
3. Merges bioregion data into species objects

### Species Card Component
Displays bioregion information in a new "Ecoregion" section showing:
- Bioregion name
- Realm
- Sub-realm  
- Biome

## Example Result
For Green Sea Turtle (ogc_fid: 4):
- **Bioregion**: Micronesia Moist Tropical Forests
- **Realm**: Oceania
- **Sub-realm**: Oceanic Islands
- **Biome**: Tropical & Subtropical Moist Broadleaf Forests