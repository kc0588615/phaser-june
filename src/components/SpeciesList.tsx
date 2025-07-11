import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { speciesService } from '@/lib/speciesService';
import SpeciesCard from '@/components/SpeciesCard';
import { Loader2 } from 'lucide-react';
import type { Species } from '@/types/database';

export default function SpeciesList() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      // First get all species IDs ordered by common name
      const { data: speciesData, error: supabaseError } = await supabase
        .from('icaa')
        .select('ogc_fid, comm_name')
        .order('comm_name', { ascending: true });

      if (supabaseError) throw supabaseError;
      
      if (speciesData && speciesData.length > 0) {
        // Use speciesService to get full data including bioregions
        const speciesIds = speciesData.map(s => s.ogc_fid);
        const fullSpeciesData = await speciesService.getSpeciesByIds(speciesIds);
        
        // Create a map to preserve the original order
        const orderMap = new Map(speciesData.map((s, idx) => [s.ogc_fid, idx]));
        
        // Sort the full data based on the original order
        const sortedSpecies = fullSpeciesData.sort((a, b) => {
          const aOrder = orderMap.get(a.ogc_fid) ?? 999;
          const bOrder = orderMap.get(b.ogc_fid) ?? 999;
          return aOrder - bOrder;
        });
        
        setSpecies(sortedSpecies);
      } else {
        setSpecies([]);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching species:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group species by type (currently all turtles)
  const groupedSpecies = species.reduce((groups, sp) => {
    const type = 'Turtles'; // As mentioned, currently only turtles in database
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(sp);
    return groups;
  }, {} as Record<string, Species[]>);

  return (
    <div style={{ 
      padding: '40px 20px 20px 20px',
      overflowY: 'auto',
      overflowX: 'hidden',
      height: '100%',
      backgroundColor: '#0f172a',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ 
        fontSize: '48px', 
        fontWeight: 'bold', 
        textAlign: 'center', 
        marginBottom: '48px',
        marginTop: '40px',
        color: '#f1f5f9'
      }}>
        🐢 Species Database
      </h1>

      {isLoading && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '48px' 
        }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3b82f6' }} />
          <span style={{ marginLeft: '8px', color: '#94a3b8' }}>Loading species data...</span>
        </div>
      )}
      
      {error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          borderRadius: '8px', 
          padding: '16px',
          color: '#ef4444',
          marginBottom: '20px'
        }}>
          Error loading species: {error}
        </div>
      )}
      
      {!isLoading && !error && species.length === 0 && (
        <p style={{ 
          textAlign: 'center', 
          color: '#94a3b8', 
          padding: '48px' 
        }}>
          No species found in the database.
        </p>
      )}
      
      {!isLoading && !error && species.length > 0 && (
        <div>
          {Object.entries(groupedSpecies).map(([type, speciesList]) => (
            <div key={type} style={{ marginBottom: '32px' }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#3b82f6', 
                marginBottom: '24px' 
              }}>
                {type}
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))',
                gap: '24px',
                width: '100%',
                maxWidth: '1400px',
                margin: '0 auto'
              }}>
                {speciesList.map((sp) => (
                  <SpeciesCard key={sp.ogc_fid} species={sp} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ 
        marginTop: '48px', 
        textAlign: 'center',
        paddingBottom: '20px'
      }}>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Total species: {species.length}
        </p>
      </div>
    </div>
  );
}