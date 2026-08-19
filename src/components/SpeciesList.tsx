import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSpeciesData } from '@/hooks/useSpeciesData';
import AlbumHeroSwiper from '@/components/album/AlbumHeroSwiper';
import { Loader2, Album, FileQuestion, TreeDeciduous } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getEcoregions, getRealms, getBiomes, groupSpeciesByTaxonomy, normalizeTaxonName } from '@/utils/ecoregion';
import type { Species } from '@/types/database';
import type { JumpTarget } from '@/types/speciesBrowser';
import { AlbumTab } from '@/components/species-list/AlbumTab';
import { CasesTab } from '@/components/species-list/CasesTab';
import { TaxonomyTab } from '@/components/species-list/TaxonomyTab';
import type { AlbumSortMode, CasesGroupMode, SpeciesCardSummary } from '@/components/species-list/types';

const RARITY_RANK: Record<string, number> = {
  legendary: 5,
  epic: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};

interface SpeciesListProps {
  onBack?: () => void;
  scrollToSpeciesId?: number | null;
}

export default function SpeciesList({ onBack, scrollToSpeciesId }: SpeciesListProps = {}) {
  // Use React Query hook for species data fetching with automatic retries and caching
  const { data: species = [], isLoading, error, refetch, isFetching } = useSpeciesData();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();

  const [selectedFilter, setSelectedFilter] = useState<{ type: string; value: string } | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [discoveredSpecies, setDiscoveredSpecies] = useState<Record<number, { name: string; discoveredAt: string }>>({});
  const [cardProgress, setCardProgress] = useState<Record<number, SpeciesCardSummary>>({});
  const [albumSort, setAlbumSort] = useState<AlbumSortMode>('recent');
  const [albumSearch, setAlbumSearch] = useState('');
  const [casesGroupBy, setCasesGroupBy] = useState<CasesGroupMode>('biome');

  // Hero swiper state
  const [heroOpen, setHeroOpen] = useState(false);
  const [heroSpeciesList, setHeroSpeciesList] = useState<Species[]>([]);
  const [heroInitialIndex, setHeroInitialIndex] = useState(0);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const loadDiscoveredSpecies = useCallback(async () => {
    const localMap = readLocalDiscoveries();
    try {
      if (!isUserLoaded || !isSignedIn) {
        setDiscoveredSpecies(localMap);
        setCardProgress({});
        return;
      }

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
      setDiscoveredSpecies(localMap);
      setCardProgress({});
      console.error('Error loading discovered species:', error);
    }
  }, [isSignedIn, isUserLoaded]);

  useEffect(() => {
    void loadDiscoveredSpecies();
  }, [loadDiscoveredSpecies]);

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

  // Effect to scroll to a specific species when scrollToSpeciesId is provided
  useEffect(() => {
    if (!scrollToSpeciesId || isLoading) return;
    let scrollToTimer: ReturnType<typeof setTimeout> | undefined;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;

    // Find the species in the data
    const targetSpecies = species.find(s => s.id === scrollToSpeciesId);
    if (!targetSpecies) return;

    const targetAccordion = `${normalizeTaxonName(targetSpecies.class)}:${normalizeTaxonName(targetSpecies.taxon_order)}`;

    // Open the accordion for this category
    setOpenAccordions(prev => {
      if (!prev.includes(targetAccordion)) {
        return [...prev, targetAccordion];
      }
      return prev;
    });

    // Scroll to the species after a short delay to allow accordion to open
    scrollToTimer = setTimeout(() => {
      const speciesElement = document.querySelector(`[data-species-id="${scrollToSpeciesId}"]`);
      if (speciesElement) {
        speciesElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add a highlight effect
        speciesElement.classList.add('ring-2', 'ring-ring', 'ring-offset-2', 'ring-offset-background');
        highlightTimer = setTimeout(() => {
          speciesElement.classList.remove('ring-2', 'ring-ring', 'ring-offset-2', 'ring-offset-background');
        }, 3000);
      }
    }, 300);

    return () => {
      if (scrollToTimer) clearTimeout(scrollToTimer);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
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
        return species.filter(s => normalizeTaxonName(s.class) === selectedFilter.value);
      case 'order':
        return species.filter(s => normalizeTaxonName(s.taxon_order) === selectedFilter.value);
      case 'genus':
        return species.filter(s => normalizeTaxonName(s.genus) === selectedFilter.value);
      case 'family':
        return species.filter(s => normalizeTaxonName(s.family) === selectedFilter.value);
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

  const discoveredCatalog = useMemo(
    () => species.filter(sp => Boolean(discoveredSpecies[sp.id])),
    [species, discoveredSpecies]
  );
  const taxonomyHierarchy = useMemo(() => groupSpeciesByTaxonomy(knownSpecies), [knownSpecies]);

  // Taxonomy search indexes discoveries only; unknown identities stay in Cases.
  const ecoregionList = useMemo(() => getEcoregions(discoveredCatalog), [discoveredCatalog]);
  const realmList = useMemo(() => getRealms(discoveredCatalog), [discoveredCatalog]);
  const biomeList = useMemo(() => getBiomes(discoveredCatalog), [discoveredCatalog]);

  const getViewport = () => {
    const root = gridRef.current;
    return (root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null) ?? null;
  };

  const onJump = (target: JumpTarget) => {
    if (typeof target.value !== 'string') return;
    setSelectedFilter({ type: target.type, value: target.value });
    const viewport = getViewport();
    viewport?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onClearFilter = () => {
    setSelectedFilter(null);
  };

  return (
    <div className="flex flex-col h-full bg-background w-full relative">
      <Tabs defaultValue="album" className="flex flex-col h-full">
        {/* Global header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-2 bg-background relative z-50">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-semibold text-primary flex items-center gap-2">
              <Album className="size-6" />
              Field Album
            </h1>
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md flex items-center gap-2 transition-colors"
                >
                  ← Back to Game
                </button>
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <TabsList className="w-full grid grid-cols-3 h-10">
            <TabsTrigger value="album" className="text-xs sm:text-sm gap-1">
              <Album className="size-3.5 hidden sm:block" />Album
            </TabsTrigger>
            <TabsTrigger value="cases" className="text-xs sm:text-sm gap-1">
              <FileQuestion className="size-3.5 hidden sm:block" />Cases
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="text-xs sm:text-sm gap-1">
              <TreeDeciduous className="size-3.5 hidden sm:block" />Taxonomy
            </TabsTrigger>
          </TabsList>

          {/* Collection progress bar (visible on all tabs) */}
          {!isLoading && !error && species.length > 0 && (
            <div className="mt-3 px-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span><span className="text-ds-emerald font-semibold">{knownSpecies.length}</span> / {filteredSpecies.length} discovered</span>
                <span>{Math.round((knownSpecies.length / Math.max(filteredSpecies.length, 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-ds-emerald rounded-full transition-all duration-500"
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
              <Loader2 className="size-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading species data</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 px-5 pt-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive font-semibold mb-2">Error loading species</p>
              <p className="text-sm text-muted-foreground mb-3">{error.message || 'Unknown error occurred'}</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetching ? 'Retrying' : 'Retry Now'}
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
              <AlbumTab
                knownSpecies={knownSpecies}
                recentKnownSpecies={recentKnownSpecies}
                sortedKnownSpecies={sortedKnownSpecies}
                cardProgress={cardProgress}
                albumSearch={albumSearch}
                albumSort={albumSort}
                onAlbumSearchChange={setAlbumSearch}
                onAlbumSortChange={setAlbumSort}
                onOpenHero={openHeroView}
              />
            </TabsContent>

            {/* ===== CASES TAB ===== */}
            <TabsContent value="cases" className="flex-1 overflow-hidden mt-0">
              <CasesTab
                unknownSpecies={unknownSpecies}
                groupedUnknownSpecies={groupedUnknownSpecies}
                casesGroupBy={casesGroupBy}
                onCasesGroupByChange={setCasesGroupBy}
                onOpenHero={openHeroView}
              />
            </TabsContent>

            {/* ===== TAXONOMY TAB ===== */}
            <TabsContent value="taxonomy" className="flex-1 flex flex-col overflow-hidden mt-0">
              <TaxonomyTab
                searchableSpecies={discoveredCatalog}
                filteredSpecies={knownSpecies}
                discoveredCount={discoveredCatalog.length}
                unknownSpeciesCount={species.length - discoveredCatalog.length}
                taxonomyHierarchy={taxonomyHierarchy}
                ecoregionList={ecoregionList}
                realmList={realmList}
                biomeList={biomeList}
                selectedFilter={selectedFilter}
                openAccordions={openAccordions}
                discoveredSpecies={discoveredSpecies}
                gridRef={gridRef}
                onJump={onJump}
                onClearFilter={onClearFilter}
                onOpenAccordionsChange={setOpenAccordions}
              />
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

function readLocalDiscoveries(): Record<number, { name: string; discoveredAt: string }> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
    if (!Array.isArray(value)) return {};
    return Object.fromEntries(value.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const discovery = item as Record<string, unknown>;
      if (typeof discovery.id !== 'number') return [];
      return [[discovery.id, {
        name: typeof discovery.name === 'string' ? discovery.name : '',
        discoveredAt: typeof discovery.discoveredAt === 'string' ? discovery.discoveredAt : '',
      }]];
    }));
  } catch (error) {
    console.error('Error reading local discoveries:', error);
    return {};
  }
}
