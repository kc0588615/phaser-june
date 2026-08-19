import type { MutableRefObject } from 'react';
import { GitBranch, LockKeyhole } from 'lucide-react';
import FamilyCardStack from '@/components/FamilyCardStack';
import SpeciesCard from '@/components/SpeciesCard';
import SpeciesCarousel from '@/components/SpeciesCarousel';
import { SpeciesSearchInput } from '@/components/SpeciesSearchInput';
import { TaxonomyLineageHeader } from '@/components/species-list/TaxonomyLineageHeader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFamilyDisplayName } from '@/config/familyCommonNames';
import type { Species } from '@/types/database';
import type { JumpTarget, TaxonomyHierarchy } from '@/types/speciesBrowser';
import { normalizeTaxonName } from '@/utils/ecoregion';

type SpeciesFilter = { type: string; value: string } | null;

interface TaxonomyTabProps {
  searchableSpecies: Species[];
  filteredSpecies: Species[];
  discoveredCount: number;
  unknownSpeciesCount: number;
  taxonomyHierarchy: TaxonomyHierarchy;
  ecoregionList: string[];
  realmList: string[];
  biomeList: string[];
  selectedFilter: SpeciesFilter;
  openAccordions: string[];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  gridRef: MutableRefObject<HTMLDivElement | null>;
  onJump: (target: JumpTarget) => void;
  onClearFilter: () => void;
  onOpenAccordionsChange: (value: string[]) => void;
}

