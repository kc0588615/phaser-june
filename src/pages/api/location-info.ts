import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lon, lat } = req.query;
  
  if (!lon || !lat) {
    return res.status(400).json({ error: 'Missing longitude or latitude parameters' });
  }

  const longitude = parseFloat(lon as string);
  const latitude = parseFloat(lat as string);

  // Validate coordinates
  if (isNaN(longitude) || isNaN(latitude)) {
    return res.status(400).json({ error: 'Invalid coordinate values' });
  }

  try {
    // Try to use the new comprehensive function first
    let result;
    try {
      const { data: comprehensiveData, error: comprehensiveError } = await supabase.rpc('query_location_simple', {
        lon: longitude,
        lat: latitude
      });

      if (comprehensiveError) throw comprehensiveError;
      result = comprehensiveData;
    } catch (comprehensiveError) {
      console.log('Comprehensive function not available, falling back to original method');
      
      // Fallback to original method
      const { data: speciesData, error: speciesError } = await supabase.rpc('get_species_at_point', {
        lon: longitude,
        lat: latitude
      });

      if (speciesError) {
        console.error('Species query error:', speciesError);
        throw speciesError;
      }

      // Extract species names from the data
      const species = speciesData?.map((s: any) => s.sci_name || s.comm_name || s.species_name) || [];

      result = {
        habitats: [100, 101, 200], // Mock habitat data
        species: species,
        debug: {
          coordinates: { lon: longitude, lat: latitude },
          speciesCount: species.length,
          message: 'Using fallback method - original get_species_at_point function'
        }
      };
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Location query error:', error);
    res.status(500).json({ 
      error: 'Failed to query location',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}