import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { useSpeciesData } from '@/hooks/useSpeciesData';
import SpeciesCard from '@/components/SpeciesCard';
import FamilyCardStack from '@/components/FamilyCardStack';
import SpeciesCarousel from '@/components/SpeciesCarousel';
import AlbumHeroSwiper from '@/components/album/AlbumHeroSwiper';
import { SpeciesSearchInput } from '@/components/SpeciesSearchInput';
import { SpeciesTree } from '@/components/SpeciesTree';
import { Loader2, ChevronDown, List, Book, BookOpen, Album, FileQuestion, Map, TreeDeciduous, MapPin, Swords, Clock, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getRunNodeLabel } from '@/expedition/domain';
import { getEcoregions, getRealms, getBiomes, groupSpeciesByCategory, getAllCategories, getCategoryFromOrder, getFamilyDisplayNameFromSpecies } from '@/utils/ecoregion';
import { getFamilyDisplayName } from '@/config/familyCommonNames';
import type { Species } from '@/types/database';
import type { FeatureClass } from '@/types/gis';
import type { JumpTarget } from '@/types/speciesBrowser';
import type { ExpeditionWaypointMemory } from '@/types/waypoints';

// Run type from API
interface RunSummary {
  id: string;
  status: string;
  locationKey: string;
  realm: string | null;
  biome: string | null;
  bioregion: string | null;
  scoreTotal: number;
  finalScore: number | null;
  nodeCount: number;
  startedAt: string;
  endedAt: string | null;
  affinities: string[];
  resourceWallet: Record<string, number> | null;
  discoveredSpecies: { id: number; name: string } | null;
  routePolyline: Array<{ lon: number; lat: number }>;
  routeBounds: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  gisFeaturesNearby: Array<{ featureClass: FeatureClass; name?: string | null }>;
  nodes: Array<{
    nodeOrder: number;
    nodeType: string;
    nodeStatus: string;
    scoreEarned: number;
    movesUsed: number;
    counterGem: string | null;
    obstacleFamily: string | null;
    waypoint?: ExpeditionWaypointMemory | null;
  }>;
}

interface SpeciesCardSummary {
  completionPct?: number;
  rarityTier?: string;
  cardVariant?: string | null;
  bestRunScore?: number | null;
}

type AlbumSortMode = 'recent' | 'completion' | 'rarity' | 'best';
type CasesGroupMode = 'biome' | 'realm' | 'bioregion';

