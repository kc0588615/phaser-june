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
      <h2 className="m-0 px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">Continents</h2>
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-0">
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
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-cyan-200 bg-cyan-300/15' : 'border-white/10 bg-white/[.03] active:bg-white/10'} ${soon ? 'opacity-60' : ''}`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{place.name}</span>
                {found > 0 && <span className="shrink-0 rounded-full bg-emerald-300/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">{found} found</span>}
                {soon
                  ? <span className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-white/70">coming soon</span>
                  : <span className="shrink-0 text-[12px] tabular-nums text-white/60">{place.speciesIds.length} animals</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
