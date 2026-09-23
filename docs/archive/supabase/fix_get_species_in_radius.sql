-- Fix get_species_in_radius function to remove terrestr column reference
-- Run this in your Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_species_in_radius(float, float, float);

-- Create the corrected function without terrestr column reference
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