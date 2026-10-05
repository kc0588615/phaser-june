// Where the animal lives: its IUCN range on a small world map.
import { useEffect, useState } from 'react';
import { WORLD_LAND_URL, WORLD_VIEWBOX, type SpeciesRange } from '@/clueGame/worldMap';
import { getJson } from '@/lib/getJson';

/** Ranges smaller than this get a ring so they show up on a world map. */
const SMALL_RANGE_KM2 = 200_000;

const area = new Intl.NumberFormat('en', { maximumSignificantDigits: 2 });

export function RangeMap({ speciesId, name, caption = true }: { speciesId: number; name: string; caption?: boolean }) {
  // undefined while loading; null when there's no map for this species.
  const [range, setRange] = useState<SpeciesRange | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    setRange(undefined);
    getJson<SpeciesRange>(`/api/clue-game/range/?species=${speciesId}`)
      .catch(error => {
        console.error('[ClueMatch] No range map:', error);
        return null;
      })
      .then(loaded => { if (current) setRange(loaded); });
    return () => { current = false; };
  }, [speciesId]);

  if (range === null) return null;
  const { x, y, width, height } = WORLD_VIEWBOX;
  return (
    <figure className="m-0">
      <svg
        viewBox={`${x} ${y} ${width} ${height}`}
        className="block w-full rounded-lg border border-white/10 bg-raised"
        role="img"
        aria-label={range ? `Map of where the ${name} lives` : 'Loading map'}
      >
        <image href={WORLD_LAND_URL} x={x} y={y} width={width} height={height} />
        {range && (
          <>
            <path d={range.path} fill="#6fa8bc" fillOpacity={0.9} stroke="#a9cfdc" strokeWidth={0.4} strokeLinejoin="round" />
            {range.areaKm2 < SMALL_RANGE_KM2 && (
              <>
                <circle cx={range.lon} cy={-range.lat} r={2} fill="#6fa8bc" />
                <circle cx={range.lon} cy={-range.lat} r={7} fill="none" stroke="#6fa8bc" strokeWidth={2} className="cm-range-ping" />
              </>
            )}
          </>
        )}
      </svg>
      {range && caption && (
        <figcaption className="mt-0.5 flex justify-between text-[10px] text-mist/45">
          <span>Range about {area.format(range.areaKm2)} km²</span>
          <span>Map: IUCN Red List</span>
        </figcaption>
      )}
    </figure>
  );
}
