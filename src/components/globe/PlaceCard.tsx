import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { HABITAT_COG_URL, TITILER_BASE_URL, groupLabel, habitatSnapshotUrl, type Place, type PlaceAnimal } from '@/clueGame/places';
import { speciesBadge } from '@/clueGame/speciesInfo';
import { LARGE } from '@/lib/motion';

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
    <div className="flex min-h-0 flex-1 flex-col gap-s overflow-y-auto overscroll-contain px-s pb-[max(var(--space-s),env(safe-area-inset-bottom))]">
      <div className="flex items-start gap-xxs">
        <button type="button" onClick={onBack} className="btn btn-ghost btn-icon -ml-xs shrink-0" aria-label="Back to all places">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 pt-xxs">
          <h2 className="m-0 font-brand text-l font-heavy text-neutral-10">{place.name}</h2>
          <p className="m-0 text-xs text-neutral-7">{place.kind === 'continent' ? 'Continent' : groupLabel(place)}</p>
        </div>
      </div>

      <section aria-label="Animals that live here">
        <p className="m-0 mb-xs text-s text-neutral-8">
          <b className="font-medium text-neutral-10">{animals.length} animals</b> live here. {found > 0 ? `You've found ${found}.` : 'Find them all!'}
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-xxs p-0">
          {animals.map(animal => isFound(animal) ? (
            <li key={animal.id} className="flex items-center gap-xxs rounded-full bg-option-badge py-xxs pl-xxs pr-xs text-xs font-medium text-on-option-badge">
              <span aria-hidden="true">{speciesBadge(animal)}</span>{animal.commonName}
            </li>
          ) : (
            <li key={animal.id} className="grid h-7 w-7 place-items-center rounded-full bg-neutral-3 text-xs font-medium text-neutral-6" aria-label="An animal you haven't found yet">?</li>
          ))}
        </ul>
      </section>

      {TITILER_BASE_URL && HABITAT_COG_URL && <HabitatSnapshot key={place.key} place={place} />}

      {soon ? (
        <p className="mt-auto m-0 rounded-s bg-neutral-2 p-s text-center text-s text-neutral-7">Coming soon: a round needs at least {minAnimals} animals from here, and more are on the way.</p>
      ) : (
        <button type="button" onClick={onStart} className="btn btn-primary mt-auto w-full shrink-0">
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
      <div className="relative aspect-[2/1] overflow-hidden rounded-xs bg-neutral-3">
        {state === 'loading' && <div className="absolute inset-0 grid place-items-center text-xs text-neutral-7">Mapping habitats…</div>}
        <motion.img
          src={habitatSnapshotUrl(place.bbox, TITILER_BASE_URL, HABITAT_COG_URL)}
          alt={`Map of habitat types in ${place.name}`}
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          className="h-full w-full object-contain"
          initial={false}
          animate={{ opacity: state === 'ready' ? 1 : 0 }}
          transition={LARGE}
        />
      </div>
      <figcaption className="mt-xxs text-xxs text-neutral-7">Each color is a habitat type, like forest, grassland, desert, wetland or farmland (IUCN habitat map).</figcaption>
    </figure>
  );
}
