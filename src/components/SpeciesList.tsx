import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SpeciesCard from '@/components/SpeciesCard';
import { Loader2 } from 'lucide-react';

interface Species {
  ogc_fid: number;
  sci_name: string;
  comm_name: string;
  http_iucn: string | null;
  kingdom: string;
  phylum: string;
  class: string;
  order_: string;
  family: string;
  genus: string;
  category: string;
  cons_code: string;
  cons_text: string;
  marine: string;
  terrestria: string;
  freshwater: string;
  hab_tags: string;
  hab_desc: string;
  geo_desc: string;
  color_prim: string;
  color_sec: string;
  pattern: string;
  size_min: number;
  size_max: number;
  weight_kg: number;
  shape_desc: string;
  diet_type: string;
  diet_prey: string;
  diet_flora: string;
  behav_1: string;
  behav_2: string;
  lifespan: number;
  maturity: string;
  repro_type: string;
  clutch_sz: string;
  life_desc1: string;
  life_desc2: string;
  threats: string;
  key_fact1: string;
  key_fact2: string;
  key_fact3: string;
}

export default function SpeciesList() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('icaa')
        .select(`
          ogc_fid, sci_name, comm_name, http_iucn,
          kingdom, phylum, class, order_, family, genus,
          category, cons_code, cons_text,
          marine, terrestria, freshwater, hab_tags, hab_desc,
          geo_desc,
          color_prim, color_sec, pattern, size_min, size_max, weight_kg, shape_desc,
          diet_type, diet_prey, diet_flora, behav_1, behav_2,
          lifespan, maturity, repro_type, clutch_sz, life_desc1, life_desc2,
          threats,
          key_fact1, key_fact2, key_fact3
        `)
        .order('comm_name', { ascending: true });

      if (supabaseError) throw supabaseError;
      setSpecies(data || []);
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