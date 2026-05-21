import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Species } from '@/types/database';
import type { CasesGroupMode } from './types';
import { SpeciesTCGCardMini } from './SpeciesTCGCardMini';

export function CasesTab({
  unknownSpecies,
  groupedUnknownSpecies,
  casesGroupBy,
  onCasesGroupByChange,
  onOpenHero,
}: {
  unknownSpecies: Species[];
  groupedUnknownSpecies: Array<{ label: string; species: Species[] }>;
  casesGroupBy: CasesGroupMode;
  onCasesGroupByChange: (value: CasesGroupMode) => void;
  onOpenHero: (list: Species[], index: number) => void;
}) {
  return (
    <ScrollArea className="h-full px-5">
      <div className="space-y-6 py-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Unsolved Cases</h2>
          {unknownSpecies.length > 0 && (
            <div className="flex rounded-md border border-border bg-background/60 p-0.5">
              {([
                ['biome', 'Biome'],
                ['realm', 'Realm'],
                ['bioregion', 'Region'],
              ] as Array<[CasesGroupMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onCasesGroupByChange(mode)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded transition-colors',
                    casesGroupBy === mode
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
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
                  <h3 className="font-semibold text-foreground">{group.label}</h3>
                  <span className="text-muted-foreground">{group.species.length} cases</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.species.map((sp, i) => (
                    <SpeciesTCGCardMini
                      key={sp.id}
                      species={sp}
                      isDiscovered={false}
                      onClick={() => onOpenHero(group.species, i)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-ds-emerald text-lg mb-2">All species discovered!</p>
            <p className="text-muted-foreground text-sm">You've solved every case</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
