import { ArrowLeft, Play } from 'lucide-react';
import { groupLabel, type Place, type PlaceAnimal } from '@/clueGame/places';
import { speciesBadge } from '@/clueGame/speciesInfo';

/** The picked place: who lives there (named once found) and the button to play. */
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
        <div className="min-w-0 flex-1 pt-xxs">
          <h2 className="m-0 font-brand text-l font-heavy text-neutral-10">{place.name}</h2>
          <p className="m-0 text-xs text-neutral-7">{place.kind === 'continent' ? 'Continent' : groupLabel(place)}</p>
        </div>
        {/* Phones: play sits by the name, above the fold; wider screens keep it at the bottom. */}
        {!soon && (
          <button type="button" onClick={onStart} className="btn btn-primary shrink-0 md:hidden">
            <Play className="h-4 w-4" aria-hidden="true" /> Explore
          </button>
        )}
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

      {soon ? (
        <p className="mt-auto m-0 rounded-s bg-neutral-2 p-s text-center text-s text-neutral-7">Coming soon: a round needs at least {minAnimals} animals from here, and more are on the way.</p>
      ) : (
        <button type="button" onClick={onStart} className="btn btn-primary mt-auto hidden w-full shrink-0 md:inline-flex">
          <Play className="h-4 w-4" aria-hidden="true" /> Explore {place.name}
        </button>
      )}
    </div>
  );
}

