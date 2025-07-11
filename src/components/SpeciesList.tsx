import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { speciesService } from '@/lib/speciesService';
import SpeciesCard from '@/components/SpeciesCard';
import { CategoryGenusPicker } from '@/components/CategoryGenusPickerFixed';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getEcoregions, getRealms, getBiomes, groupSpeciesByCategory } from '@/utils/ecoregion';
import type { Species } from '@/types/database';
import type { JumpTarget } from '@/types/speciesBrowser';

export default function SpeciesList() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);

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

  // Filter species by selected filter
  const filteredSpecies = useMemo(() => {
    if (!selectedFilter) return species;
    
    switch (selectedFilter.type) {
      case 'ecoregion':
        return species.filter(s => s.bioregio_1 === selectedFilter.value);
      case 'realm':
        return species.filter(s => s.realm === selectedFilter.value);
      case 'biome':
        return species.filter(s => s.biome === selectedFilter.value);
      default:
        return species;
    }
  }, [selectedFilter, species]);

  // Group species by category and genus
  const grouped = useMemo(() => groupSpeciesByCategory(filteredSpecies), [filteredSpecies]);
  
  // Extract unique ecoregions, realms, and biomes
  const ecoregionList = useMemo(() => getEcoregions(species), [species]);
  const realmList = useMemo(() => getRealms(species), [species]);
  const biomeList = useMemo(() => getBiomes(species), [species]);

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    refs.current[id] = el;
  };

  const onJump = (target: JumpTarget) => {
    if (target.type === 'ecoregion' || target.type === 'realm' || target.type === 'biome') {
      setSelectedFilter({ type: target.type, value: target.value });
      // Scroll to the grid top when filtering
      if (gridRef.current) {
        gridRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      }
      return;
    }

    // Handle category and genus navigation
    let elementId: string;
    if (target.type === 'category') {
      elementId = target.value;
    } else {
      elementId = `${target.value.category}-${target.value.genus}`;
    }

    const element = refs.current[elementId];
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  };

  const onClearFilter = () => {
    setSelectedFilter(null);
  };

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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '48px', 
          fontWeight: 'bold', 
          textAlign: 'center', 
          marginBottom: '16px',
          marginTop: '40px',
          color: '#f1f5f9'
        }}>
          🐢 Species Database
        </h1>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              Categories: {Object.keys(grouped).length}, 
              Ecoregions: {ecoregionList.length}, 
              Realms: {realmList.length}, 
              Biomes: {biomeList.length}
            </div>
          )}
          <CategoryGenusPicker
            grouped={grouped}
            ecoregionList={ecoregionList}
            realmList={realmList}
            biomeList={biomeList}
            selectedFilter={selectedFilter}
            onJump={onJump}
            onClearFilter={onClearFilter}
          />
        </div>
        {selectedFilter && (
          <p style={{ 
            fontSize: '14px', 
            color: '#94a3b8', 
            textAlign: 'center',
            marginTop: '8px' 
          }}>
            Showing {filteredSpecies.length} species from {selectedFilter.value}
          </p>
        )}
      </div>

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
        <ScrollArea className="h-[calc(100vh-300px)]" ref={gridRef}>
          <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(grouped).map(([category, genera]) => (
              <div key={category} ref={setRef(category)}>
                <AccordionItem 
                  value={category} 
                  className="border rounded-lg"
                  style={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    borderColor: '#475569'
                  }}
                >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>{category}</h2>
                    <span className="text-sm text-muted-foreground mr-4" style={{ color: '#94a3b8' }}>
                      {Object.values(genera).flat().length} species
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-6">
                    {Object.entries(genera).map(([genus, speciesList]) => (
                      <section key={genus} ref={setRef(`${category}-${genus}`)} className="space-y-4">
                        <div className="sticky top-0 py-2 border-b" style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          backdropFilter: 'blur(10px)',
                          borderColor: '#475569'
                        }}>
                          <h3 className="text-lg font-medium" style={{ color: '#94a3b8' }}>
                            {genus} ({speciesList.length} species)
                          </h3>
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))',
                          gap: '24px',
                          width: '100%'
                        }}>
                          {speciesList.map((sp) => (
                            <SpeciesCard key={sp.ogc_fid} species={sp} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>
            ))}
          </Accordion>

          {Object.keys(grouped).length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <p style={{ color: '#94a3b8' }}>No species found for the selected filter.</p>
            </div>
          )}
        </ScrollArea>
      )}
      
      <div style={{ 
        marginTop: '48px', 
        textAlign: 'center',
        paddingBottom: '20px'
      }}>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>
          Total species: {filteredSpecies.length} {selectedFilter ? `(filtered from ${species.length})` : ''}
        </p>
      </div>
    </div>
  );
}