// The four clue orders under the board (plan 044): each clue's gem as the board
// draws it, its question, how many of its gems are collected, and, once full, the
// mystery's answer.
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import { FaceIcon } from './FaceIcon';

export function OrderTiles({ round }: { round: AnimalRound }) {
  const size = round.rules.orderSize;
  return (
    <ul className="m-0 grid shrink-0 list-none grid-cols-2 gap-1 p-0" aria-label="Clue orders">
      {round.orders.map(order => (
        <li
          key={order.tag}
          data-tag={order.tag}
          aria-label={`${order.question} ${order.answer ? `Answer: ${order.answer}.` : `${order.have} of ${size} gems.`}`}
          className={`flex min-h-11 min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 ${order.answer ? 'border-ochre/50 bg-ochre/15' : 'border-white/15 bg-white/[.05]'}`}
        >
          <FaceIcon gem={order.gem} face={clueFace(order.tag)} className="h-8 w-8 text-[15px]" />
          <span className="min-w-0 flex-1" aria-hidden="true">
            <span className="line-clamp-2 text-[12px] leading-tight">{order.short}</span>
            {order.answer ? (
              <b className={`text-[13px] ${order.answer === 'yes' ? 'text-leaf' : 'text-danger'}`}>{order.answer === 'yes' ? 'Yes ✓' : 'No ✗'}</b>
            ) : (
              <span className="mt-0.5 flex items-center gap-1">
                <span className="h-1.5 flex-1 overflow-hidden rounded bg-white/15"><i className="block h-full rounded bg-ochre" style={{ width: `${(100 * order.have) / size}%` }} /></span>
                <span className="text-[10px] tabular-nums text-mist/60">{order.have}/{size}</span>
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
