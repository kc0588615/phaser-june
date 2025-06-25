# PostGIS Raster Migration Plan: Local Backend → Supabase

## Overview
Migrate the PostGIS raster functionality from the local Python backend to Supabase, enabling habitat type queries directly from the Supabase database.

## Current Architecture Analysis

### Local Backend Components
1. **Raster Storage**: `public.habitat_raster_full_in_db` table
2. **Habitat Query**: Complex PostGIS raster query with buffers and value counting
3. **Colormap**: `habitat_colormap.json` with 70+ habitat types
4. **TiTiler Integration**: Custom colormap serving via Azure TiTiler
5. **API Endpoint**: `/api/location_info/` returning habitat values within 1km buffer

### Key Technical Details
- **Raster Query**: Uses `ST_Clip`, `ST_ValueCount`, `ST_Intersects`
- **Buffer Distance**: 1000m for habitat sampling
- **Coordinate Systems**: Input EPSG:4326, processing EPSG:3857
- **Value Filtering**: Excludes NULL, 0, and 1700 (no-data values)
- **Output**: Array of habitat type integers (e.g., [100, 101, 200, 300, 500])

## Migration Strategy

### Phase 1: Supabase Database Setup
1. **Enable PostGIS Extensions in Supabase**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_raster;
   ```

2. **Create Raster Table**
   ```sql
   CREATE TABLE habitat_raster (
       rid SERIAL PRIMARY KEY,
       rast RASTER,
       filename TEXT
   );
   CREATE INDEX idx_habitat_raster_gist ON habitat_raster USING GIST(ST_ConvexHull(rast));
   ```

3. **Upload Habitat COG to Supabase**
   - Option A: Load raster data directly into Supabase using `raster2pgsql`
   - Option B: Keep COG in Azure Blob and use `ST_FromGDALRaster()` for queries

### Phase 2: Migrate Habitat Query Function
```sql
CREATE OR REPLACE FUNCTION get_habitat_types_at_point(
    lon FLOAT, 
    lat FLOAT,
    buffer_meters FLOAT DEFAULT 1000.0
) RETURNS INTEGER[] AS $$
DECLARE
    habitat_values INTEGER[];
BEGIN
    WITH input_point AS (
        SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS geom_4326
    ),
    buffer_geom AS (
        SELECT ST_Buffer(ST_Transform(geom_4326, 3857), buffer_meters) AS geom 
        FROM input_point
    )
    SELECT ARRAY_AGG(DISTINCT (value_count).value ORDER BY (value_count).value)
    INTO habitat_values
    FROM buffer_geom,
         LATERAL (
             SELECT ST_ValueCount(ST_Clip(rast, 1, buffer_geom.geom, true), 1, false) AS value_count
             FROM habitat_raster
             WHERE ST_Intersects(rast, buffer_geom.geom)
         ) AS counted_values
    WHERE (value_count).value IS NOT NULL
      AND (value_count).value != 0 
      AND (value_count).value != 1700;
    
    RETURN COALESCE(habitat_values, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Update Combined Query Function
Modify existing `query_location_simple` to include habitat raster queries:

```sql
CREATE OR REPLACE FUNCTION query_location_simple(lon FLOAT, lat FLOAT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    habitat_types INTEGER[];
BEGIN
    -- Get habitat types from raster
    SELECT get_habitat_types_at_point(lon, lat, 1000.0) INTO habitat_types;
    
    result := json_build_object(
        'habitats', COALESCE(habitat_types, ARRAY[]::INTEGER[]),
        'species', (
            SELECT json_agg(
                json_build_object(
                    'id', s.id,
                    'sci_name', s.sci_name,
                    'comm_name', s.comm_name,
                    'species_name', s.species_name,
                    'hab_desc', s.hab_desc,
                    'aquatic', s.aquatic,
                    'freshwater', s.freshwater,
                    'terrestr', COALESCE(s.terrestr, s.terrestria),
                    'marine', s.marine
                )
            )
            FROM icaa s  -- Use existing icaa table
            WHERE ST_Contains(s.wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
        ),
        'debug', json_build_object(
            'coordinates', json_build_object('lon', lon, 'lat', lat),
            'habitat_count', COALESCE(array_length(habitat_types, 1), 0),
            'message', 'Query executed with raster data'
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Phase 4: Raster Data Loading Options

#### Option A: Direct Raster Upload (Recommended)
```bash
# Convert COG to SQL and load into Supabase
raster2pgsql -I -C -e -Y -F -t 256x256 habitat_cog.tif habitat_raster | psql $SUPABASE_CONNECTION_STRING
```

#### Option B: External Raster Reference
```sql
-- Reference external COG file
INSERT INTO habitat_raster (rast, filename) 
SELECT ST_FromGDALRaster('https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif'), 
       'habitat_cog.tif';
```

### Phase 5: Update Frontend Integration
Update the existing `query_location_simple` calls to return real habitat data instead of mock values.

## Implementation Steps

### Step 1: Prepare Supabase Database
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Create raster table
CREATE TABLE habitat_raster (
    rid SERIAL PRIMARY KEY,
    rast RASTER,
    filename TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_habitat_raster_gist ON habitat_raster USING GIST(ST_ConvexHull(rast));

-- Grant permissions
GRANT SELECT ON habitat_raster TO anon;
GRANT EXECUTE ON FUNCTION get_habitat_types_at_point TO anon;
```

### Step 2: Load Raster Data
Two approaches:
1. **Local raster2pgsql**: Convert COG to SQL and import
2. **Direct upload**: Use Supabase Storage + reference

### Step 3: Deploy Functions
Deploy the habitat query functions to Supabase.

### Step 4: Test Integration
Verify that the API comparison test returns real habitat data.

## Benefits of Migration

1. **Unified Database**: All data (species + habitats) in one Supabase instance
2. **Real-time Updates**: Direct access to raster data without external backend
3. **Simplified Architecture**: Eliminate the Python backend dependency
4. **Better Performance**: Spatial queries run directly in PostGIS
5. **Scalability**: Leverage Supabase's managed infrastructure

## Challenges & Solutions

1. **Raster Size**: Large COG files may need chunking
   - Solution: Tile the raster or use external references

2. **PostGIS Raster Support**: Verify Supabase supports full PostGIS raster functionality
   - Solution: Test with small raster first, fallback to external references

3. **Performance**: Raster queries can be slow
   - Solution: Optimize with proper indexing and tiling

## Current Status

✅ **Analysis Complete**: Old backend PostGIS implementation understood
✅ **Migration Plan**: Comprehensive strategy documented
✅ **SQL Implementation**: `SUPABASE_RASTER_SETUP.sql` created
⏳ **Next**: Deploy SQL functions and load raster data

## Implementation Files

- `SUPABASE_RASTER_SETUP.sql` - Complete SQL setup for raster support
- `habitat_colormap.json` - Colormap definitions from old backend
- Current Azure COG: `https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif`

## Next Steps

1. **Deploy SQL Functions**: Run `SUPABASE_RASTER_SETUP.sql` in Supabase SQL Editor
2. **Load Raster Data**: Choose direct upload or external reference approach
3. **Test Integration**: Verify real habitat data replaces mock values
4. **Performance Optimization**: Add indexes and optimize queries as needed

This migration will complete the transition from the local Python backend to a fully Supabase-powered system, enabling real-time habitat queries directly from the database.