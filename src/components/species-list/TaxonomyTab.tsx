import { memo, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Book, BookOpen, ChevronDown } from 'lucide-react';
import SpeciesCard from '@/components/SpeciesCard';
import FamilyCardStack from '@/components/FamilyCardStack';
import SpeciesCarousel from '@/components/SpeciesCarousel';
import { SpeciesSearchInput } from '@/components/SpeciesSearchInput';
import { SpeciesTree } from '@/components/SpeciesTree';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { getFamilyDisplayName } from '@/config/familyCommonNames';
import type { Species } from '@/types/database';
import type { JumpTarget } from '@/types/speciesBrowser';

type SpeciesFilter = { type: string; value: string } | null;

export function TaxonomyTab({
  species,
  filteredSpecies,
  knownSpecies,
  unknownSpecies,
  grouped,
  ecoregionList,
  realmList,
  biomeList,
  selectedFilter,
  showClassification,
  openAccordions,
  showStickyHeaders,
  discoveredSpecies,
  knownCounts,
  totalCounts,
  gridRef,
  setRef,
  onJump,
  onClearFilter,
  onTreeFilterSelect,
  onToggleClassification,
  onOpenAccordionsChange,
  onStickyHeadersChange,
}: {
  species: Species[];
  filteredSpecies: Species[];
  knownSpecies: Species[];
  unknownSpecies: Species[];
  grouped: Record<string, Record<string, Species[]>>;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  selectedFilter: SpeciesFilter;
  showClassification: boolean;
  openAccordions: string[];
  showStickyHeaders: boolean;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  knownCounts: Record<string, number>;
  totalCounts: Record<string, number>;
  gridRef: MutableRefObject<HTMLDivElement | null>;
  setRef: (id: string) => (el: HTMLDivElement | null) => void;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
  onTreeFilterSelect: (filter: { type: string; value: string; speciesData?: Species }) => void;
  onToggleClassification: () => void;
  onOpenAccordionsChange: (value: string[] | ((prev: string[]) => string[])) => void;
  onStickyHeadersChange: (value: boolean) => void;
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden mt-0">
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
            <div className="flex items-center gap-1 bg-primary/15 text-primary px-3 py-1 rounded-full text-sm">
              <span className="capitalize">{selectedFilter.type}:</span>
              <span className="font-medium">{selectedFilter.value}</span>
              <button onClick={onClearFilter} className="ml-1 hover:text-primary/70 transition-colors" aria-label="Clear filter">×</button>
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
            onClick={onToggleClassification}
            className="p-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-md transition-colors text-xs flex items-center gap-1"
          >
            {showClassification ? <BookOpen className="size-4" /> : <Book className="size-4" />}
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
            <div className="space-y-6 pb-24">
              <div className="mb-4 px-4 py-3 bg-card/50 rounded-lg border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground"><span className="text-ds-emerald font-semibold">{knownSpecies.length}</span> discovered</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground"><span className="text-muted-foreground font-semibold">{unknownSpecies.length}</span> undiscovered</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-foreground"><span className="font-semibold">{filteredSpecies.length}</span> total</span>
                </div>
              </div>
              <Accordion type="multiple" className="w-full space-y-4" value={openAccordions} onValueChange={onOpenAccordionsChange}>
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
                        onOpenAccordionsChange(prev =>
                          prev.includes(accordionId) ? prev.filter(c => c !== accordionId) : [...prev, accordionId]
                        );
                        onStickyHeadersChange(false);
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
    </div>
  );
}

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
        className="border rounded-lg bg-card/90 border-border"
      >
        {isOpen && (
          <div
            className={cn(
              'sticky top-0 z-40 pointer-events-auto',
              hideSticky ? 'hidden' : showStickyHeaders ? 'block' : 'hidden'
            )}
          >
            <div
              className="bg-card/95 backdrop-blur-sm border border-border rounded-t-lg px-2 sm:px-4 py-3 shadow-lg cursor-pointer hover:bg-secondary/95 transition-colors"
              onClick={onToggle}
            >
              <div className="w-full">
                <div className="flex items-start gap-2 mb-1 w-full">
                  <ChevronDown className="size-3 mt-0.5 text-primary rotate-180 flex-shrink-0" />
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
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                  <span>({discoveredCount}/{totalCount})</span>
                  <span className="hidden sm:inline text-primary hover:text-primary/80">Click to collapse</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={accordionRef}>
          <AccordionTrigger className="px-2 sm:px-4 py-3 hover:no-underline">
            <div className="w-full">
              <div className="w-full mb-1">
                <h2
                  className="leading-tight font-semibold text-foreground"
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
              <div className="text-xs text-muted-foreground">
                ({discoveredCount}/{totalCount})
              </div>
            </div>
          </AccordionTrigger>
        </div>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {Object.entries(genera).map(([family, speciesList]) => (
              <div key={`${category}-${family}`} ref={setRef(`${category}-${family}`)} className="border border-border rounded-lg bg-card/30">
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value={`${category}-${family}`} className="border-none">
                    <AccordionTrigger className="px-2 sm:px-4 py-3 hover:no-underline hover:bg-secondary/30">
                      <div className="w-full">
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
                        <div className="text-xs text-muted-foreground">
                          ({speciesList.length} species)
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="lg:hidden">
                        <SpeciesCarousel
                          family={family}
                          speciesList={speciesList}
                          discoveredSpecies={discoveredSpecies}
                          category={category}
                          onNavigateToTop={openSpeciesPicker}
                        />
                      </div>
                      <div className="hidden lg:block">
                        <FamilyCardStack
                          family={family}
                          speciesList={speciesList}
                          discoveredSpecies={discoveredSpecies}
                          category={category}
                          onNavigateToTop={openSpeciesPicker}
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

AccordionCategory.displayName = 'AccordionCategory';

function openSpeciesPicker() {
  const gridRef = document.querySelector('[data-radix-scroll-area-viewport]');
  if (gridRef) {
    gridRef.scrollTo({ top: 0, behavior: 'smooth' });
  }
  setTimeout(() => {
    const picker = document.querySelector('[role="combobox"]') as HTMLElement;
    if (picker) picker.click();
  }, 300);
}
