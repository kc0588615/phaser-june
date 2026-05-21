import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Species } from '@/types/database';
import type { AlbumSortMode, SpeciesCardSummary } from './types';
import { SpeciesTCGCardMini } from './SpeciesTCGCardMini';

export function AlbumTab({
  knownSpecies,
  recentKnownSpecies,
  sortedKnownSpecies,
  cardProgress,
  albumSearch,
  albumSort,
  onAlbumSearchChange,
  onAlbumSortChange,
  onOpenHero,
}: {
  knownSpecies: Species[];
  recentKnownSpecies: Species[];
  sortedKnownSpecies: Species[];
  cardProgress: Record<number, SpeciesCardSummary>;
  albumSearch: string;
  albumSort: AlbumSortMode;
  onAlbumSearchChange: (value: string) => void;
  onAlbumSortChange: (value: AlbumSortMode) => void;
  onOpenHero: (list: Species[], index: number) => void;
}) {
  return (
    <ScrollArea className="h-full px-5">
      <div className="space-y-6 py-4 pb-24">
        {knownSpecies.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={albumSearch}
              onChange={(event) => onAlbumSearchChange(event.target.value)}
              placeholder="Search collection"
              className="w-full rounded-md border border-border bg-background/70 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
        )}

        {recentKnownSpecies.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Recent Discoveries</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentKnownSpecies.slice(0, 8).map((sp, i) => (
                <SpeciesTCGCardMini
                  key={sp.id}
                  species={sp}
                  isDiscovered
                  card={cardProgress[sp.id]}
                  onClick={() => onOpenHero(recentKnownSpecies, i)}
                />
              ))}
            </div>
          </div>
        )}

        {knownSpecies.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold text-foreground">Collection</h2>
              <div className="flex rounded-md border border-border bg-background/60 p-0.5">
                {([
                  ['recent', 'Recent'],
                  ['completion', 'Complete'],
                  ['rarity', 'Rarity'],
                  ['best', 'Best'],
                ] as Array<[AlbumSortMode, string]>).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onAlbumSortChange(mode)}
                    className={cn(
                      'px-2 py-1 text-[10px] rounded transition-colors',
                      albumSort === mode
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
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
                    onClick={() => onOpenHero(sortedKnownSpecies, i)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-sm">No cards match your search</p>
              </div>
            )}
          </div>
        )}

        {knownSpecies.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">?</div>
            <p className="text-muted-foreground text-lg mb-2">No discoveries yet</p>
            <p className="text-muted-foreground/70 text-sm">Start an expedition to discover species</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
