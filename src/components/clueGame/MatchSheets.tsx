// The sheets that slide up over the game (plan 041): an animal's field guide (and the guess), the family tree, the saved field notes and
// the whole log. One wrapper; each sheet is small.
import { useId, type ReactNode } from 'react';
import { Lock, TreeDeciduous } from 'lucide-react';
import { motion } from 'motion/react';
import { GEM_OF } from '@/clueGame/gems';
import type { PoolSpecies } from '@/clueGame/pool';
import {
  CATEGORY_LABELS, CHARGE_CATEGORIES, FAMILY_TREE_RANKS, familyTreeQuote,
  type Animal, type Book, type RoundState,
} from '@/clueGame/questionMatch';
import { photoAt } from '@/clueGame/speciesInfo';
import { backdropMotion, drawerUpMotion, useOverlayPresence } from '@/lib/motion';
import { GemIcon } from './GemIcon';
import { GlossaryText } from './GlossaryText';
import { LogEntryText, isLive, plural, rankName } from './LogEntryText';
import { useEscapeKey } from './useEscapeKey';

export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEscapeKey(onClose);
  const titleId = useId();
  const presence = useOverlayPresence();
  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center" {...presence} aria-labelledby={titleId} onClick={onClose}>
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-m bg-neutral-1 text-s text-neutral-10 shadow-m" onClick={event => event.stopPropagation()} {...drawerUpMotion}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-l pb-xs">
          <h2 id={titleId} className="m-0 mb-xs text-m font-medium">{title}</h2>
          {children}
        </div>
        <div className="flex gap-xs px-l pb-[max(var(--space-m),env(safe-area-inset-bottom))] pt-xs">
          {footer}
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

export function FieldGuideSheet({ animal, species, round, onGuess, onClose }: {
  animal: Animal; species: PoolSpecies | undefined; round: RoundState; onGuess: (id: number) => void; onClose: () => void;
}) {
  const out = round.out[animal.id];
  const why = !out ? null
    : out.by === 'answer' ? `Crossed out by question ${out.question}.`
    : out.by === 'family-tree' ? `Crossed out by the family tree (${out.rank}).`
    : 'You guessed it: not this one.';
  const sections: Array<[keyof Animal['guide'], string]> = [['family', '🌳 Family tree'], ['body', 'Body'], ['habits', 'Habits'], ['habitat', 'Habitat'], ['range', 'Range'], ['life', 'Life cycle']];
  const canGuess = !out && isLive(round.status);
  return (
    <Sheet
      title={animal.name}
      onClose={onClose}
      footer={canGuess ? <button type="button" onClick={() => onGuess(animal.id)} className="h-12 flex-[2] rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">Guess: it&apos;s the {animal.name}!</button> : undefined}
    >
      {species?.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- a remote Commons thumbnail
        <img src={photoAt(species.photo.url, 330)} alt={`A ${animal.name}`} decoding="async" className="mb-2 h-36 w-full rounded-xl object-cover" />
      )}
      {why && <p className="m-0 mb-2 text-sm font-semibold text-danger">{why}</p>}
      {sections.map(([key, label]) => animal.guide[key].length > 0 && (
        <section key={key} className="mb-2">
          <h3 className="m-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-sage">
            {key !== 'family' && <GemIcon gem={GEM_OF[key]} className="h-4 w-4" />}{label}
          </h3>
          {animal.guide[key].map(line => <p key={line} className="m-0 mt-0.5 text-[13px] leading-snug text-mist/85"><GlossaryText text={line} /></p>)}
        </section>
      ))}
    </Sheet>
  );
}

