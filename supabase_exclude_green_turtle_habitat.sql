-- Function to get the closest habitat polygon to a given point
CREATE OR REPLACE FUNCTION get_closest_habitat(lon float, lat float)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Find the closest habitat polygon
  SELECT ST_AsGeoJSON(wkb_geometry)::json
  INTO result
  FROM icaa
  WHERE wkb_geometry IS NOT NULL
  ORDER BY wkb_geometry <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326)
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_closest_habitat(float, float) TO anon;
GRANT EXECUTE ON FUNCTION get_closest_habitat(float, float) TO authenticated;