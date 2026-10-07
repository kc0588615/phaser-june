import { ExternalLink, X } from 'lucide-react';
import { motion } from 'motion/react';
import { GLOSSARY } from '@/clueGame/glossary';
import type { Journal, Records } from '@/clueGame/journal';
import { keyFacts, playableSpeciesIds, type CluePool } from '@/clueGame/pool';
import { redListStatus, taxonomyLine } from '@/clueGame/speciesInfo';
import { LARGE, backdropMotion, drawerSideMotion, useOverlayPresence } from '@/lib/motion';
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
  const presence = useOverlayPresence();

  return (
    <div className="fixed inset-0 z-[8300] flex justify-end" {...presence} aria-labelledby="journal-title" onClick={onClose}>
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative flex h-full w-full max-w-md flex-col bg-neutral-1 text-s text-neutral-10 shadow-m" onClick={event => event.stopPropagation()} {...drawerSideMotion}>
        <header className="flex items-center gap-xs px-l py-s">
          <div>
            <h2 id="journal-title" className="m-0 text-m font-medium">Field Journal</h2>
            <p className="m-0 text-xs text-neutral-7">{found.length} of {playable.length} animals identified</p>
            {records.bestScore > 0 && <p className="m-0 text-xs font-medium text-neutral-10">Best score {records.bestScore} · best streak {records.bestStreak}</p>}
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon ml-auto" aria-label="Close journal">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="mx-l h-1.5 overflow-hidden rounded-full bg-neutral-3" aria-hidden="true">
          <motion.div className="h-full rounded-full bg-color-1" initial={false} animate={{ width: `${playable.length ? (100 * found.length) / playable.length : 0}%` }} transition={LARGE} />
        </div>
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-xs overflow-y-auto p-m">
          {found.length === 0 && <li className="p-m text-center text-s text-neutral-7">Identify a mystery animal to start your journal.</li>}
          {found.map(species => {
            const entry = journal[species.scientificName];
            const status = redListStatus(species.conservationCode);
            return (
              <li key={species.id} className="rounded-s bg-neutral-2 p-s">
                <div className="flex items-center gap-xs">
                  <SpeciesPortrait species={species} className="h-12 w-12 bg-neutral-3 text-l" />
                  <div className="min-w-0">
                    <p className="m-0 font-medium">{species.commonName}</p>
                    <p className="m-0 text-xs italic text-neutral-7">{species.scientificName}</p>
                  </div>
                  <p className="m-0 ml-auto text-right font-data text-xs text-neutral-7">×{entry.timesSolved}<br />best {entry.bestMoves} move{entry.bestMoves === 1 ? '' : 's'}</p>
                </div>
                <p className="m-0 mt-xs flex flex-wrap items-center gap-xs text-xs text-neutral-7">
                  {taxonomyLine(species)}
                  {status && <span className={`rounded-full px-xs py-xxs font-medium ${status.badge}`}>{status.label}</span>}
                  {species.redlistUrl && (
                    <a href={species.redlistUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-xxs text-color-1 underline underline-offset-2">
                      Red List<ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </p>
                <div className="mt-xs"><RangeMap speciesId={species.id} name={species.commonName} caption={false} /></div>
                <ul className="m-0 mt-xs list-disc pl-m text-xs text-neutral-8">
                  {(pool ? keyFacts(pool, species.id).slice(0, LEARNED_FACTS) : []).map(fact => <li key={fact}><GlossaryText text={fact} /></li>)}
                </ul>
                {species.photo && <p className="m-0 mt-xxs text-xxs"><PhotoCredit photo={species.photo} /></p>}
              </li>
            );
          })}
          {hidden > 0 && found.length > 0 && (
            <li className="p-s text-center text-xs text-neutral-7">{hidden} more animal{hidden === 1 ? '' : 's'} to discover.</li>
          )}
          {words.length > 0 && (
            <li className="rounded-s bg-neutral-2 p-s">
              <details>
                <summary className="cursor-pointer rounded-s py-xs text-s font-medium text-neutral-10">Words you&apos;ve learned ({words.length})</summary>
                <dl className="m-0 mt-xs flex flex-col gap-xs text-s text-neutral-8">
                  {words.map(entry => (
                    <div key={entry.term}>
                      <dt className="inline font-medium text-neutral-10">{entry.term}: </dt>
                      <dd className="m-0 inline">{entry.definition}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </li>
          )}
          {found.length > 0 && <li className="pb-xs text-center text-xxs text-neutral-6">Range maps: IUCN Red List</li>}
        </ul>
      </motion.div>
    </div>
  );
}
