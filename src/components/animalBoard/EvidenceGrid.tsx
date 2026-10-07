// The evidence grid (plan 044): one table that lines the mystery up with the five
// suspects. A column per clue (its gem as the board draws it, and a short label);
// the Mystery row, where each clue's gems fill its cell until the answer stamps it;
// then a row per suspect with that animal's own answers and its number, the same
// number its board tile wears. Comparing down a column is the player's job: during
// play nothing points at a contradiction. Tap a row to pick that animal. `review`
// (the round-end card) names the mystery and marks each earned answer that rules an
// animal out.
import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { columnLabel } from '@/clueGame/questionMatch';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';
import { LARGE, SMALL } from '@/lib/motion';
import { FaceIcon } from './FaceIcon';

export function SuspectPhoto({ species, size = 120 }: { species: PoolSpecies | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!species?.photo || failed) return <span className="grid h-full w-full place-items-center text-m" aria-hidden="true">{species ? speciesBadge(species) : '?'}</span>;
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
            <th key={order.tag} scope="col" data-tag={order.tag} className="p-0 align-bottom font-regular">
              <button
                type="button"
                disabled={!onQuestion}
                onClick={() => onQuestion?.(j)}
                aria-label={order.question}
                className="flex w-full flex-col items-center gap-xxs rounded-xs pb-xxs transition-colors enabled:hover:bg-neutral-3-transparent enabled:active:bg-neutral-3 short:gap-zero short:pb-zero"
              >
                <FaceIcon gem={order.gem} face={clueFace(order.tag)} className="h-6 w-6 text-[13px]" />
                <span className="line-clamp-2 min-h-[calc(2*var(--line-xs))] text-xs text-neutral-7 short:min-h-[calc(2*var(--line-xxs))] short:text-xxs" lang="en">{columnLabel(order.tag)}</span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr data-mystery>
          <th scope="row" className="h-[34px] p-0 text-left font-medium text-neutral-10">
            <span className="flex items-center gap-xs">
              {review ? (
                <span className="block h-[30px] w-[30px] shrink-0 overflow-hidden rounded-xs bg-neutral-3"><SuspectPhoto species={mystery} /></span>
              ) : (
                <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-xs bg-emphasis-icon text-m font-heavy text-on-emphasis-icon" aria-hidden="true">?</span>
              )}
              <span className="min-w-0 text-s">
                <span className="line-clamp-1">{review ? mystery?.commonName ?? 'Mystery' : 'Mystery'}</span>
                {!review && round.marked.length > 0 && <span className="block text-xs font-regular text-neutral-7">{round.marked.length} ruled out</span>}
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
                className={`relative h-[34px] overflow-hidden rounded-xs p-0 text-center ${answered[j] ? 'bg-emphasis-icon text-on-emphasis-icon' : 'bg-neutral-4 text-neutral-10'}`}
              >
                {answered[j] ? (
                  <motion.span className="block text-s font-heavy" initial={review ? false : { rotateX: 90, scale: 1.3 }} animate={{ rotateX: 0, scale: 1 }} transition={LARGE}>{order.answer === 'yes' ? '✓ YES' : '✗ NO'}</motion.span>
                ) : (
                  <>
                    {!review && <motion.span className="absolute bottom-0 left-0 h-1 bg-color-3" initial={false} animate={{ width: `${(100 * have) / size}%` }} transition={SMALL} aria-hidden="true" />}
                    <span className="relative font-data text-xs font-medium tabular-nums">{review ? '?' : `${have}/${size}`}</span>
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
              <th scope="row" className={`h-[34px] rounded-xs p-0 text-left font-regular ${picked ? 'bg-color-1-transparent outline outline-2 outline-color-1' : wasIt ? 'bg-color-3-transparent outline outline-2 outline-color-3' : ''}`}>
                <button
                  type="button"
                  disabled={!onSelect}
                  aria-pressed={onSelect ? picked : undefined}
                  aria-label={`${i + 1}: ${name}${released ? ', released' : marked ? ', ruled out' : ''}`}
                  className="flex w-full items-center gap-xs text-left"
                >
                  <span className={`relative block h-[30px] w-[30px] shrink-0 rounded-xs ${marked ? 'outline outline-2 outline-offset-1 outline-error' : ''}`}>
                    <span className="block h-full w-full overflow-hidden rounded-xs bg-neutral-3"><SuspectPhoto species={species} /></span>
                    <i className="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-neutral-10 font-data text-xxs font-heavy not-italic leading-none text-neutral-1 ring-2 ring-neutral-1" aria-hidden="true">{i + 1}</i>
                    {marked && <i className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-error text-xxs font-heavy not-italic leading-none text-neutral-1" aria-hidden="true">✕</i>}
                  </span>
                  <span className={`line-clamp-2 min-w-0 text-xs [hyphens:auto] ${released ? 'line-through' : ''}`} lang="en">{name}</span>
                </button>
              </th>
              {round.orders.map((order, j) => {
                const yes = order.row[i];
                const miss = review && order.answer !== null && yes !== (order.answer === 'yes');
                const lit = !review && answered[j];
                const fill = miss ? 'bg-error-transparent shadow-[inset_0_0_0_1.5px_var(--error)]' : picked ? 'bg-color-1-transparent' : 'bg-neutral-3';
                return (
                  // Keyed by the answer showing, so the cell remounts and lights up once when it lands.
                  <td key={`${order.tag}:${lit}`} data-tag={order.tag} data-yes={yes} data-miss={miss || undefined} className={`h-[34px] rounded-xs p-0 text-center text-m font-heavy ${fill} ${lit ? 'ev-lit' : ''}`}>
                    <span aria-hidden="true" className={yes ? 'text-color-1' : 'text-neutral-6'}>{yes ? '✓' : '✗'}</span>
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
