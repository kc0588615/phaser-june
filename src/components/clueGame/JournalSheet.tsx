import { X } from 'lucide-react';
import type { Journal } from '@/clueGame/journal';
import { speciesBadge, type CluePool } from '@/clueGame/pool';
import { playableSpeciesIds } from '@/clueGame/round';
import { redListStatus, taxonomyLine } from '@/clueGame/speciesInfo';
import { useEscapeKey } from './useEscapeKey';

const LEARNED_FACTS = 3;

/** Every animal this player has identified, with facts to revisit. */
export function JournalSheet({ pool, journal, onClose }: { pool: CluePool | null; journal: Journal; onClose: () => void }) {
  useEscapeKey(onClose);
  const playable = pool ? playableSpeciesIds(pool).flatMap(id => pool.species.find(species => species.id === id) ?? []) : [];
  const found = playable.filter(species => journal[species.scientificName]);
  const hidden = playable.length - found.length;
  const factsFor = (speciesId: number) => pool ? [
    ...pool.facts.filter(fact => fact.speciesId === speciesId && fact.category === 'key_fact').map(fact => fact.text),
    ...pool.clues.filter(clue => clue.speciesId === speciesId && clue.category === 'key_fact').map(clue => clue.label),
  ].filter((text, index, all) => all.indexOf(text) === index).slice(0, LEARNED_FACTS) : [];

  return (
    <div className="fixed inset-0 z-[8300] flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-labelledby="journal-title" onClick={onClose}>
      <div className="cm-pop-in flex h-full w-full max-w-md flex-col bg-[#081a21] text-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 id="journal-title" className="m-0 text-lg font-bold">Field Journal</h2>
            <p className="m-0 text-xs text-white/60">{found.length} of {playable.length} animals identified</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label="Close journal">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="h-1.5 bg-white/10" aria-hidden="true">
          <div className="h-full bg-cyan-300 transition-all" style={{ width: `${playable.length ? (100 * found.length) / playable.length : 0}%` }} />
        </div>
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-3">
          {found.length === 0 && <li className="p-4 text-center text-sm text-white/60">Identify a mystery animal to start your journal.</li>}
          {found.map(species => {
            const entry = journal[species.scientificName];
            const status = redListStatus(species.conservationCode);
            return (
              <li key={species.id} className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-300/15 text-2xl" aria-hidden="true">{speciesBadge(species)}</span>
                  <div className="min-w-0">
                    <p className="m-0 font-semibold leading-tight">{species.commonName}</p>
                    <p className="m-0 text-xs italic text-white/55">{species.scientificName}</p>
                  </div>
                  <p className="m-0 ml-auto text-right text-[11px] text-white/60">×{entry.timesSolved}<br />best {entry.bestMoves} move{entry.bestMoves === 1 ? '' : 's'}</p>
                </div>
                <p className="m-0 mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/70">
                  {taxonomyLine(species)}
                  {status && <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.badge}`}>{status.label}</span>}
                </p>
                <ul className="m-0 mt-1.5 list-disc pl-4 text-[12px] leading-snug text-white/85">
                  {factsFor(species.id).map(fact => <li key={fact}>{fact}</li>)}
                </ul>
              </li>
            );
          })}
          {hidden > 0 && found.length > 0 && (
            <li className="p-3 text-center text-xs text-white/50">{hidden} more animal{hidden === 1 ? '' : 's'} to discover.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
