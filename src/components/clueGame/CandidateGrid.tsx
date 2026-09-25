import { Check, X } from 'lucide-react';
import type { ClueFit } from '@/clueGame/deduction';
import { speciesBadge } from '@/clueGame/pool';
import type { CandidateView } from '@/clueGame/selectors';

export const FIT_STYLE: Record<ClueFit, { dot: string; label: string }> = {
  fits: { dot: 'bg-emerald-300', label: 'matches its record' },
  partial: { dot: 'bg-amber-300', label: 'partly matches' },
  unknown: { dot: 'bg-white/25', label: 'no record either way' },
  contradicts: { dot: 'bg-rose-400', label: 'rules it out' },
};

/** The six possible animals. Tap one to select it; the Guess button confirms. */
export function CandidateGrid({ candidates, selectedId, onSelect }: {
  candidates: CandidateView[];
  selectedId: number | null;
  onSelect: (speciesId: number) => void;
}) {
  return (
    <ul className="m-0 grid shrink-0 list-none grid-cols-3 gap-1.5 p-0" aria-label="Possible animals">
      {candidates.map(({ species, fits, matches, status }) => {
        const out = status === 'ruled-out' || status === 'wrong-guess';
        const selected = selectedId === species.id;
        return (
          <li key={species.id}>
            <button
              key={status}
              type="button"
              onClick={() => onSelect(species.id)}
              disabled={out || status === 'answer'}
              aria-pressed={selected}
              aria-label={`${species.commonName}${status === 'ruled-out' ? ', ruled out' : status === 'wrong-guess' ? ', not it' : status === 'answer' ? ', the answer' : ''}. ${matches} of ${fits.length} clues match.`}
              className={`relative flex min-h-16 w-full short:min-h-12 items-center gap-1.5 rounded-xl border px-1.5 py-1 text-left transition-all ${
                status === 'answer' ? 'border-amber-300 bg-amber-300/15'
                  : status === 'wrong-guess' ? 'cm-shake border-rose-400/40 bg-rose-950/30 opacity-60'
                  : status === 'ruled-out' ? 'border-white/10 bg-white/[.02] opacity-40'
                  : selected ? 'border-cyan-200 bg-cyan-300/15 ring-2 ring-cyan-200/60'
                  : 'border-white/15 bg-white/[.05] active:bg-white/10'
              }`}
            >
              <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xl ${out ? 'border-rose-300/30 bg-slate-800 grayscale' : 'border-cyan-100/25 bg-gradient-to-br from-cyan-300/20 to-emerald-300/10'}`}>
                <span aria-hidden="true">{speciesBadge(species)}</span>
                {out && <span className="roster-cross absolute inset-0 grid place-items-center"><X className="h-8 w-8 text-rose-400/80" strokeWidth={3} /></span>}
                {status === 'answer' && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-black"><Check className="h-3 w-3" /></span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block hyphens-auto text-[11px] font-semibold leading-tight text-white ${out ? 'line-through' : ''}`} lang="en">{species.commonName}</span>
                <span className="mt-1 flex items-center gap-0.5" aria-hidden="true">
                  {fits.slice(-8).map((fit, index) => <span key={index} className={`h-2 w-2 shrink-0 rounded-full ${FIT_STYLE[fit].dot}`} />)}
                  {fits.length > 0 && <span className="ml-0.5 text-[9px] font-bold tabular-nums text-emerald-200/90">{matches}✓</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
