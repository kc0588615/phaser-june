-- Enhanced location query function for Supabase
-- Combines habitat and species data queries into a single RPC function
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION query_location_info(
  lon float,
  lat float
) RETURNS json AS $$
DECLARE
  habitat_values integer[];
  species_names text[];
  result json;
BEGIN
  -- Create point geometry from coordinates
  DECLARE
    point_geom geometry := ST_SetSRID(ST_MakePoint(lon, lat), 4326);
    point_geog geography := point_geom::geography;
    buffer_1km geography := ST_Buffer(point_geog, 1000);
    buffer_10km geography := ST_Buffer(point_geog, 10000);
  BEGIN
    
    -- Query 1: Get habitat values within 1km
    -- Note: This assumes you have a habitat table with geometry columns
    -- If you only have raster data, you'll need to adapt this query
    BEGIN
      SELECT array_agg(DISTINCT habitat_code) INTO habitat_values
      FROM (
        -- Example query - adjust table/column names as needed
        -- If you have habitat polygons:
        SELECT habitat_type as habitat_code 
        FROM habitat_polygons 
        WHERE ST_Intersects(geom::geography, buffer_1km)
        
        UNION
        
        -- If you want to include some sample habitat codes for testing:
        SELECT unnest(ARRAY[100, 101, 200, 300]) as habitat_code
        WHERE EXISTS (SELECT 1) -- Always include for testing
        
        LIMIT 10
      ) habitat_data;
    EXCEPTION WHEN OTHERS THEN
      -- If habitat table doesn't exist, use sample data
      habitat_values := ARRAY[100, 101, 200, 300];
    END;
    
    -- Query 2: Get species within 10km using existing species table
    BEGIN
      SELECT array_agg(DISTINCT COALESCE(sci_name, comm_name, 'Unknown Species')) INTO species_names
      FROM icaa 
      WHERE ST_Intersects(wkb_geometry::geography, buffer_10km)
      LIMIT 50; -- Limit to prevent too much data
    EXCEPTION WHEN OTHERS THEN
      -- If query fails, return empty array
      species_names := ARRAY[]::text[];
    END;
    
    -- Build result JSON
    result := json_build_object(
      'habitats', COALESCE(habitat_values, ARRAY[]::integer[]),
      'species', COALESCE(species_names, ARRAY[]::text[]),
      'coordinates', json_build_object('lon', lon, 'lat', lat),
      'query_info', json_build_object(
        'habitat_buffer_km', 1,
        'species_buffer_km', 10,
        'habitat_count', array_length(habitat_values, 1),
        'species_count', array_length(species_names, 1)
      )
    );
    
    RETURN result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION query_location_info TO anon;
GRANT EXECUTE ON FUNCTION query_location_info TO authenticated;

-- Test the function (optional)
-- SELECT query_location_info(-95.3698, 29.7604);

-- Create a simpler version that works with your current data structure
CREATE OR REPLACE FUNCTION query_location_simple(
  lon float,
  lat float
) RETURNS json AS $$
DECLARE
  species_data json;
  habitat_codes integer[];
BEGIN
  -- Get species data using existing function
  SELECT json_agg(
    json_build_object(
      'sci_name', sci_name,
      'comm_name', comm_name,
      'ogc_fid', ogc_fid,
      'hab_desc', hab_desc,
      'aquatic', aquatic,
      'freshwater', freshwater,
      'terrestr', terrestr,
      'marine', marine
    )
  ) INTO species_data
  FROM get_species_at_point(lon, lat);
  
  -- For now, return sample habitat codes
  -- Later you can replace this with actual habitat queries
  habitat_codes := ARRAY[100, 101, 200, 300, 500];
  
  RETURN json_build_object(
    'habitats', habitat_codes,
    'species', COALESCE(species_data, '[]'::json),
    'debug', json_build_object(
      'coordinates', json_build_object('lon', lon, 'lat', lat),
      'source', 'query_location_simple function'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for simple version
GRANT EXECUTE ON FUNCTION query_location_simple TO anon;
GRANT EXECUTE ON FUNCTION query_location_simple TO authenticated;

-- Example usage:
-- SELECT query_location_simple(-95.3698, 29.7604);