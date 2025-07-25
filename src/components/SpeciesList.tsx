import { useEffect, useState, useMemo, useRef, memo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { speciesService } from '@/lib/speciesService';
import SpeciesCard from '@/components/SpeciesCard';
import { SpeciesSearchInput } from '@/components/SpeciesSearchInput';
import { SpeciesTree } from '@/components/SpeciesTree';
import { Loader2, ChevronDown, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { getEcoregions, getRealms, getBiomes, groupSpeciesByCategory, getAllCategories, getCategoryFromOrder } from '@/utils/ecoregion';
import type { Species } from '@/types/database';
import type { JumpTarget } from '@/types/speciesBrowser';

// Separate component to handle accordion category with sticky header
const AccordionCategory = memo(({ 
  category, 
  genera, 
  isOpen, 
  showStickyHeaders,
  onToggle,
  setRef,
  discoveredSpecies,
  accordionValue
}: {
  category: string;
  genera: Record<string, Species[]>;
  isOpen: boolean;
  showStickyHeaders: boolean;
  onToggle: () => void;
  setRef: (id: string) => (el: HTMLDivElement | null) => void;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  accordionValue: string;
}) => {
  const [hideSticky, setHideSticky] = useState(true);
  const accordionRef = useRef<HTMLDivElement>(null);
  
  // Intersection observer to hide sticky when original is visible
  useEffect(() => {
    if (!accordionRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setHideSticky(entry.isIntersecting);
      },
      {
        threshold: 0.9,
        rootMargin: '-50px 0px 0px 0px'
      }
    );
    
    observer.observe(accordionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={setRef(category)} className="relative">
      <AccordionItem 
        value={accordionValue} 
        className="border rounded-lg bg-slate-800/90 border-slate-700"
      >
        {/* Sticky Header - Shows above content when scrolling */}
        {isOpen && (
          <div 
            className={cn(
              "sticky top-0 z-40 pointer-events-auto",
              hideSticky ? "hidden" : showStickyHeaders ? "block" : "hidden"
            )}
          >
            <div 
              className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-t-lg px-4 py-3 shadow-lg cursor-pointer hover:bg-slate-700/95 transition-colors"
              onClick={onToggle}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChevronDown className="w-5 h-5 text-blue-400 rotate-180" />
                  <h2 className="text-lg font-semibold text-foreground">{category}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {Object.values(genera).flat().length} species
                  </span>
                  <span className="text-xs text-blue-400 hover:text-blue-300">Click to collapse</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={accordionRef}>
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold text-foreground">{category}</h2>
              <span className="text-sm text-muted-foreground mr-4">
                {Object.values(genera).flat().length} species
              </span>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-6">
            {Object.entries(genera).map(([genus, speciesList]) => (
              <section key={genus} ref={setRef(`${category}-${genus}`)} className="space-y-4">
                <div className="sticky top-12 py-2 border-b bg-slate-900 backdrop-blur-[10px] border-slate-700 z-30">
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
                      isDiscovered={!!discoveredSpecies[sp.ogc_fid]}
                      discoveredAt={discoveredSpecies[sp.ogc_fid]?.discoveredAt}
                      onNavigateToTop={() => {
                        // Scroll ScrollArea to top
                        const gridRef = document.querySelector('[data-radix-scroll-area-viewport]');
                        if (gridRef) {
                          gridRef.scrollTo({ top: 0, behavior: 'smooth' });
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
  );
});

interface SpeciesListProps {
  onBack?: () => void;
}

export default function SpeciesList({ onBack }: SpeciesListProps = {}) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showStickyHeaders, setShowStickyHeaders] = useState(false);
  const [discoveredSpecies, setDiscoveredSpecies] = useState<Record<number, { name: string; discoveredAt: string }>>({});
  
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTop = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSpecies();
    loadDiscoveredSpecies();
  }, []);

  // Function to load discovered species from localStorage
  const loadDiscoveredSpecies = () => {
    try {
      const discovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
      const discoveredMap: Record<number, { name: string; discoveredAt: string }> = {};
      discovered.forEach((d: any) => {
        discoveredMap[d.id] = { name: d.name, discoveredAt: d.discoveredAt };
      });
      setDiscoveredSpecies(discoveredMap);
      console.log('Loaded discovered species:', discovered);
    } catch (error) {
      console.error('Error loading discovered species:', error);
    }
  };

  // Listen for storage changes to update discovered species
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'discoveredSpecies') {
        loadDiscoveredSpecies();
      }
    };

    // Also listen for focus to reload when switching tabs
    const handleFocus = () => {
      loadDiscoveredSpecies();
    };

    // Listen for custom species discovered event
    const handleSpeciesDiscovered = () => {
      loadDiscoveredSpecies();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('species-discovered', handleSpeciesDiscovered);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('species-discovered', handleSpeciesDiscovered);
    };
  }, []);

  // Scroll direction detection
  useEffect(() => {
    const scrollContainer = gridRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollTop = scrollContainer.scrollTop;
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Detect scroll direction with a threshold to prevent jitter
      const scrollDelta = currentScrollTop - lastScrollTop.current;
      
      if (scrollDelta < -5 && currentScrollTop > 200) {
        // Scrolling up with threshold and not near top
        setShowStickyHeaders(true);
      } else if (scrollDelta > 5) {
        // Scrolling down with threshold
        setShowStickyHeaders(false);
      }

      lastScrollTop.current = currentScrollTop;

      // Hide sticky headers after scrolling stops or when near top
      scrollTimeout.current = setTimeout(() => {
        if (currentScrollTop <= 200) {
          setShowStickyHeaders(false);
        }
      }, 2000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [isLoading]); // Re-attach when loading completes

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
      case 'class':
        return species.filter(s => s.class === selectedFilter.value);
      case 'order':
        return species.filter(s => s.order_ === selectedFilter.value);
      case 'genus':
        return species.filter(s => s.genus === selectedFilter.value);
      case 'species':
        return species.filter(s => s.ogc_fid.toString() === selectedFilter.value);
      default:
        return species;
    }
  }, [selectedFilter, species]);

  // Separate known and unknown species
  const { knownSpecies, unknownSpecies } = useMemo(() => {
    const known: Species[] = [];
    const unknown: Species[] = [];
    
    filteredSpecies.forEach(sp => {
      if (discoveredSpecies[sp.ogc_fid]) {
        known.push(sp);
      } else {
        unknown.push(sp);
      }
    });
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Discovered species IDs:', Object.keys(discoveredSpecies));
      console.log('Known species:', known.map(s => ({ id: s.ogc_fid, name: s.comm_name })));
      console.log('Unknown species:', unknown.map(s => ({ id: s.ogc_fid, name: s.comm_name })));
    }
    
    return { knownSpecies: known, unknownSpecies: unknown };
  }, [filteredSpecies, discoveredSpecies]);

  // Count species per order for discovered and unknown
  const { knownCounts, unknownCounts } = useMemo(() => {
    const knownOrderCounts: Record<string, number> = {};
    const unknownOrderCounts: Record<string, number> = {};
    
    knownSpecies.forEach(sp => {
      const order = sp.order_ || 'Unknown';
      knownOrderCounts[order] = (knownOrderCounts[order] || 0) + 1;
    });
    
    unknownSpecies.forEach(sp => {
      const order = sp.order_ || 'Unknown';
      unknownOrderCounts[order] = (unknownOrderCounts[order] || 0) + 1;
    });
    
    return { knownCounts: knownOrderCounts, unknownCounts: unknownOrderCounts };
  }, [knownSpecies, unknownSpecies]);

  // Group species by category and genus
  const groupedKnown = useMemo(() => groupSpeciesByCategory(knownSpecies), [knownSpecies]);
  const groupedUnknown = useMemo(() => groupSpeciesByCategory(unknownSpecies), [unknownSpecies]);
  
  // Combined grouped data for search component
  const grouped = useMemo(() => {
    const combined: Record<string, Record<string, Species[]>> = {};
    
    // Add known species
    Object.entries(groupedKnown).forEach(([category, genera]) => {
      combined[category] = { ...genera };
    });
    
    // Add unknown species
    Object.entries(groupedUnknown).forEach(([category, genera]) => {
      if (combined[category]) {
        Object.entries(genera).forEach(([genus, species]) => {
          if (combined[category][genus]) {
            combined[category][genus] = [...combined[category][genus], ...species];
          } else {
            combined[category][genus] = species;
          }
        });
      } else {
        combined[category] = genera;
      }
    });
    
    return combined;
  }, [groupedKnown, groupedUnknown]);
  
  // Extract unique ecoregions, realms, and biomes
  const ecoregionList = useMemo(() => getEcoregions(species), [species]);
  const realmList = useMemo(() => getRealms(species), [species]);
  const biomeList = useMemo(() => getBiomes(species), [species]);

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    refs.current[id] = el;
  };

  const onJump = (target: JumpTarget) => {
    if (target.type === 'ecoregion' || target.type === 'realm' || target.type === 'biome' || 
        target.type === 'species' || target.type === 'order' || target.type === 'class') {
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
    if (target.type === 'genus' && typeof target.value === 'string') {
      // Simple genus filter
      setSelectedFilter({ type: 'genus', value: target.value });
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
    
    let elementId: string;
    if (target.type === 'category') {
      elementId = target.value;
    } else if (target.type === 'genus' && typeof target.value === 'object') {
      elementId = `${target.value.category}-${target.value.genus}`;
    } else {
      // Default case - should not happen
      elementId = '';
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

  const onTreeFilterSelect = (filter: { type: string; value: string; speciesData?: Species }) => {
    setSelectedFilter({ type: filter.type, value: filter.value });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 w-full relative">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-slate-900 relative z-50">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-cyan-300 flex items-center gap-2">
            <List className="h-6 w-6" />
            Species List
          </h1>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center gap-2 transition-colors"
            >
              ← Back to Game
            </button>
          )}
        </div>
        <div className="max-w-[600px] mx-auto">
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-600 mb-2">
              Categories: {getAllCategories(species).length}, 
              Ecoregions: {ecoregionList.length}, 
              Realms: {realmList.length}, 
              Biomes: {biomeList.length}
            </div>
          )}
          <SpeciesSearchInput
            grouped={grouped}
            ecoregionList={ecoregionList}
            realmList={realmList}
            biomeList={biomeList}
            species={species}
            selectedFilter={selectedFilter}
            onJump={onJump}
            onClearFilter={onClearFilter}
          />
        </div>
        {selectedFilter && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-sm text-muted-foreground">
              Showing {filteredSpecies.length} species
            </p>
            <div className="flex items-center gap-1 bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
              <span className="capitalize">{selectedFilter.type}:</span>
              <span className="font-medium">
                {selectedFilter.value}
              </span>
              <button
                onClick={onClearFilter}
                className="ml-1 hover:text-blue-100 transition-colors"
                aria-label="Clear filter"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Species Tree View */}
      {!isLoading && !error && species.length > 0 && (
        <div className="px-5 pb-4">
          <h2 className="text-lg font-semibold mb-3 text-foreground">Browse by Classification</h2>
          <SpeciesTree 
            species={species} 
            onFilterSelect={onTreeFilterSelect}
            selectedFilter={selectedFilter}
          />
        </div>
      )}

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
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full px-5" ref={gridRef}>
            {/* Display single species when species filter is active */}
            {selectedFilter?.type === 'species' && filteredSpecies.length === 1 ? (
              <div className="max-w-4xl mx-auto py-8">
                <SpeciesCard 
                  species={filteredSpecies[0]} 
                  category={filteredSpecies[0].order_ || 'Unknown'}
                  isDiscovered={!!discoveredSpecies[filteredSpecies[0].ogc_fid]}
                  discoveredAt={discoveredSpecies[filteredSpecies[0].ogc_fid]?.discoveredAt}
                  onNavigateToTop={() => {
                    // Scroll ScrollArea to top
                    if (gridRef.current) {
                      const scrollContainer = gridRef.current.querySelector('[data-radix-scroll-area-viewport]');
                      if (scrollContainer) {
                        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }
                  }}
                />
              </div>
            ) : (
              /* Display grouped species for other filters */
              <>
                <div className="space-y-6">
                  {/* Known Species Section */}
                  {Object.keys(groupedKnown).length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-green-400 mb-4">
                        🏆 Discovered Species ({knownSpecies.length})
                      </h2>
                      <Accordion
                        type="multiple"
                        className="w-full space-y-4"
                        value={openAccordions}
                        onValueChange={setOpenAccordions}
                      >
                        {Object.entries(groupedKnown).map(([order, genera]) => {
                          const accordionId = `known-${order}`;
                          const displayName = `${order}: ${knownCounts[order] || 0}`;
                          return (
                            <AccordionCategory
                              key={accordionId}
                              category={displayName}
                              genera={genera}
                              isOpen={openAccordions.includes(accordionId)}
                              showStickyHeaders={showStickyHeaders}
                              discoveredSpecies={discoveredSpecies}
                              accordionValue={accordionId}
                              onToggle={() => {
                                setOpenAccordions(prev => 
                                  prev.includes(accordionId) 
                                    ? prev.filter(c => c !== accordionId)
                                    : [...prev, accordionId]
                                );
                                setShowStickyHeaders(false);
                              }}
                              setRef={setRef}
                            />
                          );
                        })}
                      </Accordion>
                    </div>
                  )}

                  {/* Unknown Species Section */}
                  {Object.keys(groupedUnknown).length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-slate-400 mb-4">
                        🔍 Unknown Species ({unknownSpecies.length})
                      </h2>
                      <Accordion
                        type="multiple"
                        className="w-full space-y-4"
                        value={openAccordions}
                        onValueChange={setOpenAccordions}
                      >
                        {Object.entries(groupedUnknown).map(([order, genera]) => {
                          const accordionId = `unknown-${order}`;
                          const displayName = `${order}: ${unknownCounts[order] || 0}`;
                          return (
                            <AccordionCategory
                              key={accordionId}
                              category={displayName}
                              genera={genera}
                              isOpen={openAccordions.includes(accordionId)}
                              showStickyHeaders={showStickyHeaders}
                              discoveredSpecies={discoveredSpecies}
                              accordionValue={accordionId}
                              onToggle={() => {
                                setOpenAccordions(prev => 
                                  prev.includes(accordionId) 
                                    ? prev.filter(c => c !== accordionId)
                                    : [...prev, accordionId]
                                );
                                setShowStickyHeaders(false);
                              }}
                              setRef={setRef}
                            />
                          );
                        })}
                      </Accordion>
                    </div>
                  )}
                </div>

                {Object.keys(groupedKnown).length === 0 && Object.keys(groupedUnknown).length === 0 && (
                  <div className="text-center p-12">
                    <p className="text-muted-foreground">No species found for the selected filter.</p>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}