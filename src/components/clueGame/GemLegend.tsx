import type { LegendView } from '@/clueGame/selectors';
import { GemIcon } from './GemIcon';

/** One tile per gem color: what it reveals, how many clues it gave this round, and whether it can still help. */
export function GemLegend({ legend }: { legend: LegendView[] }) {
  return (
    <section aria-label="Gem colors and clue types" className="shrink-0">
      <ul className="m-0 grid list-none grid-cols-8 gap-1 p-0">
        {legend.map(tile => (
          <li
            key={tile.gem}
            title={`${tile.label}: ${tile.question}${tile.useful ? ' Can still narrow it down.' : ''}${tile.deduces ? '' : ' Fun notes to learn from.'}`}
            aria-label={`${tile.label}: ${tile.revealed} clue${tile.revealed === 1 ? '' : 's'} so far${tile.useful ? ', can still narrow it down' : ''}${tile.exhausted ? ', no more clues' : ''}`}
            className={`relative flex flex-col items-center rounded-lg border pb-0.5 pt-1 transition-all ${
              tile.useful ? 'border-cyan-200/60 bg-cyan-300/10 shadow-[0_0_10px_rgba(103,232,249,.25)]'
                : tile.deduces ? 'border-white/10 bg-white/[.03]'
                : 'border-dashed border-white/15 bg-transparent'
            } ${tile.exhausted ? 'opacity-35' : ''}`}
          >
            <GemIcon gem={tile.gem} className="h-7 w-7" />
            <span className="mt-0.5 w-full truncate text-center text-[9px] font-semibold leading-tight tracking-tight text-white/80">{tile.shortLabel}</span>
            {tile.revealed > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-slate-900 px-1 text-[9px] font-bold tabular-nums text-white ring-1 ring-white/30">
                {tile.revealed}
              </span>
            )}
            {tile.useful && <span className="absolute -left-0.5 -top-1 text-[10px] leading-none text-cyan-200" aria-hidden="true">★</span>}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-1 text-center text-[10px] text-white/45 short:hidden">Match a color to get its clue · ★ can still narrow it down · dashed = fun notes</p>
    </section>
  );
}
