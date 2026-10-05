// The end of a round: which animal it was, its whole family tree, the field notes
// saved this round (whole now), where every fact came from (links open now), and
// the points (plan 041).
import { useId } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { RoundEnd } from '@/clueGame/matchSession';
import type { PoolSpecies } from '@/clueGame/pool';
import type { Animal, RoundState, Source } from '@/clueGame/questionMatch';
import { photoAt, redListStatus } from '@/clueGame/speciesInfo';
import { GlossaryText } from './GlossaryText';
import { SourceLine } from './LogEntryText';
import { RangeMap } from './RangeMap';
import { PhotoCredit, SpeciesPortrait } from './SpeciesPortrait';

export function RevealSheet({ animal, species, round, end, isNew, newBest, onNext }: {
  animal: Animal;
  species: PoolSpecies;
  round: RoundState;
  end: RoundEnd;
  /** First time this player found it. */
  isNew: boolean;
  /** This solve set a new personal best score. */
  newBest: boolean;
  onNext: () => void;
}) {
  const titleId = useId();
  const solved = end.outcome === 'solved';
  const status = redListStatus(animal.redList);
  const tree = animal.familyTree;
  const saved = animal.notes.slice(0, round.notesCollected);
  const notes = saved.length ? saved : [animal.revealNotes[0] ?? animal.notes[0]].filter(Boolean);
  const sources = [...new Map<string, Source>(
    [...Object.values(animal.traitSources), ...animal.notes.map(note => note.source), ...animal.revealNotes.map(note => note.source)]
      .map(source => [source.url ?? source.name, source]),
  ).values()];
  const heading = solved ? `It's the ${animal.name}!${end.lastChance ? ' (last chance)' : ''}` : `Out of moves: it was the ${animal.name}!`;

  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <section className="cm-pop-in flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl border border-ochre/40 bg-surface text-mist shadow-2xl" aria-label={`It was the ${animal.name}`} aria-live="assertive">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {species.photo ? (
            <figure className="m-0">
              <div className="relative overflow-hidden rounded-xl bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- a remote Commons thumbnail */}
                <img src={photoAt(species.photo.url, 500)} alt={`A ${animal.name}`} decoding="async" className="h-40 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-2 pt-10">
                  <h2 id={titleId} className="m-0 font-display text-lg font-bold leading-tight">{heading}</h2>
                  {solved && <p className="m-0 ml-auto text-2xl font-black tabular-nums text-ochre">+{end.points}</p>}
                </div>
              </div>
              <figcaption className="mt-0.5 text-right text-[10px]"><PhotoCredit photo={species.photo} /></figcaption>
            </figure>
          ) : (
            <div className="flex items-center gap-3">
              <SpeciesPortrait species={species} className="h-14 w-14 border border-ochre/50 bg-ochre/15 text-3xl" />
              <h2 id={titleId} className="m-0 font-display text-lg font-bold leading-tight">{heading}</h2>
              {solved && <p className="m-0 ml-auto text-2xl font-black tabular-nums text-ochre">+{end.points}</p>}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="italic text-mist/70">{animal.scientificName}</span>
            {status && <span className={`rounded-full border px-2 py-0.5 font-semibold ${status.badge}`}>{status.label}</span>}
            {animal.redListUrl && (
              <a href={animal.redListUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-leaf underline decoration-leaf/40 underline-offset-2">
                More on the IUCN Red List<ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            {isNew && <span className="flex items-center gap-1 rounded-full bg-ochre/20 px-2 py-0.5 font-semibold text-mist"><Sparkles className="h-3 w-3" aria-hidden="true" />New in your journal</span>}
            {newBest && <span className="rounded-full bg-ochre/15 px-2 py-0.5 font-semibold text-ochre">New best score!</span>}
          </div>

          <p className="m-0 mt-2 text-[13px] leading-relaxed text-mist/85">
            🌳 Animalia › Chordata › {tree.class.latin}{tree.class.plain ? ` (${tree.class.plain})` : ''} › {tree.order.latin}{tree.order.plain ? ` (${tree.order.plain})` : ''} › {tree.family.latin}{tree.family.plain ? ` (${tree.family.plain})` : ''} › <i>{tree.genus}</i> › <i>{tree.species}</i>
          </p>

          {notes.map(note => (
            <p key={note.text} className="m-0 mt-2 rounded-lg border border-white/10 bg-white/[.04] p-2 text-[13px] leading-snug text-mist/90">
              📓 <GlossaryText text={note.full ?? note.text} /><SourceLine source={note.source} live={false} />
            </p>
          ))}

          <div className="mt-2"><RangeMap speciesId={animal.id} name={animal.name} /></div>

          {solved ? (
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-1 p-0" aria-label="Points">
              {end.parts.map(part => (
                <li key={part.label} className="rounded-md bg-white/[.06] px-2 py-0.5 text-[11px] text-mist/80">{part.label} <span className="font-bold text-ochre">+{part.points}</span></li>
              ))}
            </ul>
          ) : <p className="m-0 mt-2 text-[13px] text-mist/70">0 points. Your streak starts over.</p>}

          <h3 className="m-0 mt-3 text-[11px] font-bold uppercase tracking-[.12em] text-sage">Sources</h3>
          <ul className="m-0 mt-1 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[12px]">
            {sources.map(source => (
              <li key={source.url ?? source.name}>
                {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-leaf underline decoration-leaf/40 underline-offset-2">{source.name}</a> : source.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          <button type="button" onClick={onNext} className="h-12 w-full rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">Next animal</button>
        </div>
      </section>
    </div>
  );
}
