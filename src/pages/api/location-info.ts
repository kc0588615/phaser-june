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
    // For now, let's test with the existing get_species_at_point function
    // Later we can create a more comprehensive query_location_info function
    const { data: speciesData, error: speciesError } = await supabase.rpc('get_species_at_point', {
      lon: longitude,
      lat: latitude
    });

    if (speciesError) {
      console.error('Species query error:', speciesError);
      throw speciesError;
    }

    // For habitats, we'll need to add this to Supabase later
    // For testing, return mock habitat data
    const mockHabitats = [100, 101, 200]; // Example habitat codes

    // Extract species names from the data
    const species = speciesData?.map((s: any) => s.sci_name || s.species_name) || [];

    res.status(200).json({
      habitats: mockHabitats,
      species: species,
      debug: {
        coordinates: { lon: longitude, lat: latitude },
        speciesCount: species.length,
        message: 'Using existing Supabase function for species, mock data for habitats'
      }
    });

  } catch (error) {
    console.error('Location query error:', error);
    res.status(500).json({ 
      error: 'Failed to query location',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}