// The five suspects above the board (plan 044): photo, name, and that animal's own
// answer to each clue (a chip per order: its picture with ✓ or ✗). Comparing them
// with the mystery's answers is the player's job. Ruled-out cards wear a red stamp;
// released ones fade. Tap a card for its field guide, where Rule out lives. The
// Mystery card leads the row: its chips stay ? until each order's answer comes in.
import { useState } from 'react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';

export function SuspectPhoto({ species, size = 120 }: { species: PoolSpecies | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!species?.photo || failed) return <span className="grid h-full w-full place-items-center text-xl" aria-hidden="true">{species ? speciesBadge(species) : '?'}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- a small remote Commons thumbnail
  return <img src={photoAt(species.photo.url, size)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}

export function SuspectRow({ round, speciesById, onPick }: {
  round: AnimalRound;
  speciesById: Map<number, PoolSpecies>;
  onPick: (id: number) => void;
}) {
  return (
    <ul className="m-0 grid shrink-0 list-none grid-cols-6 gap-1 p-0 [grid-area:suspects] md:px-3" aria-label="Suspects">
      <li data-mystery aria-label={`Mystery animal. ${round.orders.map(o => `${o.short} ${o.answer ?? 'unknown'}`).join('. ')}.`}>
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-dashed border-ochre/70 bg-ochre/10">
          <span className="grid h-14 w-full place-items-center bg-ochre/15 text-2xl font-black text-ochre short:h-10" aria-hidden="true">?</span>
          <span className="line-clamp-2 min-h-[2.3em] px-1 pt-0.5 text-[10px] font-bold leading-tight text-ochre" aria-hidden="true">Mystery</span>
          <span className="grid grid-cols-2 gap-x-0.5 px-0.5 pb-0.5 text-[10px] leading-tight" aria-hidden="true">
            {round.orders.map(order => (
              <span key={order.tag} className={order.answer === 'yes' ? 'text-leaf' : order.answer === 'no' ? 'text-mist/45' : 'text-ochre/70'}>
                {clueFace(order.tag)}{order.answer === 'yes' ? '✓' : order.answer === 'no' ? '✗' : '?'}
              </span>
            ))}
          </span>
        </div>
      </li>
      {round.suspects.map((id, i) => {
        const species = speciesById.get(id);
        const released = round.released.includes(id);
        const marked = round.marked.includes(id) && !released;
        const name = species?.commonName ?? 'animal';
        return (
          <li key={id} data-suspect={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              aria-label={`${name}${released ? ', released' : marked ? ', ruled out' : ''}. Open its field guide`}
              className={`flex w-full flex-col overflow-hidden rounded-xl border text-left transition-opacity active:scale-[.97] ${released ? 'border-white/5 opacity-30' : marked ? 'border-danger/70 bg-danger/10' : 'border-white/15 bg-white/[.04]'}`}
            >
              <span className="relative block h-14 w-full overflow-hidden bg-white/5 short:h-10">
                <SuspectPhoto species={species} />
                {marked && <span className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-danger text-[11px] font-black text-night" aria-hidden="true">✕</span>}
              </span>
              <span className={`line-clamp-2 min-h-[2.3em] px-1 pt-0.5 text-[10px] leading-tight [hyphens:auto] ${released ? 'line-through' : ''}`} lang="en">{name}</span>
              <span className="grid grid-cols-2 gap-x-0.5 px-0.5 pb-0.5 text-[10px] leading-tight" aria-hidden="true">
                {round.orders.map(order => (
                  <span key={order.tag} className={order.row[i] ? 'text-leaf' : 'text-mist/45'}>{clueFace(order.tag)}{order.row[i] ? '✓' : '✗'}</span>
                ))}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
