import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { LootGemType } from '@/expedition/domain';
import { GEM_CATEGORIES, gemCategory } from '@/clueGame/categories';
import type { ClueFit } from '@/clueGame/deduction';
import { speciesBadge, type PoolSpecies } from '@/clueGame/pool';
import type { FeedItem } from '@/clueGame/session';

const FIT_DOT: Record<ClueFit, string> = {
  fits: 'bg-emerald-300',
  partial: 'bg-amber-300',
  contradicts: 'bg-rose-400',
  unknown: 'bg-white/20',
};
const FIT_LABEL: Record<ClueFit, string> = { fits: 'fits', partial: 'partly fits', contradicts: 'rules it out', unknown: 'no data' };

export function GemIcon({ gem, className = 'h-6 w-6' }: { gem: LootGemType; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG icon
  return <img src={`/assets/evidence/${gem}.svg`} alt="" aria-hidden="true" className={`${className} shrink-0`} />;
}

export function CandidateGrid({ candidates, fitsById, ruledOut, wrongGuesses, answerId, canGuess, onGuess }: {
  candidates: PoolSpecies[];
  fitsById: Map<number, ClueFit[]>;
  ruledOut: number[];
  wrongGuesses: number[];
  answerId: number | null;
  canGuess: boolean;
  onGuess: (speciesId: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5" role="list" aria-label="Mystery candidates">
      {candidates.map(species => {
        const fits = fitsById.get(species.id) ?? [];
        const isOut = ruledOut.includes(species.id);
        const isWrong = wrongGuesses.includes(species.id);
        const isAnswer = answerId === species.id;
        const matches = fits.filter(fit => fit === 'fits').length;
        return (
          <div
            key={species.id}
            role="listitem"
            className={`relative rounded-xl border px-2 py-1.5 transition-all duration-300 ${
              isAnswer ? 'border-amber-300 bg-amber-300/15'
                : isWrong ? 'border-rose-400/40 bg-rose-950/30 opacity-60'
                : isOut ? 'border-white/10 bg-white/[.02] opacity-45'
                : 'border-white/15 bg-white/[.05]'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xl ${isOut && !isAnswer ? 'border-rose-300/30 bg-slate-800 grayscale' : 'border-cyan-100/25 bg-gradient-to-br from-cyan-300/20 to-emerald-300/10'}`}>
                <span aria-hidden="true">{speciesBadge(species)}</span>
                {isOut && !isAnswer && <span className="absolute inset-0 grid place-items-center"><X className="h-8 w-8 text-rose-400/80" strokeWidth={3} /></span>}
                {isAnswer && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-black"><Check className="h-3 w-3" /></span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`m-0 text-xs font-semibold leading-tight text-white ${isOut && !isAnswer ? 'line-through' : ''}`}>{species.commonName}</p>
                <p className="m-0 truncate text-[10px] italic leading-tight text-white/50">{species.scientificName}</p>
                <div className="mt-1 flex min-h-2.5 flex-wrap gap-0.5" aria-label={fits.length ? `${matches} of ${fits.length} clues fit` : 'No clues yet'}>
                  {fits.slice(-12).map((fit, index) => (
                    <span key={index} className={`h-2.5 w-2.5 rounded-full ${FIT_DOT[fit]}`} title={FIT_LABEL[fit]} />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onGuess(species.id)}
              disabled={!canGuess || isWrong}
              className="mt-1.5 w-full rounded-lg border border-cyan-200/30 bg-cyan-300/10 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-100 transition-colors hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Guess ${species.commonName}`}
            >
              {isWrong ? 'Not this one' : 'Guess'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryLegend({ notesLeft, useful }: { notesLeft: Record<LootGemType, number>; useful: Set<LootGemType> }) {
  return (
    <div className="grid grid-cols-4 gap-1" aria-label="Gem clue categories">
      {GEM_CATEGORIES.map(category => {
        const left = notesLeft[category.gem] ?? 0;
        const isUseful = useful.has(category.gem) && left > 0;
        return (
          <div
            key={category.gem}
            title={`${category.question}${isUseful ? ' Can still tell the live animals apart.' : ''}`}
            className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1 text-center transition-colors ${
              isUseful ? 'border-cyan-200/60 bg-cyan-300/10 shadow-[0_0_12px_rgba(103,232,249,.25)]' : 'border-white/10 bg-white/[.03]'
            } ${left === 0 ? 'opacity-40' : ''}`}
          >
            <GemIcon gem={category.gem} className="h-6 w-6" />
            <span className="text-[9px] font-semibold leading-tight text-white/85">{category.label}</span>
            <span className="text-[9px] leading-none text-white/50">{left} left{isUseful ? ' ★' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ClueFeed({ feed, speciesById, candidateIds }: {
  feed: FeedItem[];
  speciesById: Map<number, PoolSpecies>;
  candidateIds: number[];
}) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [feed.length]);

  return (
    <ol ref={listRef} className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto p-0 pr-1 [scrollbar-color:rgba(165,243,252,.25)_transparent] [scrollbar-width:thin]" aria-label="Clue feed" aria-live="polite">
      {feed.map(item => {
        if (item.kind === 'round') {
          return (
            <li key={item.key} className="my-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
              <span className="h-px flex-1 bg-cyan-100/20" />Animal {item.round}: a new mystery<span className="h-px flex-1 bg-cyan-100/20" />
            </li>
          );
        }
        if (item.kind === 'guess') {
          const name = speciesById.get(item.speciesId)?.commonName ?? 'that animal';
          return (
            <li key={item.key} className={`rounded-lg border px-2 py-1.5 text-xs ${item.correct ? 'border-amber-300/50 bg-amber-300/10 text-amber-50' : 'border-rose-400/40 bg-rose-950/30 text-rose-100'}`}>
              <p className="m-0 font-semibold">{item.correct ? `It was the ${name}! +${item.points}` : `Not the ${name}. ${item.points}`}</p>
              {item.funFact && <p className="m-0 mt-0.5 text-white/75">Fun fact: {item.funFact}</p>}
            </li>
          );
        }
        const category = gemCategory(item.gem);
        return (
          <li key={item.key} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1.5">
            <div className="flex items-start gap-2">
              <GemIcon gem={item.gem} className="mt-0.5 h-5 w-5" />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: category.color }}>
                  {category.label}{item.kind === 'note' ? ' · field note' : ''}
                </p>
                <p className="m-0 text-xs leading-snug text-white/90">
                  {item.kind === 'empty' ? `No more ${category.label.toLowerCase()} clues for this animal.` : item.text}
                </p>
                {item.kind === 'clue' && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {candidateIds.map(id => {
                      const species = speciesById.get(id);
                      const fit = item.fits[id] ?? 'unknown';
                      return (
                        <span key={id} title={`${species?.commonName}: ${FIT_LABEL[fit]}`} className="flex items-center gap-0.5 rounded-full bg-black/25 py-px pl-0.5 pr-1 text-[10px] text-white/70">
                          <span className={`h-2 w-2 rounded-full ${FIT_DOT[fit]}`} />
                          {species ? `${speciesBadge(species)} ${species.commonName.split(/[\s-]/)[0]}` : '?'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
