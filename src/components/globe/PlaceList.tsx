import type { Place } from '@/clueGame/places';

/** The continents to explore, most animals first. A continent with too few animals yet shows "coming soon". */
export function PlaceList({ places, minAnimals, selectedKey, foundIn, onPick }: {
  /** Continents only. */
  places: Place[];
  /** A continent opens at this many animals. */
  minAnimals: number;
  selectedKey: string | null;
  /** How many of a place's animals the player has found. */
  foundIn: (place: Place) => number;
  onPick: (key: string) => void;
}) {
  const sorted = [...places].sort((a, b) => b.speciesIds.length - a.speciesIds.length || a.name.localeCompare(b.name));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="m-0 px-s pb-xxs text-xs font-medium uppercase text-neutral-7">Continents</h2>
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-xxs overflow-y-auto overscroll-contain px-s pb-[max(var(--space-s),env(safe-area-inset-bottom))] pt-0">
        {sorted.map(place => {
          const found = foundIn(place);
          const selected = place.key === selectedKey;
          const soon = place.speciesIds.length < minAnimals;
          return (
            <li key={place.key}>
              <button
                type="button"
                onClick={() => onPick(place.key)}
                aria-pressed={selected}
                className={`flex min-h-12 w-full items-center gap-xs rounded-s px-s py-xs text-left transition-colors ${selected ? 'bg-neutral-3' : 'bg-neutral-2 hover:bg-neutral-3'}`}
              >
                <span className={`min-w-0 flex-1 truncate text-s font-medium ${soon ? 'text-neutral-6' : 'text-neutral-10'}`}>{place.name}</span>
                {found > 0 && <span className="shrink-0 rounded-full bg-option-badge px-xs py-xxs text-xs font-medium text-on-option-badge">{found} found</span>}
                {soon
                  ? <span className="shrink-0 rounded-full bg-neutral-3 px-xs py-xxs text-xs text-neutral-7">coming soon</span>
                  : <span className="shrink-0 font-data text-xs tabular-nums text-neutral-7">{place.speciesIds.length} animals</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
