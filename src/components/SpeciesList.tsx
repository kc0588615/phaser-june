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
    <div className="flex flex-col h-full bg-slate-900 w-full relative">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-slate-900 relative z-50">
        <h1 className="text-3xl sm:text-5xl font-bold text-center mb-4 text-foreground">
          🐢 Species Database
        </h1>
        <div className="max-w-[600px] mx-auto">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-600 mb-2">
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
          <p className="text-sm text-muted-foreground text-center mt-2">
            Showing {filteredSpecies.length} species from {selectedFilter.value}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="flex items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading species data...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex-1 px-5 pt-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
            Error loading species: {error}
          </div>
        </div>
      )}
      
      {!isLoading && !error && species.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-center text-muted-foreground">
            No species found in the database.
          </p>
        </div>
      )}
      
      {!isLoading && !error && species.length > 0 && (
        <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-5" ref={gridRef}>
          <Accordion type="multiple" className="w-full space-y-4">
            {Object.entries(grouped).map(([category, genera]) => (
              <div key={category} ref={setRef(category)}>
                <AccordionItem 
                  value={category} 
                  className="border rounded-lg bg-slate-800/90 border-slate-700"
                >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <h2 className="text-xl font-semibold text-foreground">{category}</h2>
                    <span className="text-sm text-muted-foreground mr-4">
                      {Object.values(genera).flat().length} species
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-6">
                    {Object.entries(genera).map(([genus, speciesList]) => (
                      <section key={genus} ref={setRef(`${category}-${genus}`)} className="space-y-4">
                        <div className="sticky top-0 py-2 border-b bg-slate-900 backdrop-blur-[10px] border-slate-700 z-10">
                          <h3 className="text-lg font-medium text-muted-foreground">
                            {genus} ({speciesList.length} species)
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,500px),1fr))] gap-4 sm:gap-6 w-full">
                          {speciesList.map((sp) => (
                            <SpeciesCard 
                              key={sp.ogc_fid} 
                              species={sp} 
                              category={category}
                              onNavigateToTop={() => {
                                // Scroll ScrollArea to top
                                if (gridRef.current) {
                                  const scrollContainer = gridRef.current.querySelector('[data-radix-scroll-area-viewport]');
                                  if (scrollContainer) {
                                    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                                  }
                                }
                                // Open dropdown after a small delay to ensure scroll completes
                                setTimeout(() => {
                                  const picker = document.querySelector('[role="combobox"]') as HTMLElement;
                                  if (picker) picker.click();
                                }, 300);
                              }}
                            />
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
            <div className="text-center p-12">
              <p className="text-muted-foreground">No species found for the selected filter.</p>
            </div>
          )}
        </ScrollArea>
        </div>
      )}
    </div>
  );
}