const RARITY_RANK: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

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
  const [cardProgress, setCardProgress] = useState<Record<number, SpeciesCardSummary>>({});
  const [albumSort, setAlbumSort] = useState<AlbumSortMode>('recent');
  const [albumSearch, setAlbumSearch] = useState('');
  const [casesGroupBy, setCasesGroupBy] = useState<CasesGroupMode>('biome');

  // Hero swiper state
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroSpeciesList, setHeroSpeciesList] = useState<Species[]>([]);
  const [heroInitialIndex, setHeroInitialIndex] = useState(0);

  // Runs tab state
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsLoaded, setRunsLoaded] = useState(false);

  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTop = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const loadDiscoveredSpecies = useCallback(async () => {
    try {
      const localDiscovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
      const localMap: Record<number, { name: string; discoveredAt: string }> = {};
      localDiscovered.forEach((d: any) => {
        if (typeof d?.id === 'number') {
          localMap[d.id] = { name: d.name || '', discoveredAt: d.discoveredAt || '' };
        }
      });

      const response = await fetch('/api/species/cards');
      if (!response.ok) {
        setDiscoveredSpecies(localMap);
        setCardProgress({});
        return;
      }

      const data = await response.json().catch(() => null);
      const serverMap: Record<number, { name: string; discoveredAt: string }> = {};
      const progressMap: Record<number, SpeciesCardSummary> = {};
      const cards = Array.isArray(data?.cards) ? data.cards : [];

      cards.forEach((card: any) => {
        if (typeof card?.speciesId === 'number') {
          progressMap[card.speciesId] = {
            completionPct: typeof card.completionPct === 'number' ? card.completionPct : undefined,
            rarityTier: typeof card.rarityTier === 'string' ? card.rarityTier : undefined,
            cardVariant: typeof card.cardVariant === 'string' ? card.cardVariant : null,
            bestRunScore: typeof card.bestRunScore === 'number' ? card.bestRunScore : null,
          };
        }
        if (card?.discovered && typeof card?.speciesId === 'number') {
          serverMap[card.speciesId] = {
            name: localMap[card.speciesId]?.name || '',
            discoveredAt: card.firstDiscoveredAt || localMap[card.speciesId]?.discoveredAt || '',
          };
        }
      });

      setDiscoveredSpecies({ ...localMap, ...serverMap });
      setCardProgress(progressMap);
    } catch (error) {
      try {
        const discovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
        const discoveredMap: Record<number, { name: string; discoveredAt: string }> = {};
        discovered.forEach((d: any) => {
          discoveredMap[d.id] = { name: d.name, discoveredAt: d.discoveredAt };
        });
        setDiscoveredSpecies(discoveredMap);
        setCardProgress({});
      } catch (fallbackError) {
        console.error('Error loading discovered species:', fallbackError);
      }
      console.error('Error loading discovered species:', error);
    }
  }, []);

  useEffect(() => {
    void loadDiscoveredSpecies();
  }, [loadDiscoveredSpecies]);

  // Fetch runs when user opens runs tab
  const fetchRuns = useCallback(() => {
    if (runsLoaded || runsLoading) return;
    setRunsLoading(true);
    fetch('/api/runs/list?status=completed&limit=20')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.runs) {
          setRuns(data.runs);
          setRunsLoaded(true);
        }
        // Don't mark loaded on null (401/error) so it retries when auth is ready
      })
      .catch(err => console.error('Failed to fetch runs:', err))
      .finally(() => setRunsLoading(false));
  }, [runsLoaded, runsLoading]);

  const openHeroView = useCallback((list: Species[], index: number) => {
    setHeroSpeciesList(list);
    setHeroInitialIndex(index);
    setHeroOpen(true);
  }, []);

  // Listen for storage changes to update discovered species
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'discoveredSpecies') {
        void loadDiscoveredSpecies();
      }
    };

    // Also listen for focus to reload when switching tabs
    const handleFocus = () => {
      void loadDiscoveredSpecies();
    };

    // Listen for custom species discovered event
    const handleSpeciesDiscovered = () => {
      void loadDiscoveredSpecies();
    };

    const handleCardProgressUpdated = () => {
      void loadDiscoveredSpecies();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('species-discovered', handleSpeciesDiscovered);
    window.addEventListener('species-card-progress-updated', handleCardProgressUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('species-discovered', handleSpeciesDiscovered);
      window.removeEventListener('species-card-progress-updated', handleCardProgressUpdated);
    };
  }, [loadDiscoveredSpecies]);

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
    const targetSpecies = species.find(s => s.id === scrollToSpeciesId);
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
        return species.filter(s => s.bioregion === selectedFilter.value);
      case 'realm':
        return species.filter(s => s.realm === selectedFilter.value);
      case 'biome':
        return species.filter(s => s.biome === selectedFilter.value);
      case 'class':
        return species.filter(s => s.class === selectedFilter.value);
      case 'order':
        return species.filter(s => s.taxon_order === selectedFilter.value);
      case 'genus':
        return species.filter(s => s.genus === selectedFilter.value);
      case 'family':
        return species.filter(s => s.family === selectedFilter.value);
      case 'species':
        return species.filter(s => s.id.toString() === selectedFilter.value);
      default:
        return species;
    }
  }, [selectedFilter, species]);

  // Separate known and unknown species
  const { knownSpecies, unknownSpecies } = useMemo(() => {
    const known: Species[] = [];
    const unknown: Species[] = [];
    
    filteredSpecies.forEach(sp => {
      if (discoveredSpecies[sp.id]) {
        known.push(sp);
      } else {
        unknown.push(sp);
      }
    });
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('Discovered species IDs:', Object.keys(discoveredSpecies));
      console.log('Known species:', known.map(s => ({ id: s.id, name: s.common_name })));
      console.log('Unknown species:', unknown.map(s => ({ id: s.id, name: s.common_name })));
    }
    
    return { knownSpecies: known, unknownSpecies: unknown };
  }, [filteredSpecies, discoveredSpecies]);

  const visibleKnownSpecies = useMemo(() => {
    const query = albumSearch.trim().toLowerCase();
    if (!query) return knownSpecies;

    return knownSpecies.filter((sp) => {
      return [
        sp.common_name,
        sp.scientific_name,
        sp.family,
        sp.taxon_order,
        sp.biome,
        sp.conservation_code,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [knownSpecies, albumSearch]);

  const recentKnownSpecies = useMemo(() => {
    return [...visibleKnownSpecies].sort((a, b) => {
      const aTime = discoveredSpecies[a.id]?.discoveredAt || '';
      const bTime = discoveredSpecies[b.id]?.discoveredAt || '';
      return bTime.localeCompare(aTime);
    });
  }, [visibleKnownSpecies, discoveredSpecies]);

  const sortedKnownSpecies = useMemo(() => {
    return [...visibleKnownSpecies].sort((a, b) => {
      const cardA = cardProgress[a.id];
      const cardB = cardProgress[b.id];

      if (albumSort === 'completion') {
        return (cardB?.completionPct ?? 0) - (cardA?.completionPct ?? 0) || a.id - b.id;
      }

      if (albumSort === 'rarity') {
        return (RARITY_RANK[cardB?.rarityTier ?? 'common'] ?? 0) - (RARITY_RANK[cardA?.rarityTier ?? 'common'] ?? 0) || a.id - b.id;
      }

      if (albumSort === 'best') {
        return (cardB?.bestRunScore ?? -1) - (cardA?.bestRunScore ?? -1) || a.id - b.id;
      }

      const aTime = discoveredSpecies[a.id]?.discoveredAt || '';
      const bTime = discoveredSpecies[b.id]?.discoveredAt || '';
      return bTime.localeCompare(aTime) || a.id - b.id;
    });
  }, [visibleKnownSpecies, cardProgress, discoveredSpecies, albumSort]);

  const groupedUnknownSpecies = useMemo(() => {
    const groups = new globalThis.Map<string, { label: string; species: Species[] }>();

    for (const sp of unknownSpecies) {
      const label = getCaseGroupLabel(sp, casesGroupBy);
      const key = label.toLowerCase();
      const group = groups.get(key) ?? { label, species: [] };
      group.species.push(sp);
      groups.set(key, group);
    }

    return [...groups.values()]
      .map(group => ({
        ...group,
        species: [...group.species].sort(compareSpeciesName),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [unknownSpecies, casesGroupBy]);

  // Count species per order for discovered and unknown
  const { knownCounts, unknownCounts, totalCounts } = useMemo(() => {
    const knownOrderCounts: Record<string, number> = {};
    const unknownOrderCounts: Record<string, number> = {};
    const totalOrderCounts: Record<string, number> = {};

    knownSpecies.forEach(sp => {
      const order = sp.taxon_order || 'Unknown';
      knownOrderCounts[order] = (knownOrderCounts[order] || 0) + 1;
      totalOrderCounts[order] = (totalOrderCounts[order] || 0) + 1;
    });

    unknownSpecies.forEach(sp => {
      const order = sp.taxon_order || 'Unknown';
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
      <Tabs defaultValue="album" className="flex flex-col h-full" onValueChange={(v) => { if (v === 'runs') fetchRuns(); }}>
        {/* Global header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-2 bg-slate-900 relative z-50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-semibold text-cyan-300 flex items-center gap-2">
              <Album className="h-6 w-6" />
              Field Album
            </h1>
            <div className="flex items-center gap-2">
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

          {/* Tab navigation */}
          <TabsList className="w-full grid grid-cols-4 h-10">
            <TabsTrigger value="album" className="text-xs sm:text-sm gap-1">
              <Album className="h-3.5 w-3.5 hidden sm:block" />Album
            </TabsTrigger>
            <TabsTrigger value="cases" className="text-xs sm:text-sm gap-1">
              <FileQuestion className="h-3.5 w-3.5 hidden sm:block" />Cases
            </TabsTrigger>
            <TabsTrigger value="runs" className="text-xs sm:text-sm gap-1">
              <Map className="h-3.5 w-3.5 hidden sm:block" />Runs
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="text-xs sm:text-sm gap-1">
              <TreeDeciduous className="h-3.5 w-3.5 hidden sm:block" />Taxonomy
            </TabsTrigger>
          </TabsList>

          {/* Collection progress bar (visible on all tabs) */}
          {!isLoading && !error && species.length > 0 && (
            <div className="mt-3 px-1">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span><span className="text-green-400 font-semibold">{knownSpecies.length}</span> / {filteredSpecies.length} discovered</span>
                <span>{Math.round((knownSpecies.length / Math.max(filteredSpecies.length, 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(knownSpecies.length / Math.max(filteredSpecies.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Loading / error states */}
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
            <p className="text-center text-muted-foreground">No species found in the database.</p>
          </div>
        )}

        {!isLoading && !error && species.length > 0 && (
          <>
            {/* ===== ALBUM TAB ===== */}
            <TabsContent value="album" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full px-5">
                <div className="space-y-6 py-4">
                  {knownSpecies.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        value={albumSearch}
                        onChange={(event) => setAlbumSearch(event.target.value)}
                        placeholder="Search collection"
                        className="w-full rounded-md border border-slate-700 bg-slate-900/70 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {/* Recent discoveries */}
                  {recentKnownSpecies.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-3">Recent Discoveries</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {recentKnownSpecies
                          .slice(0, 8)
                          .map((sp, i) => (
                            <SpeciesTCGCardMini
                              key={sp.id}
                              species={sp}
                              isDiscovered
                              card={cardProgress[sp.id]}
                              onClick={() => openHeroView(recentKnownSpecies, i)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* All discovered by family */}
                  {knownSpecies.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-white">Collection</h2>
                        <div className="flex rounded-md border border-slate-700 bg-slate-900/60 p-0.5">
                          {([
                            ['recent', 'Recent'],
                            ['completion', 'Complete'],
                            ['rarity', 'Rarity'],
                            ['best', 'Best'],
                          ] as Array<[AlbumSortMode, string]>).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setAlbumSort(mode)}
                              className={cn(
                                'px-2 py-1 text-[10px] rounded transition-colors',
                                albumSort === mode
                                  ? 'bg-slate-700 text-white'
                                  : 'text-slate-400 hover:text-white'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {sortedKnownSpecies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {sortedKnownSpecies.map((sp, i) => (
                            <SpeciesTCGCardMini
                              key={sp.id}
                              species={sp}
                              isDiscovered
                              card={cardProgress[sp.id]}
                              onClick={() => openHeroView(sortedKnownSpecies, i)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-slate-400 text-sm">No cards match your search</p>
                        </div>
                      )}
                    </div>
                  )}

                  {knownSpecies.length === 0 && (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4 opacity-30">?</div>
                      <p className="text-slate-400 text-lg mb-2">No discoveries yet</p>
                      <p className="text-slate-500 text-sm">Start an expedition to discover species</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== CASES TAB ===== */}
            <TabsContent value="cases" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full px-5">
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white">Unsolved Cases</h2>
                    {unknownSpecies.length > 0 && (
                      <div className="flex rounded-md border border-slate-700 bg-slate-900/60 p-0.5">
                        {([
                          ['biome', 'Biome'],
                          ['realm', 'Realm'],
                          ['bioregion', 'Region'],
                        ] as Array<[CasesGroupMode, string]>).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setCasesGroupBy(mode)}
                            className={cn(
                              'px-2 py-1 text-[10px] rounded transition-colors',
                              casesGroupBy === mode
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {unknownSpecies.length > 0 ? (
                    <div className="space-y-5">
                      {groupedUnknownSpecies.map((group) => (
                        <div key={group.label}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <h3 className="font-semibold text-slate-300">{group.label}</h3>
                            <span className="text-slate-500">{group.species.length} cases</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {group.species.map((sp, i) => (
                              <SpeciesTCGCardMini
                                key={sp.id}
                                species={sp}
                                isDiscovered={false}
                                onClick={() => openHeroView(group.species, i)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <p className="text-green-400 text-lg mb-2">All species discovered!</p>
                      <p className="text-slate-500 text-sm">You've solved every case</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== RUNS TAB ===== */}
            <TabsContent value="runs" className="flex-1 overflow-hidden mt-0" onFocusCapture={fetchRuns} onMouseEnter={fetchRuns}>
              <ScrollArea className="h-full px-5">
                <div className="space-y-4 py-4">
                  <h2 className="text-lg font-semibold text-white">Expedition Runs</h2>
                  {runsLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground text-sm">Loading runs...</span>
                    </div>
                  )}
                  {runsLoaded && runs.length === 0 && (
                    <div className="text-center py-16">
                      <Map className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 text-lg mb-2">No completed runs yet</p>
                      <p className="text-slate-500 text-sm">Complete an expedition to see it here</p>
                    </div>
                  )}
                  {runs.map(run => (
                    <RunMemoryCard key={run.id} run={run} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ===== TAXONOMY TAB ===== */}
            <TabsContent value="taxonomy" className="flex-1 overflow-hidden mt-0">
              <div className="flex-shrink-0 px-5 pb-2">
                <div className="w-full">
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
                    <p className="text-sm text-muted-foreground">Showing {filteredSpecies.length} species</p>
                    <div className="flex items-center gap-1 bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                      <span className="capitalize">{selectedFilter.type}:</span>
                      <span className="font-medium">{selectedFilter.value}</span>
                      <button onClick={onClearFilter} className="ml-1 hover:text-blue-100 transition-colors" aria-label="Clear filter">×</button>
                    </div>
                  </div>
                )}
                {showClassification && (
                  <div className="pt-2">
                    <SpeciesTree species={species} onFilterSelect={onTreeFilterSelect} selectedFilter={selectedFilter} />
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setShowClassification(!showClassification)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors text-xs flex items-center gap-1"
                  >
                    {showClassification ? <BookOpen className="h-4 w-4" /> : <Book className="h-4 w-4" />}
                    {showClassification ? 'Hide Tree' : 'Show Tree'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="h-full px-5" ref={gridRef}>
                  {selectedFilter?.type === 'species' && filteredSpecies.length === 1 ? (
                    <div className="max-w-4xl mx-auto py-8">
                      <SpeciesCard
                        species={filteredSpecies[0]}
                        category={filteredSpecies[0].taxon_order || 'Unknown'}
                        isDiscovered={!!discoveredSpecies[filteredSpecies[0].id]}
                        discoveredAt={discoveredSpecies[filteredSpecies[0].id]?.discoveredAt}
                        onNavigateToTop={() => {
                          if (gridRef.current) {
                            const scrollContainer = gridRef.current.querySelector('[data-radix-scroll-area-viewport]');
                            if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="mb-4 px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300"><span className="text-green-400 font-semibold">{knownSpecies.length}</span> discovered</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300"><span className="text-slate-400 font-semibold">{unknownSpecies.length}</span> undiscovered</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300"><span className="font-semibold">{filteredSpecies.length}</span> total</span>
                        </div>
                      </div>
                      <Accordion type="multiple" className="w-full space-y-4" value={openAccordions} onValueChange={setOpenAccordions}>
                        {Object.entries(grouped).map(([order, genera]) => {
                          const accordionId = order;
                          const orderNameFormatted = order.charAt(0).toUpperCase() + order.slice(1).toLowerCase();
                          const discoveredCount = knownCounts[order] || 0;
                          const totalCount = totalCounts[order] || Object.values(genera).reduce((sum, list) => sum + list.length, 0);
                          return (
                            <AccordionCategory
                              key={accordionId}
                              category={orderNameFormatted}
                              genera={genera}
                              isOpen={openAccordions.includes(accordionId)}
                              showStickyHeaders={showStickyHeaders}
                              discoveredSpecies={discoveredSpecies}
                              accordionValue={accordionId}
                              discoveredCount={discoveredCount}
                              totalCount={totalCount}
                              onToggle={() => {
                                setOpenAccordions(prev =>
                                  prev.includes(accordionId) ? prev.filter(c => c !== accordionId) : [...prev, accordionId]
                                );
                                setShowStickyHeaders(false);
                              }}
                              setRef={setRef}
                            />
                          );
                        })}
                      </Accordion>
                      {Object.keys(grouped).length === 0 && (
                        <div className="text-center p-12">
                          <p className="text-muted-foreground">No species found for the selected filter.</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </>
        )}
        {/* Hero swiper overlay */}
        {heroOpen && (
          <AlbumHeroSwiper
            speciesList={heroSpeciesList}
            discoveredSpecies={discoveredSpecies}
            initialIndex={heroInitialIndex}
            onClose={() => setHeroOpen(false)}
          />
        )}
      </Tabs>
    </div>
  );
}

// ---- Run memory card for Runs tab ----
function RunMemoryCard({ run }: { run: RunSummary }) {
  const completedNodes = run.nodes.filter(n => n.nodeStatus === 'completed').length;
  const walletEntries = Object.entries(run.resourceWallet ?? {})
    .filter(([, value]) => typeof value === 'number' && value > 0)
    .slice(0, 4);
  const featureClasses = [...new Set(run.gisFeaturesNearby.map(f => f.featureClass).filter(Boolean))].slice(0, 4);

  return (
    <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{run.bioregion || run.realm || run.locationKey}</p>
            {run.biome && <p className="text-[11px] text-slate-400 truncate">{run.biome}</p>}
          </div>
        </div>
        {run.finalScore != null && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">{run.finalScore}</span>
          </div>
        )}
      </div>

      {(run.routePolyline.length > 1 || run.discoveredSpecies) && (
        <div className="mb-3 grid grid-cols-[88px_1fr] gap-3">
          <RunRouteSparkline points={run.routePolyline} />
          <div className="min-w-0">
            {run.discoveredSpecies && (
              <p className="text-[11px] text-green-300 truncate">Found {run.discoveredSpecies.name}</p>
            )}
            {featureClasses.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {featureClasses.map((featureClass) => (
                  <span key={featureClass} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900/80 text-cyan-300 border border-slate-700">
                    {featureClass.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Node chips */}
      <div className="flex gap-1 flex-wrap mb-2">
        {run.nodes.filter(n => n.nodeType !== 'analysis').map((node, i) => {
          const waypointName = typeof node.waypoint?.name === 'string' ? node.waypoint.name : '';
          const nodeLabel = getRunNodeLabel(node);
          const chipTitle = waypointName
            ? `${nodeLabel} - ${waypointName}`
            : nodeLabel;

          return (
            <span
              key={i}
              title={chipTitle}
              className={cn(
                'inline-flex flex-col text-[9px] px-1.5 py-0.5 rounded border max-w-[112px]',
                node.nodeStatus === 'completed'
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              )}
            >
              <span className="truncate">
                {nodeLabel}
                {node.counterGem && <span className="ml-0.5 text-cyan-400">[{node.counterGem}]</span>}
              </span>
              {waypointName && (
                <span className="truncate text-emerald-300/80">{waypointName}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{completedNodes}/{run.nodeCount} nodes</span>
        {run.affinities.length > 0 && (
          <span className="text-purple-400">{(run.affinities as string[]).join(', ')}</span>
        )}
        {walletEntries.length > 0 && (
          <span className="text-cyan-400">
            {walletEntries.map(([key, value]) => `${key[0].toUpperCase()}${value}`).join(' ')}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

function RunRouteSparkline({ points }: { points: Array<{ lon: number; lat: number }> }) {
  if (points.length <= 1) {
    return <div className="h-14 rounded bg-slate-900/70 border border-slate-700" />;
  }

  const xs = points.map(point => point.lon);
  const ys = points.map(point => point.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = 88;
  const height = 56;
  const pad = 8;
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const polyline = points.map((point) => {
    const x = pad + ((point.lon - minX) / dx) * (width - pad * 2);
    const y = height - pad - ((point.lat - minY) / dy) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const start = polyline[0].split(',');
  const end = polyline[polyline.length - 1].split(',');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-[88px] rounded bg-slate-900/70 border border-slate-700">
      <polyline points={polyline.join(' ')} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r="2" fill="#facc15" />
      <circle cx={end[0]} cy={end[1]} r="2" fill="#22c55e" />
    </svg>
  );
}

function getCaseGroupLabel(species: Species, mode: CasesGroupMode): string {
  if (mode === 'realm') return species.realm || 'Unknown Realm';
  if (mode === 'bioregion') return species.bioregion || 'Unknown Region';
  return species.biome || 'Unknown Biome';
}

function compareSpeciesName(a: Species, b: Species): number {
  const aName = a.common_name || a.scientific_name || '';
  const bName = b.common_name || b.scientific_name || '';
  return aName.localeCompare(bName) || a.id - b.id;
}

// ---- Mini TCG card for album/cases grid ----
function SpeciesTCGCardMini({
  species,
  isDiscovered,
  card,
  onClick,
}: {
  species: Species;
  isDiscovered: boolean;
  card?: SpeciesCardSummary;
  onClick?: () => void;
}) {
  const iucnColor: Record<string, string> = {
    CR: 'border-red-500/60 bg-red-500/10',
    EN: 'border-amber-500/60 bg-amber-500/10',
    VU: 'border-cyan-500/60 bg-cyan-500/10',
    NT: 'border-green-500/40 bg-green-500/5',
    LC: 'border-slate-600 bg-slate-800/50',
  };
  const frameClass = iucnColor[species.conservation_code || ''] || 'border-slate-600 bg-slate-800/50';
  const completionPct = typeof card?.completionPct === 'number'
    ? Math.max(0, Math.min(100, Math.round(card.completionPct)))
    : null;
  const variantLabel = card?.cardVariant === 'foil' ? 'Foil' : null;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 transition-all hover:scale-[1.02] cursor-pointer',
        frameClass,
        variantLabel && 'ring-1 ring-cyan-300/50'
      )}
      onClick={onClick}
    >
      {/* Conservation badge */}
      {species.conservation_code && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {species.conservation_code}
          </span>
          {variantLabel && (
            <span className="text-[9px] font-semibold uppercase text-cyan-200 bg-cyan-300/15 border border-cyan-300/30 rounded px-1">
              {variantLabel}
            </span>
          )}
          {species.biome && (
            <span className="text-[9px] text-slate-500 truncate max-w-[60%] text-right">
              {species.biome}
            </span>
          )}
        </div>
      )}

      {/* Art / silhouette area */}
      <div className="aspect-[4/3] rounded bg-slate-900/60 flex items-center justify-center mb-2">
        {isDiscovered ? (
          <span className="text-3xl">
            {species.class === 'AVES' ? '🐦' : species.class === 'MAMMALIA' ? '🦁' : species.class === 'REPTILIA' ? '🦎' : species.class === 'AMPHIBIA' ? '🐸' : '🐾'}
          </span>
        ) : (
          <span className="text-3xl opacity-20">?</span>
        )}
      </div>

      {/* Name */}
      <div className="min-h-[2.5rem]">
        {isDiscovered ? (
          <>
            <p className="text-xs font-semibold text-white leading-tight truncate">
              {species.common_name || species.scientific_name}
            </p>
            <p className="text-[10px] italic text-slate-400 truncate">
              {species.scientific_name}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-500 leading-tight">???</p>
            <p className="text-[10px] italic text-slate-600">Unknown Species</p>
          </>
        )}
      </div>

      {/* Habitat tags */}
      <div className="flex gap-1 mt-1 flex-wrap">
        {species.marine && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">Marine</span>}
        {species.terrestrial && <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">Land</span>}
        {species.freshwater && <span className="text-[8px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">Fresh</span>}
      </div>

      {isDiscovered && completionPct != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
            <span className="capitalize">{card?.rarityTier ?? 'common'}</span>
            <span>{completionPct}%</span>
          </div>
          <div className="h-1 rounded-full bg-slate-900/80 overflow-hidden">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${completionPct}%` }} />
          </div>
          {card?.bestRunScore != null && (
            <p className="text-[9px] text-amber-300 mt-1 truncate">Best {card.bestRunScore} pts</p>
          )}
        </div>
      )}
    </div>
  );
}
