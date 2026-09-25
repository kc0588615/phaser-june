import { PLACE_KIND_LABELS, groupPlaces, type Place, type PlaceKind } from '@/clueGame/places';

const KINDS: PlaceKind[] = ['country', 'wildlife_area', 'continent'];

/** Filter chips plus a scrolling list of places, grouped by continent or realm. */
export function PlaceList({ places, kind, onKind, selectedKey, foundIn, onPick }: {
  places: Place[];
  kind: PlaceKind;
  onKind: (kind: PlaceKind) => void;
  selectedKey: string | null;
  /** How many of a place's animals the player has found, by place key. */
  foundIn: (place: Place) => number;
  onPick: (key: string) => void;
}) {
  const groups = groupPlaces(places, kind);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1.5 px-3 pb-2" role="tablist" aria-label="Kind of place">
        {KINDS.map(option => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={kind === option}
            onClick={() => onKind(option)}
            className={`h-11 flex-1 rounded-full border text-[13px] font-semibold transition-colors ${kind === option ? 'border-cyan-200 bg-cyan-300/20 text-cyan-50' : 'border-white/15 text-white/70 active:bg-white/10'}`}
          >
            {PLACE_KIND_LABELS[option]}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {groups.map(group => (
          <section key={group.label} className="mb-2">
            <h3 className="sticky top-0 z-10 m-0 bg-[#06121a]/95 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">{group.label}</h3>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {group.places.map(place => {
                const found = foundIn(place);
                const selected = place.key === selectedKey;
                return (
                  <li key={place.key}>
                    <button
                      type="button"
                      onClick={() => onPick(place.key)}
                      aria-pressed={selected}
                      className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${selected ? 'border-cyan-200 bg-cyan-300/15' : 'border-white/10 bg-white/[.03] active:bg-white/10'}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{place.name}</span>
                      {found > 0 && <span className="shrink-0 rounded-full bg-emerald-300/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">{found} found</span>}
                      <span className="shrink-0 text-[12px] tabular-nums text-white/60">{place.speciesIds.length} animals</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
