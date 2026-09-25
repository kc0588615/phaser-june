import { useEffect, useRef } from 'react';
import { gemCategory } from '@/clueGame/categories';
import type { PoolSpecies } from '@/clueGame/pool';
import { fitGroups } from '@/clueGame/selectors';
import type { FeedItem } from '@/clueGame/session';
import { GemIcon } from './GemIcon';
import { GlossaryText } from './GlossaryText';

const shortName = (species: PoolSpecies | undefined) => species?.commonName ?? '?';

/** Every clue and note, newest at the bottom. */
export function ClueFeed({ feed, speciesById, displayOrder }: {
  feed: FeedItem[];
  speciesById: Map<number, PoolSpecies>;
  /** Candidate order on screen, so feed names read in the same order. */
  displayOrder: number[];
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const lastKey = feed.at(-1)?.key;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [lastKey]);

  return (
    <ol
      ref={listRef}
      className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto overscroll-contain p-0 pr-1 [scrollbar-color:rgba(165,243,252,.25)_transparent] [scrollbar-width:thin]"
      aria-label="Clues"
      aria-live="polite"
    >
      {feed.map(item => {
        if (item.kind === 'round') {
          return (
            <li key={item.key} className="my-0.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
              <span className="h-px flex-1 bg-cyan-100/20" />Animal {item.round}: a new mystery<span className="h-px flex-1 bg-cyan-100/20" />
            </li>
          );
        }
        if (item.kind === 'shuffle') {
          return <li key={item.key} className="cm-feed-in text-center text-[11px] italic text-white/55">No moves left, so the field shifted.</li>;
        }
        if (item.kind === 'guess') {
          const name = shortName(speciesById.get(item.speciesId));
          return (
            <li key={item.key} className={`cm-feed-in rounded-lg border px-2 py-1.5 text-xs ${item.correct ? 'border-amber-300/50 bg-amber-300/10 text-amber-50' : 'border-rose-400/40 bg-rose-950/30 text-rose-100'}`}>
              <p className="m-0 font-semibold">{item.correct ? `It was the ${name}! +${item.points}` : `Not the ${name}. ${item.points} points`}</p>
            </li>
          );
        }
        const category = gemCategory(item.gem);
        const groups = item.kind === 'clue' ? fitGroups(item.fits, displayOrder) : null;
        return (
          <li key={item.key} className="cm-feed-in rounded-lg border border-white/10 bg-white/[.04] px-2 py-1.5">
            <div className="flex items-start gap-2">
              <GemIcon gem={item.gem} className="mt-0.5 h-5 w-5" />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[9px] font-bold uppercase tracking-[.14em]" style={{ color: category.color }}>
                  {category.label}{item.kind === 'note' ? ' · fun note' : ''}
                </p>
                <p className="m-0 text-[13px] leading-snug text-white/90">
                  {item.kind === 'empty' ? `No more ${category.label.toLowerCase()} clues for this animal.` : <GlossaryText text={item.text} />}
                </p>
                {groups && (
                  <p className="m-0 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] leading-tight">
                    {groups.fits.length > 0 && <span className="text-emerald-200">✓ {groups.fits.map(id => shortName(speciesById.get(id))).join(', ')}</span>}
                    {groups.partial.length > 0 && <span className="text-amber-200">◐ {groups.partial.map(id => shortName(speciesById.get(id))).join(', ')}</span>}
                    {groups.contradicts.length > 0 && <span className="text-rose-300">✕ {groups.contradicts.map(id => shortName(speciesById.get(id))).join(', ')}</span>}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
