import React, { useState } from 'react';
import { speciesService } from '../lib/speciesService';
import { createClient } from '@supabase/supabase-js';

// Test the API logic directly without API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const APITester: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBothAPIs = async () => {
    setLoading(true);
    const testLon = -95.3698;
    const testLat = 29.7604;

    try {
      // Test direct Supabase RPC call (simulating what the API route would do)
      let apiSimulationResult;
      try {
        const { data: comprehensiveData, error: comprehensiveError } = await supabase.rpc('query_location_simple', {
          lon: testLon,
          lat: testLat
        });

        if (comprehensiveError) throw comprehensiveError;
        apiSimulationResult = {
          method: 'new_supabase_function',
          data: comprehensiveData
        };
      } catch (comprehensiveError) {
        console.log('Comprehensive function not available, testing fallback');
        
        // Fallback test
        const { data: speciesData, error: speciesError } = await supabase.rpc('get_species_at_point', {
          lon: testLon,
          lat: testLat
        });

        if (speciesError) throw speciesError;

        const species = speciesData?.map((s: any) => s.sci_name || s.comm_name || s.species_name) || [];
        apiSimulationResult = {
          method: 'fallback_method',
          data: {
            habitats: [100, 101, 200],
            species: species,
            debug: {
              coordinates: { lon: testLon, lat: testLat },
              message: 'Simulated API route logic'
            }
          }
        };
      }

      // Test current Supabase service
      const supabaseData = await speciesService.getSpeciesAtPoint(testLon, testLat);

      setResults({
        simulatedAPI: apiSimulationResult,
        currentMethod: supabaseData,
        coordinates: { lon: testLon, lat: testLat },
        note: 'API route simulation (static export mode)'
      });
    } catch (error) {
      console.error('Test failed:', error);
      setResults({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'absolute', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <h3>API Comparison Test</h3>
      <button onClick={testBothAPIs} disabled={loading}>
        {loading ? 'Testing...' : 'Test Both APIs'}
      </button>
      
      {results && (
        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};