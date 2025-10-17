import { useEffect, useState, useMemo, useRef, memo } from 'react';
import { useSpeciesData } from '@/hooks/useSpeciesData';
import SpeciesCard from '@/components/SpeciesCard';
import FamilyCardStack from '@/components/FamilyCardStack';
import SpeciesCarousel from '@/components/SpeciesCarousel';
import { SpeciesSearchInput } from '@/components/SpeciesSearchInput';
import { SpeciesTree } from '@/components/SpeciesTree';
import { Loader2, ChevronDown, List, Book, BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { getEcoregions, getRealms, getBiomes, groupSpeciesByCategory, getAllCategories, getCategoryFromOrder, getFamilyDisplayNameFromSpecies } from '@/utils/ecoregion';
import { getFamilyDisplayName } from '@/config/familyCommonNames';
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
  accordionValue,
  discoveredCount,
  totalCount
}: {
  category: string;
  genera: Record<string, Species[]>;
  isOpen: boolean;
  showStickyHeaders: boolean;
  onToggle: () => void;
  setRef: (id: string) => (el: HTMLDivElement | null) => void;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  accordionValue: string;
  discoveredCount: number;
  totalCount: number;
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
              className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-t-lg px-2 sm:px-4 py-3 shadow-lg cursor-pointer hover:bg-slate-700/95 transition-colors"
              onClick={onToggle}
            >
              <div className="w-full">
                {/* Category name - FORCED to wrap */}
                <div className="flex items-start gap-2 mb-1 w-full">
                  <ChevronDown className="w-3 h-3 mt-0.5 text-blue-400 rotate-180 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h2 
                      className="leading-tight font-semibold text-foreground"
                      style={{ 
                        fontSize: 'clamp(11px, 2.5vw, 18px)',
                        lineHeight: '1.2',
                        wordBreak: 'break-all',
                        overflowWrap: 'break-word',
                        hyphens: 'auto',
                        whiteSpace: 'normal',
                        width: '100%',
                        maxWidth: '100%'
                      }}
                    >{category}</h2>
                  </div>
                </div>
                
                {/* Counters - separate line on narrow screens */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                  <span>({discoveredCount}/{totalCount})</span>
                  <span className="hidden sm:inline text-blue-400 hover:text-blue-300">Click to collapse</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={accordionRef}>
          <AccordionTrigger className="px-2 sm:px-4 py-3 hover:no-underline">
            <div className="w-full">
              {/* Category name - FORCED to wrap */}
              <div className="w-full mb-1">
                <h2 
                  className="leading-tight font-semibold text-white"
                  style={{ 
                    fontSize: 'clamp(16px, 4vw, 24px)',
                    lineHeight: '1.3',
                    wordBreak: 'break-all',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                    whiteSpace: 'normal',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                >{category}</h2>
              </div>

              {/* Counter - separate line */}
              <div className="text-xs text-muted-foreground">
                ({discoveredCount}/{totalCount})
              </div>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {Object.entries(genera).map(([family, speciesList]) => (
              <div key={`${category}-${family}`} ref={setRef(`${category}-${family}`)} className="border border-slate-600 rounded-lg bg-slate-800/30">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value={`${category}-${family}`} className="border-none">
                    <AccordionTrigger className="px-2 sm:px-4 py-3 hover:no-underline hover:bg-slate-700/30">
                      <div className="w-full">
                        {/* Family name - FORCED to wrap */}
                        <div className="w-full mb-1">
                          <h4
                            className="leading-tight font-medium text-foreground"
                            style={{
                              fontSize: 'clamp(10px, 2.5vw, 16px)',
                              lineHeight: '1.2',
                              wordBreak: 'break-all',
                              overflowWrap: 'break-word',
                              hyphens: 'auto',
                              whiteSpace: 'normal',
                              width: '100%',
                              maxWidth: '100%'
                            }}
                          >{getFamilyDisplayName(family)}</h4>
                        </div>

                        {/* Species count - separate line */}
                        <div className="text-xs text-muted-foreground">
                          ({speciesList.length} species)
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Mobile/Tablet: Use carousel below lg breakpoint (1024px) */}
                      <div className="lg:hidden">
                        <SpeciesCarousel
                          family={family}
                          speciesList={speciesList}
                          discoveredSpecies={discoveredSpecies}
                          category={category}
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
                      </div>
                      
                      {/* Desktop: Use original stack at lg breakpoint (1024px) and above */}
                      <div className="hidden lg:block">
                        <FamilyCardStack
                          family={family}
                          speciesList={speciesList}
                          discoveredSpecies={discoveredSpecies}
                          category={category}
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
});

interface SpeciesListProps {
  onBack?: () => void;
  scrollToSpeciesId?: number | null;
}

export default function SpeciesList({ onBack, scrollToSpeciesId }: SpeciesListProps = {}) {
  // Use React Query hook for species data fetching with automatic retries and caching
  const { data: species = [], isLoading, error, refetch, isFetching } = useSpeciesData();

  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showStickyHeaders, setShowStickyHeaders] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
  const [discoveredSpecies, setDiscoveredSpecies] = useState<Record<number, { name: string; discoveredAt: string }>>({});
  
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTop = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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

  // Effect to scroll to a specific species when scrollToSpeciesId is provided
  useEffect(() => {
    if (!scrollToSpeciesId || isLoading) return;

    // Find the species in the data
    const targetSpecies = species.find(s => s.ogc_fid === scrollToSpeciesId);
    if (!targetSpecies) return;

    // Determine which category the species belongs to
    const categories = groupSpeciesByCategory([targetSpecies]);
    const targetCategory = Object.keys(categories)[0];
    
    if (!targetCategory) return;

    // Open the accordion for this category
    setOpenAccordions(prev => {
      if (!prev.includes(targetCategory)) {
        return [...prev, targetCategory];
      }
      return prev;
    });

    // Scroll to the species after a short delay to allow accordion to open
    setTimeout(() => {
      const speciesElement = document.querySelector(`[data-species-id="${scrollToSpeciesId}"]`);
      if (speciesElement) {
        speciesElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a highlight effect
        speciesElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900');
        setTimeout(() => {
          speciesElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900');
        }, 3000);
      }
    }, 300);
  }, [scrollToSpeciesId, species, isLoading]);


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
      case 'family':
        return species.filter(s => s.family === selectedFilter.value);
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
  const { knownCounts, unknownCounts, totalCounts } = useMemo(() => {
    const knownOrderCounts: Record<string, number> = {};
    const unknownOrderCounts: Record<string, number> = {};
    const totalOrderCounts: Record<string, number> = {};

    knownSpecies.forEach(sp => {
      const order = sp.order_ || 'Unknown';
      knownOrderCounts[order] = (knownOrderCounts[order] || 0) + 1;
      totalOrderCounts[order] = (totalOrderCounts[order] || 0) + 1;
    });

    unknownSpecies.forEach(sp => {
      const order = sp.order_ || 'Unknown';
      unknownOrderCounts[order] = (unknownOrderCounts[order] || 0) + 1;
      totalOrderCounts[order] = (totalOrderCounts[order] || 0) + 1;
    });

    return { knownCounts: knownOrderCounts, unknownCounts: unknownOrderCounts, totalCounts: totalOrderCounts };
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

  const getViewport = () => {
    const root = gridRef.current;
    return (root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null) ?? null;
  };

  const onJump = (target: JumpTarget) => {
    if (target.type === 'ecoregion' || target.type === 'realm' || target.type === 'biome' || 
        target.type === 'species' || target.type === 'order' || target.type === 'class') {
      setSelectedFilter({ type: target.type, value: target.value });
      // Scroll the ScrollArea viewport to top
      const viewport = getViewport();
      viewport?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Handle category, genus, and family navigation
    if (target.type === 'genus' && typeof target.value === 'string') {
      // Simple genus filter
      setSelectedFilter({ type: 'genus', value: target.value });
      // Scroll the ScrollArea viewport to top
      const viewport = getViewport();
      viewport?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (target.type === 'family' && typeof target.value === 'string') {
      // Simple family filter
      setSelectedFilter({ type: 'family', value: target.value });
      // Scroll the ScrollArea viewport to top
      const viewport = getViewport();
      viewport?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    let elementId: string;
    if (target.type === 'category') {
      elementId = target.value;
    } else if (target.type === 'genus' && typeof target.value === 'object') {
      elementId = `${target.value.category}-${target.value.genus}`;
    } else if (target.type === 'family' && typeof target.value === 'object') {
      elementId = `${target.value.category}-${target.value.family}`;
    } else {
      // Default case - should not happen
      elementId = '';
    }

    const element = refs.current[elementId];
    const viewport = getViewport();
    if (element && viewport) {
      // Compute offset within the viewport
      const elTop = element.getBoundingClientRect().top;
      const vpTop = viewport.getBoundingClientRect().top;
      const current = viewport.scrollTop;
      const top = current + (elTop - vpTop) - 8;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      viewport.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      // fallback to native scroll
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowClassification(!showClassification)}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
              aria-label={showClassification ? "Hide classification" : "Show classification"}
            >
              {showClassification ? <BookOpen className="h-5 w-5" /> : <Book className="h-5 w-5" />}
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md flex items-center gap-2 transition-colors"
              >
                ← Back to Game
              </button>
            )}
          </div>
        </div>
        <div className="w-full">
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
      {!isLoading && !error && species.length > 0 && showClassification && (
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
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <p className="text-destructive font-semibold mb-2">Error loading species</p>
            <p className="text-sm text-muted-foreground mb-3">{error.message || 'Unknown error occurred'}</p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFetching ? 'Retrying...' : 'Retry Now'}
            </button>
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
                          const orderNameFormatted = order.charAt(0).toUpperCase() + order.slice(1).toLowerCase();
                          const discoveredCount = knownCounts[order] || 0;
                          const totalCount = totalCounts[order] || discoveredCount;
                          const displayName = `${orderNameFormatted}: ${totalCount}`;
                          return (
                            <AccordionCategory
                              key={accordionId}
                              category={displayName}
                              genera={genera}
                              isOpen={openAccordions.includes(accordionId)}
                              showStickyHeaders={showStickyHeaders}
                              discoveredSpecies={discoveredSpecies}
                              accordionValue={accordionId}
                              discoveredCount={discoveredCount}
                              totalCount={totalCount}
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
                          const orderNameFormatted = order.charAt(0).toUpperCase() + order.slice(1).toLowerCase();
                          const discoveredCount = knownCounts[order] || 0;
                          const totalCount = totalCounts[order] || (unknownCounts[order] || 0);
                          const displayName = `${orderNameFormatted}: ${totalCount}`;
                          return (
                            <AccordionCategory
                              key={accordionId}
                              category={displayName}
                              genera={genera}
                              isOpen={openAccordions.includes(accordionId)}
                              showStickyHeaders={showStickyHeaders}
                              discoveredSpecies={discoveredSpecies}
                              accordionValue={accordionId}
                              discoveredCount={discoveredCount}
                              totalCount={totalCount}
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