export function TaxonomyTab({
  searchableSpecies,
  filteredSpecies,
  discoveredCount,
  unknownSpeciesCount,
  taxonomyHierarchy,
  ecoregionList,
  realmList,
  biomeList,
  selectedFilter,
  openAccordions,
  discoveredSpecies,
  gridRef,
  onJump,
  onClearFilter,
  onOpenAccordionsChange,
}: TaxonomyTabProps) {
  const selectedSpecies = selectedFilter?.type === 'species' && filteredSpecies.length === 1
    ? filteredSpecies[0]
    : null;
  const revealOrders = selectedFilter?.type === 'order'
    || selectedFilter?.type === 'family'
    || selectedFilter?.type === 'genus';
  const revealFamilies = selectedFilter?.type === 'family' || selectedFilter?.type === 'genus';

  return (
    <div className="mt-0 flex flex-1 flex-col overflow-hidden">
      <div className="flex-shrink-0 px-5 pb-2">
        <SpeciesSearchInput
          ecoregionList={ecoregionList}
          realmList={realmList}
          biomeList={biomeList}
          species={searchableSpecies}
          selectedFilter={selectedFilter}
          onJump={onJump}
          onClearFilter={onClearFilter}
        />
        {selectedFilter && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Showing {filteredSpecies.length} discovered species
          </p>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <ScrollArea className="h-full px-5" ref={gridRef}>
          {selectedSpecies ? (
            <SelectedSpeciesView
              species={selectedSpecies}
              discoveredSpecies={discoveredSpecies}
              onNavigateToTop={() => scrollTaxonomyToTop(gridRef)}
            />
          ) : (
            <div className="flex flex-col gap-6 pb-24">
              <TaxonomyProgress knownCount={discoveredCount} lockedCount={unknownSpeciesCount} />

              <div className="flex flex-col gap-7">
                {sortedEntries(taxonomyHierarchy).map(([className, orders]) => (
                  <ClassSection
                    key={`${className}:${selectedFilter?.type || 'all'}:${selectedFilter?.value || ''}`}
                    className={className}
                    orders={orders}
                    openAccordions={openAccordions}
                    onOpenAccordionsChange={onOpenAccordionsChange}
                    discoveredSpecies={discoveredSpecies}
                    revealOrders={revealOrders}
                    revealFamilies={revealFamilies}
                  />
                ))}
              </div>

              {Object.keys(taxonomyHierarchy).length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
                  <GitBranch className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No discovered branches here yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Complete an expedition to add a species to your taxonomy tree.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function SelectedSpeciesView({
  species,
  discoveredSpecies,
  onNavigateToTop,
}: {
  species: Species;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  onNavigateToTop: () => void;
}) {
  const className = normalizeTaxonName(species.class);
  const order = normalizeTaxonName(species.taxon_order);
  const family = normalizeTaxonName(species.family);
  const genus = normalizeTaxonName(species.genus);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 py-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <TaxonomyLineageHeader
          className={className}
          order={order}
          family={family}
          genus={genus}
          speciesCount={1}
        />
      </div>
      <SpeciesCard
        species={species}
        category={order}
        isDiscovered={Boolean(discoveredSpecies[species.id])}
        discoveredAt={discoveredSpecies[species.id]?.discoveredAt}
        onNavigateToTop={onNavigateToTop}
      />
    </div>
  );
}

function TaxonomyProgress({ knownCount, lockedCount }: { knownCount: number; lockedCount: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl border border-border bg-card/50 px-4 py-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitBranch className="size-4 text-primary" aria-hidden="true" />
          Your discovered taxonomy
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Branches and names unlock through successful expeditions.</p>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-primary">{knownCount}</div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <LockKeyhole className="size-3" aria-hidden="true" />
          {lockedCount} locked
        </div>
      </div>
    </div>
  );
}

function ClassSection({
  className,
  orders,
  openAccordions,
  onOpenAccordionsChange,
  discoveredSpecies,
  revealOrders,
  revealFamilies,
}: {
  className: string;
  orders: TaxonomyHierarchy[string];
  openAccordions: string[];
  onOpenAccordionsChange: (value: string[]) => void;
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  revealOrders: boolean;
  revealFamilies: boolean;
}) {
  const speciesCount = countSpecies(orders);
  const visibleOrderValues = sortedEntries(orders).map(([order]) => `${className}:${order}`);
  const accordionValues = revealOrders
    ? [...new Set([...openAccordions, ...visibleOrderValues])]
    : openAccordions;

  return (
    <section aria-labelledby={`class-${slugify(className)}`} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 border-b border-primary/25 pb-2">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary">Taxonomic class</div>
          <h2 id={`class-${slugify(className)}`} className="mt-0.5 font-serif text-2xl text-foreground">{formatTaxon(className)}</h2>
        </div>
        <Badge variant="secondary">{speciesCount} species</Badge>
      </div>

      <Accordion
        type="multiple"
        className="flex w-full flex-col gap-3"
        value={accordionValues}
        onValueChange={onOpenAccordionsChange}
      >
        {sortedEntries(orders).map(([order, families]) => {
          const orderValue = `${className}:${order}`;
          return (
            <AccordionItem key={orderValue} value={orderValue} className="overflow-hidden rounded-xl border border-border bg-card/70">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Taxonomic order</div>
                  <h3 className="mt-0.5 truncate font-serif text-lg text-foreground">{formatTaxon(order)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{countSpecies(families)} discovered species</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3 sm:px-4 sm:pb-4">
                <FamilyGroups
                  className={className}
                  order={order}
                  families={families}
                  discoveredSpecies={discoveredSpecies}
                  revealFamilies={revealFamilies}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}

function FamilyGroups({
  className,
  order,
  families,
  discoveredSpecies,
  revealFamilies,
}: {
  className: string;
  order: string;
  families: TaxonomyHierarchy[string][string];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
  revealFamilies: boolean;
}) {
  return (
    <Accordion
      type="multiple"
      className="flex w-full flex-col gap-3"
      defaultValue={revealFamilies ? Object.keys(families) : undefined}
    >
      {sortedEntries(families).map(([family, genera]) => {
        const speciesCount = countSpecies(genera);
        const genusCount = Object.keys(genera).length;
        return (
          <AccordionItem key={family} value={family} className="overflow-hidden rounded-lg border border-border bg-background/35">
            <AccordionTrigger className="px-3 py-3 hover:no-underline sm:px-4">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">Taxonomic family</div>
                <h4 className="mt-0.5 break-words font-serif text-base text-foreground">{getFamilyDisplayName(family)}</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {genusCount} {genusCount === 1 ? 'genus' : 'genera'} · {speciesCount} species
                </p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-3 sm:px-3">
              <div className="flex flex-col gap-4">
                {sortedEntries(genera).map(([genus, speciesList]) => (
                  <GenusCardBrowser
                    key={`${family}:${genus}`}
                    className={className}
                    order={order}
                    family={family}
                    genus={genus}
                    speciesList={speciesList}
                    discoveredSpecies={discoveredSpecies}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function GenusCardBrowser({
  className,
  order,
  family,
  genus,
  speciesList,
  discoveredSpecies,
}: {
  className: string;
  order: string;
  family: string;
  genus: string;
  speciesList: Species[];
  discoveredSpecies: Record<number, { name: string; discoveredAt: string }>;
}) {
  return (
    <div>
      <div className="lg:hidden">
        <SpeciesCarousel
          className={className}
          order={order}
          family={family}
          genus={genus}
          speciesList={speciesList}
          discoveredSpecies={discoveredSpecies}
          onNavigateToTop={openSpeciesPicker}
        />
      </div>
      <div className="hidden lg:block">
        <FamilyCardStack
          className={className}
          order={order}
          family={family}
          genus={genus}
          speciesList={speciesList}
          discoveredSpecies={discoveredSpecies}
          onNavigateToTop={openSpeciesPicker}
        />
      </div>
    </div>
  );
}

function countSpecies(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return 0;
  return Object.values(value).reduce((total, child) => total + countSpecies(child), 0);
}

function formatTaxon(value: string): string {
  if (!value || value === 'Unknown') return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function sortedEntries<T>(value: Record<string, T>): [string, T][] {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}

function scrollTaxonomyToTop(gridRef: MutableRefObject<HTMLDivElement | null>) {
  const viewport = gridRef.current?.querySelector('[data-radix-scroll-area-viewport]');
  viewport?.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSpeciesPicker() {
  const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
  viewport?.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => {
    const picker = document.querySelector('[role="combobox"]') as HTMLElement | null;
    picker?.click();
  }, 300);
}
