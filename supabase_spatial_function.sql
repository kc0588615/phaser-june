-- Create a function to query species at a specific point
-- This function should be run in the Supabase SQL editor

CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM icaa
  WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
  ORDER BY ogc_fid ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to the function
GRANT EXECUTE ON FUNCTION get_species_at_point TO anon;
GRANT EXECUTE ON FUNCTION get_species_at_point TO authenticated;

-- Example usage:
-- SELECT * FROM get_species_at_point(-122.4194, 37.7749);