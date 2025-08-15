-- Fix all SQL functions that reference the deleted terrestr column
-- Run this in your Supabase SQL Editor after deleting the terrestr column

-- 1. Fix get_species_in_radius function
DROP FUNCTION IF EXISTS get_species_in_radius(float, float, float);

CREATE OR REPLACE FUNCTION get_species_in_radius(
  lon float,
  lat float,
  radius_m float
) RETURNS SETOF icaa AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM icaa s
  WHERE ST_DWithin(
    s.wkb_geometry::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_m
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_species_in_radius TO anon;
GRANT EXECUTE ON FUNCTION get_species_in_radius TO authenticated;

-- 2. Fix query_location_simple function
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
      'terrestria', terrestria,
      'marine', marine
    )
  ) INTO species_data
  FROM get_species_at_point(lon, lat);
  
  -- For now, return sample habitat codes
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION query_location_simple TO anon;
GRANT EXECUTE ON FUNCTION query_location_simple TO authenticated;

-- 3. Check if get_species_at_point needs fixing too
-- (This function might also have terrestr references)
-- If you get errors about get_species_at_point, uncomment and run this:

-- CREATE OR REPLACE FUNCTION get_species_at_point(
--   lon float,
--   lat float
-- ) RETURNS SETOF icaa AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT *
--   FROM icaa s
--   WHERE ST_Contains(
--     s.wkb_geometry,
--     ST_SetSRID(ST_MakePoint(lon, lat), 4326)
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;