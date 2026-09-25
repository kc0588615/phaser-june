import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { speciesBadge, type PoolSpecies } from '@/clueGame/pool';
import type { SolveSummary } from '@/clueGame/session';
import { redListStatus, taxonomyLine } from '@/clueGame/speciesInfo';
import { GlossaryText } from './GlossaryText';
import { RangeMap } from './RangeMap';

const AUTO_ADVANCE_MS = 9000;

/** The answer, what it's worth, and something new to learn about it. */
export function RevealSheet({ species, solve, isNew, newBest, onNext }: {
  species: PoolSpecies;
  solve: SolveSummary;
  isNew: boolean;
  /** This solve set a new personal best score. */
  newBest: boolean;
  onNext: () => void;
}) {
  const [autoAdvance, setAutoAdvance] = useState(true);
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = window.setTimeout(onNext, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, onNext]);

  const status = redListStatus(species.conservationCode);
  return (
    <section
      className="cm-pop-in absolute inset-0 z-10 flex flex-col gap-2 overflow-y-auto rounded-t-2xl border border-amber-300/40 bg-[#081a21] p-3 shadow-2xl"
      aria-label={`It was the ${species.commonName}`}
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-amber-300/50 bg-amber-300/15 text-3xl" aria-hidden="true">{speciesBadge(species)}</span>
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[.16em] text-amber-200">You found it!</p>
          <h2 className="m-0 text-lg font-bold leading-tight text-white">{species.commonName}</h2>
          <p className="m-0 text-xs italic text-white/60">{species.scientificName}</p>
        </div>
        <p className="m-0 ml-auto text-2xl font-black tabular-nums text-amber-200">+{solve.points}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-white/70">{taxonomyLine(species)}</span>
        {status && <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.badge}`}>{status.label}</span>}
        {isNew && <span className="flex items-center gap-1 rounded-full bg-cyan-300/20 px-2 py-0.5 font-semibold text-cyan-100"><Sparkles className="h-3 w-3" aria-hidden="true" />New in your journal</span>}
        {newBest && <span className="rounded-full bg-amber-300/25 px-2 py-0.5 font-semibold text-amber-100">New best score!</span>}
      </div>

      <RangeMap speciesId={species.id} name={species.commonName} />

      <ul className="m-0 flex list-none flex-wrap gap-1 p-0" aria-label="Points">
        {solve.parts.map(part => (
          <li key={part.label} className="rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] text-white/80">
            {part.label} <span className="font-bold text-amber-200">+{part.points}</span>
          </li>
        ))}
      </ul>

      {solve.funFact && (
        <p className="m-0 rounded-lg border border-white/10 bg-white/[.04] p-2 text-[13px] leading-snug text-white/90">
          <span className="font-semibold text-cyan-200">Did you know? </span><GlossaryText text={solve.funFact} />
        </p>
      )}
      <p className="m-0 text-[11px] text-white/50">
        {solve.cluesSeen} clue{solve.cluesSeen === 1 ? '' : 's'} read in {solve.moves} move{solve.moves === 1 ? '' : 's'}.
      </p>

      <div className="sticky bottom-0 -mx-3 -mb-3 mt-auto flex flex-col gap-1.5 bg-[#081a21] px-3 pb-3 pt-2">
        {autoAdvance && (
          <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="cm-countdown h-full bg-amber-300/70" style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }} />
          </div>
        )}
        <div className="flex gap-2">
          {autoAdvance && (
            <button type="button" onClick={() => setAutoAdvance(false)} className="h-12 flex-1 rounded-xl border border-white/20 text-sm font-semibold text-white/85 active:bg-white/10">
              Keep reading
            </button>
          )}
          <button type="button" onClick={onNext} className="h-12 flex-[2] rounded-xl bg-amber-300 text-sm font-bold text-slate-950 active:scale-[.98]">
            Next animal
          </button>
        </div>
      </div>
    </section>
  );
}
