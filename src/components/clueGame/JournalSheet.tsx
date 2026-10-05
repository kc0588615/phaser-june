import { ExternalLink, X } from 'lucide-react';
import { GLOSSARY } from '@/clueGame/glossary';
import type { Journal, Records } from '@/clueGame/journal';
import { keyFacts, playableSpeciesIds, type CluePool } from '@/clueGame/pool';
import { redListStatus, taxonomyLine } from '@/clueGame/speciesInfo';
import { GlossaryText } from './GlossaryText';
import { RangeMap } from './RangeMap';
import { PhotoCredit, SpeciesPortrait } from './SpeciesPortrait';
import { useEscapeKey } from './useEscapeKey';
import { useWordsLearned } from './useWordsLearned';

const LEARNED_FACTS = 3;

/** Every animal this player has identified, with facts to revisit. */
export function JournalSheet({ pool, journal, records, onClose }: { pool: CluePool | null; journal: Journal; records: Records; onClose: () => void }) {
  useEscapeKey(onClose);
  const words = useWordsLearned().flatMap(word => GLOSSARY.find(entry => entry.term === word) ?? []);
  const playable = pool ? playableSpeciesIds(pool).flatMap(id => pool.species.find(species => species.id === id) ?? []) : [];
  const found = playable.filter(species => journal[species.scientificName]);
  const hidden = playable.length - found.length;

  return (
    <div className="fixed inset-0 z-[8300] flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-labelledby="journal-title" onClick={onClose}>
      <div className="cm-pop-in flex h-full w-full max-w-md flex-col bg-surface text-mist shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 id="journal-title" className="m-0 font-display text-lg font-bold">Field Journal</h2>
            <p className="m-0 text-xs text-mist/60">{found.length} of {playable.length} animals identified</p>
            {records.bestScore > 0 && <p className="m-0 text-xs text-ochre">Best score {records.bestScore} · best streak {records.bestStreak}</p>}
          </div>
          <button type="button" onClick={onClose} className="ml-auto grid h-11 w-11 place-items-center rounded-full hover:bg-white/10" aria-label="Close journal">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="h-1.5 bg-white/10" aria-hidden="true">
          <div className="h-full bg-ochre transition-all" style={{ width: `${playable.length ? (100 * found.length) / playable.length : 0}%` }} />
        </div>
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 overflow-y-auto p-3">
          {found.length === 0 && <li className="p-4 text-center text-sm text-mist/60">Identify a mystery animal to start your journal.</li>}
          {found.map(species => {
            const entry = journal[species.scientificName];
            const status = redListStatus(species.conservationCode);
            return (
              <li key={species.id} className="rounded-xl border border-white/10 bg-white/[.04] p-3">
                <div className="flex items-center gap-2">
                  <SpeciesPortrait species={species} className="h-12 w-12 bg-river/20 text-2xl" />
                  <div className="min-w-0">
                    <p className="m-0 font-semibold leading-tight">{species.commonName}</p>
                    <p className="m-0 text-xs italic text-mist/55">{species.scientificName}</p>
                  </div>
                  <p className="m-0 ml-auto text-right text-[11px] text-mist/60">×{entry.timesSolved}<br />best {entry.bestMoves} move{entry.bestMoves === 1 ? '' : 's'}</p>
                </div>
                <p className="m-0 mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-mist/70">
                  {taxonomyLine(species)}
                  {status && <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.badge}`}>{status.label}</span>}
                  {species.redlistUrl && (
                    <a href={species.redlistUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-leaf underline decoration-leaf/40 underline-offset-2">
                      Red List<ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </p>
                <div className="mt-1.5"><RangeMap speciesId={species.id} name={species.commonName} caption={false} /></div>
                <ul className="m-0 mt-1.5 list-disc pl-4 text-[12px] leading-snug text-mist/85">
                  {(pool ? keyFacts(pool, species.id).slice(0, LEARNED_FACTS) : []).map(fact => <li key={fact}><GlossaryText text={fact} /></li>)}
                </ul>
                {species.photo && <p className="m-0 mt-1 text-[10px]"><PhotoCredit photo={species.photo} /></p>}
              </li>
            );
          })}
          {hidden > 0 && found.length > 0 && (
            <li className="p-3 text-center text-xs text-mist/50">{hidden} more animal{hidden === 1 ? '' : 's'} to discover.</li>
          )}
          {words.length > 0 && (
            <li className="rounded-xl border border-line bg-surface p-3">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-mist">Words you&apos;ve learned ({words.length})</summary>
                <dl className="m-0 mt-2 flex flex-col gap-1.5 text-[12px] leading-snug">
                  {words.map(entry => (
                    <div key={entry.term}>
                      <dt className="inline font-semibold text-mist">{entry.term}: </dt>
                      <dd className="m-0 inline text-mist/75">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
          )}
          {found.length > 0 && <li className="pb-2 text-center text-[10px] text-mist/35">Range maps: IUCN Red List</li>}
        </ul>
      </div>
    </div>
  );
}
