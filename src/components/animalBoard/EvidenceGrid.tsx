// The evidence grid (plan 044): one table that lines the mystery up with the five
// suspects. A column per clue (its gem as the board draws it, and a short label);
// the Mystery row, where each clue's gems fill its cell until the answer stamps it;
// then a row per suspect with that animal's own answers and its number, the same
// number its board tile wears. Comparing down a column is the player's job: during
// play nothing points at a contradiction. Tap a row to pick that animal. `review`
// (the round-end card) names the mystery and marks each earned answer that rules an
// animal out.
import { useState, type ReactNode } from 'react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { columnLabel } from '@/clueGame/questionMatch';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';
import { FaceIcon } from './FaceIcon';

export function SuspectPhoto({ species, size = 120 }: { species: PoolSpecies | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!species?.photo || failed) return <span className="grid h-full w-full place-items-center text-xl" aria-hidden="true">{species ? speciesBadge(species) : '?'}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- a small remote Commons thumbnail
  return <img src={photoAt(species.photo.url, size)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}

export function EvidenceGrid({ round, speciesById, shown, selected = null, onSelect, onQuestion, corner, review = false }: {
  round: AnimalRound;
  speciesById: Map<number, PoolSpecies>;
  /** Gems each order shows as collected (the grid trails the rules while gems fly); an answer shows once its order looks full. */
  shown: readonly number[];
  selected?: number | null;
  onSelect?: (id: number) => void;
  onQuestion?: (index: number) => void;
  /** The top-left cell, over the animals' names. */
  corner?: ReactNode;
  review?: boolean;
}) {
  const size = round.rules.orderSize;
  const mystery = speciesById.get(round.mysteryId);
  const answered = round.orders.map((order, j) => order.answer !== null && (review || (shown[j] ?? 0) >= size));
  return (
    <table aria-label={review ? 'How the evidence lined up' : 'Evidence'} className="w-full table-fixed border-separate [border-spacing:3px_2px]">
      <colgroup>
        <col />
        {round.orders.map(order => <col key={order.tag} className="w-[54px]" />)}
      </colgroup>
      <thead>
        <tr>
          <td className="p-0 align-bottom">{corner}</td>
          {round.orders.map((order, j) => (
            <th key={order.tag} scope="col" data-tag={order.tag} className="p-0 align-bottom font-normal">
              <button
                type="button"
                disabled={!onQuestion}
                onClick={() => onQuestion?.(j)}
                aria-label={order.question}
                className="flex w-full flex-col items-center gap-0.5 rounded-lg pb-0.5 enabled:active:bg-white/10"
              >
                <FaceIcon gem={order.gem} face={clueFace(order.tag)} className="h-6 w-6 text-[13px]" />
                <span className="line-clamp-2 min-h-[2.2em] text-[12px] leading-[1.1] text-sage" lang="en">{columnLabel(order.tag)}</span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr data-mystery>
          <th scope="row" className="h-[34px] p-0 text-left font-bold text-ochre">
            <span className="flex items-center gap-1.5">
              {review ? (
                <span className="block h-[30px] w-[30px] shrink-0 overflow-hidden rounded-md bg-white/5"><SuspectPhoto species={mystery} /></span>
              ) : (
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-md border-[1.5px] border-dashed border-ochre/80 bg-ochre/10 text-base font-black" aria-hidden="true">?</span>
              )}
              <span className="min-w-0 text-[13px] leading-tight">
                <span className="line-clamp-1">{review ? mystery?.commonName ?? 'Mystery' : 'Mystery'}</span>
                {!review && round.marked.length > 0 && <span className="block text-[12px] font-normal text-sage">{round.marked.length} ruled out</span>}
              </span>
            </span>
          </th>
          {round.orders.map((order, j) => {
            const have = Math.min(shown[j] ?? 0, size);
            return (
              <td
                key={order.tag}
                data-tag={order.tag}
                data-have={order.have}
                data-answer={order.answer ?? ''}
                data-flight-target={review ? undefined : order.tag}
                className={`relative h-[34px] overflow-hidden rounded-md p-0 text-center ${answered[j] ? 'bg-ochre text-night' : 'border-[1.5px] border-dashed border-ochre/70 bg-ochre/[.07] text-ochre'}`}
              >
                {answered[j] ? (
                  <span className={`block text-[13px] font-black ${review ? '' : 'ev-flip'}`}>{order.answer === 'yes' ? '✓ YES' : '✗ NO'}</span>
                ) : (
                  <>
                    {!review && <span className="absolute inset-x-0 bottom-0 bg-ochre/40 transition-[height] duration-200" style={{ height: `${(100 * have) / size}%` }} aria-hidden="true" />}
                    <span className="relative text-[12px] font-bold tabular-nums">{review ? '?' : `${have}/${size}`}</span>
                  </>
                )}
              </td>
            );
          })}
        </tr>
        {round.suspects.map((id, i) => {
          const species = speciesById.get(id);
          const name = species?.commonName ?? 'animal';
          const released = round.released.includes(id) && !review; // the replay keeps every row readable
          const marked = round.marked.includes(id) && !released;
          const picked = selected === id;
          const wasIt = review && id === round.mysteryId;
          return (
            <tr key={id} data-suspect={id} onClick={onSelect ? () => onSelect(id) : undefined} className={`${released ? 'opacity-30' : ''} ${onSelect ? 'cursor-pointer' : ''}`}>
              <th scope="row" className={`h-[34px] rounded-md p-0 text-left font-normal ${picked ? 'bg-globe/20 outline outline-2 outline-globe' : wasIt ? 'outline outline-2 outline-ochre' : ''}`}>
                <button
                  type="button"
                  disabled={!onSelect}
                  aria-pressed={onSelect ? picked : undefined}
                  aria-label={`${i + 1}: ${name}${released ? ', released' : marked ? ', ruled out' : ''}`}
                  className="flex w-full items-center gap-1.5 text-left"
                >
                  <span className={`relative block h-[30px] w-[30px] shrink-0 rounded-md ${marked ? 'outline outline-2 outline-offset-1 outline-danger' : ''}`}>
                    <span className="block h-full w-full overflow-hidden rounded-md bg-white/5"><SuspectPhoto species={species} /></span>
                    <i className="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-mist text-[11px] font-black not-italic leading-none text-night ring-2 ring-night" aria-hidden="true">{i + 1}</i>
                    {marked && <i className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-danger text-[10px] font-black not-italic leading-none text-night" aria-hidden="true">✕</i>}
                  </span>
                  <span className={`line-clamp-2 min-w-0 text-[12px] leading-[1.15] [hyphens:auto] ${released ? 'line-through' : ''}`} lang="en">{name}</span>
                </button>
              </th>
              {round.orders.map((order, j) => {
                const yes = order.row[i];
                const miss = review && order.answer !== null && yes !== (order.answer === 'yes');
                const lit = !review && answered[j];
                const fill = miss ? 'bg-danger/25 shadow-[inset_0_0_0_1.5px_rgb(208_122_110/.8)]' : picked ? 'bg-globe/15' : 'bg-white/[.04]';
                return (
                  // Keyed by the answer showing, so the cell remounts and lights up once when it lands.
                  <td key={`${order.tag}:${lit}`} data-tag={order.tag} data-yes={yes} data-miss={miss || undefined} className={`h-[34px] rounded-md p-0 text-center text-[16px] font-black ${fill} ${lit ? 'ev-lit' : ''}`}>
                    <span aria-hidden="true" className={yes ? 'text-leaf' : 'text-mist/35'}>{yes ? '✓' : '✗'}</span>
                    <span className="sr-only">{yes ? 'yes' : 'no'}</span>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
