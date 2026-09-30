// The round's animals as photo tiles, four across (smaller photos past 8, so 12 fit
// on a phone). Tap one to read its field guide (and guess).
import { useState } from 'react';
import type { PoolSpecies } from '@/clueGame/pool';
import type { RoundState } from '@/clueGame/questionMatch';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';

function TilePhoto({ species }: { species: PoolSpecies }) {
  const [failed, setFailed] = useState(false);
  if (!species.photo || failed) return <span className="grid h-full w-full place-items-center text-2xl" aria-hidden="true">{speciesBadge(species)}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- a small remote Commons thumbnail
  return <img src={photoAt(species.photo.url, 120)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}

export function AnimalTiles({ round, speciesById, onPick }: {
  round: RoundState;
  speciesById: Map<number, PoolSpecies>;
  onPick: (id: number) => void;
}) {
  const photo = round.candidateIds.length > 8 ? 'h-11 short:h-8' : 'h-16 short:h-10';
  return (
    <ul className="m-0 grid shrink-0 list-none grid-cols-4 gap-1.5 p-0" aria-label="Possible animals">
      {round.candidateIds.map(id => {
        const species = speciesById.get(id);
        if (!species) return null;
        const out = Boolean(round.out[id]);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              aria-label={`${species.commonName}${out ? ', crossed out' : ''}`}
              className={`flex w-full flex-col overflow-hidden rounded-xl border text-left transition-opacity active:scale-[.97] ${out ? 'border-white/5 opacity-30' : 'border-white/15 bg-white/[.04]'}`}
            >
              <span className={`block w-full overflow-hidden bg-white/5 ${photo}`}><TilePhoto species={species} /></span>
              <span className={`line-clamp-2 min-h-[2.3em] px-1 py-0.5 text-[11px] leading-tight [hyphens:auto] ${out ? 'line-through' : ''}`} lang="en">{species.commonName}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
