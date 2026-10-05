import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { HABITAT_COG_URL, TITILER_BASE_URL, groupLabel, habitatSnapshotUrl, type Place, type PlaceAnimal } from '@/clueGame/places';
import { speciesBadge } from '@/clueGame/speciesInfo';

/** The picked place: who lives there (named once found), its habitats, and the button to play. */
export function PlaceCard({ place, animals, isFound, minAnimals, onBack, onStart }: {
  place: Place;
  animals: PlaceAnimal[];
  isFound: (animal: PlaceAnimal) => boolean;
  /** A continent opens at this many animals. */
  minAnimals: number;
  onBack: () => void;
  onStart: () => void;
}) {
  const found = animals.filter(isFound).length;
  const soon = animals.length < minAnimals;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex items-start gap-1">
        <button type="button" onClick={onBack} className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-sage hover:bg-white/10" aria-label="Back to all places">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 pt-1">
          <h2 className="m-0 font-display text-xl font-bold leading-tight text-mist">{place.name}</h2>
          <p className="m-0 text-xs text-sage">{place.kind === 'continent' ? 'Continent' : groupLabel(place)}</p>
        </div>
      </div>

      <section aria-label="Animals that live here">
        <p className="m-0 mb-1.5 text-sm text-mist/85">
          <b>{animals.length} animals</b> live here. {found > 0 ? `You've found ${found}.` : 'Find them all!'}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {animals.map(animal => isFound(animal) ? (
            <li key={animal.id} className="flex items-center gap-1 rounded-full border border-action bg-action/15 py-0.5 pl-1 pr-2 text-[12px] text-mist">
              <span aria-hidden="true">{speciesBadge(animal)}</span>{animal.commonName}
            </li>
          ) : (
            <li key={animal.id} className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-white/25 text-[12px] font-bold text-mist/50" aria-label="An animal you haven't found yet">?</li>
          ))}
        </ul>
      </section>

      {TITILER_BASE_URL && HABITAT_COG_URL && <HabitatSnapshot key={place.key} place={place} />}

      {soon ? (
        <p className="mt-auto m-0 rounded-xl border border-white/15 p-3 text-center text-sm text-mist/75">Coming soon: a round needs at least {minAnimals} animals from here, and more are on the way.</p>
      ) : (
        <button type="button" onClick={onStart} className="mt-auto flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">
          <Play className="h-4 w-4" aria-hidden="true" /> Explore {place.name}
        </button>
      )}
    </div>
  );
}

/** The habitat-type raster over the place (rendered by TiTiler; takes a few seconds). */
function HabitatSnapshot({ place }: { place: Place }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <figure className="m-0">
      <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-white/10 bg-raised">
        {state === 'loading' && <div className="absolute inset-0 grid place-items-center text-xs text-mist/50">Mapping habitats…</div>}
        {/* eslint-disable-next-line @next/next/no-img-element -- a remote, dynamically sized TiTiler render */}
        <img
          src={habitatSnapshotUrl(place.bbox, TITILER_BASE_URL, HABITAT_COG_URL)}
          alt={`Map of habitat types in ${place.name}`}
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          className={`h-full w-full object-contain transition-opacity duration-500 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      <figcaption className="mt-0.5 text-[10px] text-mist/45">Each color is a habitat type, like forest, grassland, desert, wetland or farmland (IUCN habitat map).</figcaption>
    </figure>
  );
}
