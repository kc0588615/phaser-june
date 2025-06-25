-- Supabase PostGIS Raster Setup
-- Execute this in your Supabase SQL Editor: https://abhhfiazxykwcpkyvavk.supabase.co/project/abhhfiazxykwcpkyvavk/editor

-- Step 1: Enable PostGIS Raster Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Step 2: Create Habitat Raster Table
CREATE TABLE IF NOT EXISTS habitat_raster (
    rid SERIAL PRIMARY KEY,
    rast RASTER,
    filename TEXT,
    upload_date TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Step 3: Create Spatial Index for Performance
CREATE INDEX IF NOT EXISTS idx_habitat_raster_gist 
ON habitat_raster 
USING GIST(ST_ConvexHull(rast));

-- Step 4: Create Habitat Query Function
CREATE OR REPLACE FUNCTION get_habitat_types_at_point(
    lon FLOAT, 
    lat FLOAT,
    buffer_meters FLOAT DEFAULT 1000.0
) RETURNS INTEGER[] AS $$
DECLARE
    habitat_values INTEGER[];
BEGIN
    -- Check if we have any raster data
    IF NOT EXISTS (SELECT 1 FROM habitat_raster LIMIT 1) THEN
        -- Return mock data if no raster is loaded yet
        RETURN ARRAY[100, 101, 200, 300, 500];
    END IF;

    -- Query raster data within buffer
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
             SELECT ST_ValueCount(
                 ST_Clip(rast, 1, buffer_geom.geom, true), 
                 1, 
                 false
             ) AS value_count
             FROM habitat_raster
             WHERE ST_Intersects(rast, buffer_geom.geom)
         ) AS counted_values
    WHERE (value_count).value IS NOT NULL
      AND (value_count).value != 0 
      AND (value_count).value != 1700  -- Exclude no-data values
      AND (value_count).count > 0;     -- Only include values that actually exist
    
    -- Return habitat values or empty array if none found
    RETURN COALESCE(habitat_values, ARRAY[]::INTEGER[]);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Update the main query function to use real habitat data
CREATE OR REPLACE FUNCTION query_location_simple(lon FLOAT, lat FLOAT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    habitat_types INTEGER[];
BEGIN
    -- Get habitat types from raster data
    SELECT get_habitat_types_at_point(lon, lat, 1000.0) INTO habitat_types;
    
    result := json_build_object(
        'habitats', COALESCE(habitat_types, ARRAY[]::INTEGER[]),
        'species', (
            SELECT json_agg(
                json_build_object(
                    'id', s.ogc_fid,
                    'sci_name', s.sci_name,
                    'comm_name', s.comm_name,
                    'species_name', COALESCE(s.sci_name, s.comm_name),
                    'hab_desc', s.hab_desc,
                    'aquatic', s.aquatic::boolean,
                    'freshwater', s.freshwater::boolean,
                    'terrestr', COALESCE(s.terrestr::boolean, s.terrestria::boolean),
                    'marine', s.marine::boolean,
                    'geo_desc', s.geo_desc,
                    'color_prim', s.color_prim,
                    'size_min', s.size_min,
                    'size_max', s.size_max,
                    'diet_type', s.diet_type,
                    'cons_code', s.cons_code
                )
            )
            FROM icaa s
            WHERE ST_Contains(s.wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
        ),
        'debug', json_build_object(
            'coordinates', json_build_object('lon', lon, 'lat', lat),
            'habitat_count', COALESCE(array_length(habitat_types, 1), 0),
            'has_raster_data', EXISTS(SELECT 1 FROM habitat_raster LIMIT 1),
            'source', 'query_location_simple with raster support'
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to load raster from external URL (Alternative approach)
CREATE OR REPLACE FUNCTION load_external_raster(
    raster_url TEXT,
    description_text TEXT DEFAULT 'Habitat COG from Azure'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Attempt to load raster from external URL
    -- Note: This requires GDAL support in Supabase
    BEGIN
        INSERT INTO habitat_raster (rast, filename, description)
        SELECT 
            ST_FromGDALRaster(raster_url, NULL, true),
            raster_url,
            description_text;
        RETURN TRUE;
    EXCEPTION WHEN OTHERS THEN
        -- If external loading fails, log the error
        RAISE NOTICE 'Failed to load external raster from %: %', raster_url, SQLERRM;
        RETURN FALSE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Grant necessary permissions
GRANT SELECT ON habitat_raster TO anon;
GRANT EXECUTE ON FUNCTION get_habitat_types_at_point TO anon;
GRANT EXECUTE ON FUNCTION query_location_simple TO anon;
GRANT EXECUTE ON FUNCTION load_external_raster TO postgres; -- Only for admin use

-- Step 8: Create a view for raster information
CREATE OR REPLACE VIEW raster_info AS
SELECT 
    rid,
    filename,
    description,
    upload_date,
    ST_Width(rast) as width,
    ST_Height(rast) as height,
    ST_NumBands(rast) as num_bands,
    ST_Extent(rast) as extent,
    ST_SRID(rast) as srid
FROM habitat_raster;

GRANT SELECT ON raster_info TO anon;

-- Step 9: Test function with current coordinates
-- You can test this after running the setup:
-- SELECT get_habitat_types_at_point(-95.3698, 29.7604);
-- SELECT query_location_simple(-95.3698, 29.7604);

-- Step 10: Check raster status
-- SELECT * FROM raster_info;

COMMENT ON TABLE habitat_raster IS 'Stores habitat raster data for spatial queries';
COMMENT ON FUNCTION get_habitat_types_at_point IS 'Returns habitat type IDs within specified buffer distance';
COMMENT ON FUNCTION query_location_simple IS 'Combined query returning both habitat types and species data';
COMMENT ON FUNCTION load_external_raster IS 'Loads raster data from external URL (admin only)';

-- Final step: Display setup confirmation
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Raster setup completed successfully!';
    RAISE NOTICE 'Tables created: habitat_raster, raster_info (view)';
    RAISE NOTICE 'Functions created: get_habitat_types_at_point, query_location_simple, load_external_raster';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Load raster data using raster2pgsql or load_external_raster()';
    RAISE NOTICE '2. Test with: SELECT query_location_simple(-95.3698, 29.7604);';
    RAISE NOTICE '3. Check raster status with: SELECT * FROM raster_info;';
END $$;