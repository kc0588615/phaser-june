// Where the animal lives: its IUCN range on a small world map.
import { useEffect, useState } from 'react';
import { WORLD_LAND_URL, WORLD_VIEWBOX, type SpeciesRange } from '@/clueGame/rangeMap';

/** Ranges smaller than this get a ring so they show up on a world map. */
const SMALL_RANGE_KM2 = 200_000;
const ranges = new Map<number, Promise<SpeciesRange | null>>();

function loadRange(speciesId: number): Promise<SpeciesRange | null> {
  let pending = ranges.get(speciesId);
  if (!pending) {
    pending = fetch(`/api/clue-game/range/?species=${speciesId}`)
      .then(response => (response.ok ? response.json() as Promise<SpeciesRange> : null))
      .catch(error => {
        console.error('[ClueMatch] Failed to load a range map:', error);
        ranges.delete(speciesId); // let a later view retry
        return null;
      });
    ranges.set(speciesId, pending);
  }
  return pending;
}

const area = new Intl.NumberFormat('en', { maximumSignificantDigits: 2 });

export function RangeMap({ speciesId, name, caption = true }: { speciesId: number; name: string; caption?: boolean }) {
  // undefined while loading; null when there's no map for this species.
  const [range, setRange] = useState<SpeciesRange | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    setRange(undefined);
    loadRange(speciesId).then(loaded => { if (current) setRange(loaded); });
    return () => { current = false; };
  }, [speciesId]);

  if (range === null) return null;
  const { x, y, width, height } = WORLD_VIEWBOX;
  return (
    <figure className="m-0">
      <svg
        viewBox={`${x} ${y} ${width} ${height}`}
        className="block w-full rounded-lg border border-white/10 bg-[#0b2530]"
        role="img"
        aria-label={range ? `Map of where the ${name} lives` : 'Loading map'}
      >
        <image href={WORLD_LAND_URL} x={x} y={y} width={width} height={height} />
        {range && (
          <>
            <path d={range.path} fill="#fcd34d" fillOpacity={0.9} stroke="#fde68a" strokeWidth={0.4} strokeLinejoin="round" />
            {range.areaKm2 < SMALL_RANGE_KM2 && (
              <>
                <circle cx={range.lon} cy={-range.lat} r={2} fill="#fcd34d" />
                <circle cx={range.lon} cy={-range.lat} r={7} fill="none" stroke="#fcd34d" strokeWidth={2} className="cm-range-ping" />
              </>
            )}
          </>
        )}
      </svg>
      {range && caption && (
        <figcaption className="mt-0.5 flex justify-between text-[10px] text-white/45">
          <span>Range about {area.format(range.areaKm2)} km²</span>
          <span>Map: IUCN Red List</span>
        </figcaption>
      )}
    </figure>
  );
}