export function FamilyTreeSheet({ book, animal, round, onBuy, onClose }: {
  book: Book; animal: Animal; round: RoundState; onBuy: () => void; onClose: () => void;
}) {
  const quote = familyTreeQuote(book, round);
  const tree = animal.familyTree;
  const steps = round.log.filter(entry => entry.kind === 'step');
  const missing = CHARGE_CATEGORIES.filter(category => round.charges[category] < 1);
  return (
    <Sheet
      title={<span className="flex items-center gap-2"><TreeDeciduous className="h-5 w-5 text-leaf" aria-hidden="true" />Family tree</span>}
      onClose={onClose}
      footer={quote?.affordable && isLive(round.status)
        ? <button type="button" onClick={onBuy} className="h-12 flex-[2] rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">Reveal its {quote.rank}</button>
        : undefined}
    >
      <p className="m-0 mb-1 text-[13px] text-mist/70">Every animal here is in kingdom Animalia and phylum Chordata (animals with a backbone).</p>
      <ul className="m-0 list-none p-0">
        {FAMILY_TREE_RANKS.map((rank, index) => {
          const known = index < round.familyTreeSteps;
          const step = steps.find(entry => entry.kind === 'step' && entry.rank === rank);
          return (
            <li key={rank} className="flex items-baseline justify-between gap-2 border-t border-white/10 py-2 text-sm">
              <span>{rankName(rank)} {known ? <><b>{tree[rank].latin}</b>{tree[rank].plain ? ` (${tree[rank].plain})` : ''}</> : '?'}</span>
              <span className="shrink-0 text-right text-[12px] text-mist/55">
                {known ? (step?.kind === 'step' && step.free ? 'every animal left is one, so it came free' : '✓') : index === round.familyTreeSteps ? <b className="text-mist">next</b> : ''}
              </span>
            </li>
          );
        })}
        <li className="flex justify-between border-t border-white/10 py-2 text-sm"><span>Genus and species ?</span><span className="text-[12px] text-mist/55">on the reveal card</span></li>
      </ul>
      {round.rules.familyTree.cost === 'match' && round.familyTreeSteps < FAMILY_TREE_RANKS.length && (
        <p className="m-0 mt-2 text-[13px] text-mist/80">
          Line up {round.rules.familyTree.match} or more gems of one color to reveal its {FAMILY_TREE_RANKS[round.familyTreeSteps]}. It crosses out every animal in another {FAMILY_TREE_RANKS[round.familyTreeSteps]}.
        </p>
      )}
      {quote && (
        <p className="m-0 mt-2 text-[13px] text-mist/80">
          Revealing its {quote.rank} costs one charge of each color, and crosses out every animal in another {quote.rank}.{' '}
          {quote.affordable ? 'You have a full set.' : <span className="text-mist/60">Still missing: {missing.map(category => CATEGORY_LABELS[category]).join(', ')}.</span>}
        </p>
      )}
    </Sheet>
  );
}

export function NotesSheet({ round, nameOf, onClose }: { round: RoundState; nameOf: (id: number) => string; onClose: () => void }) {
  const sealed = isLive(round.status) && round.status !== 'last-chance';
  const notes = round.log.filter(entry => entry.kind === 'note');
  return (
    <Sheet title={sealed ? <span className="flex items-center gap-2"><Lock className="h-5 w-5 text-notes" aria-hidden="true" />Field notes: {round.notesCollected}</span> : '📓 Field notes'} onClose={onClose}>
      {sealed ? (
        <>
          <p className="m-0 text-sm text-mist/85">Match next to a glowing note gem to save a field note. Saved notes stay sealed: if your final guess is wrong, they open and you get one more guess.</p>
          {round.notesCollected === 0 && <p className="m-0 mt-2 text-sm text-mist/60">You haven&apos;t saved any yet.</p>}
        </>
      ) : notes.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {notes.map((entry, index) => <li key={index} className="rounded-lg border border-notes/30 bg-notes/10 p-2 text-[13px] leading-snug"><LogEntryText entry={entry} status={round.status} nameOf={nameOf} /></li>)}
        </ul>
      ) : <p className="m-0 text-sm text-mist/60">No field notes opened this round.</p>}
    </Sheet>
  );
}

export function LogSheet({ round, nameOf, onClose }: { round: RoundState; nameOf: (id: number) => string; onClose: () => void }) {
  const entries = [...round.log].reverse();
  return (
    <Sheet title="Answers so far" onClose={onClose}>
      {entries.length === 0 && <p className="m-0 text-sm text-mist/60">Nothing yet. Match gems to earn charges, then tap a color to ask.</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {entries.map((entry, index) => <li key={index} className="border-t border-white/10 py-2 text-[13px] leading-snug first:border-t-0"><LogEntryText entry={entry} status={round.status} nameOf={nameOf} /></li>)}
      </ul>
    </Sheet>
  );
}
