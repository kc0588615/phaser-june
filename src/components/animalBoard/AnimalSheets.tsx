// The sheets over the animal board (plan 044): a suspect's field guide (with Rule
// out), the witness notes, the menu, out of moves (name it for the journal), the
// round's end (and the trail's, with the evidence grid replayed), and how to play.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookOpen, CircleHelp, Globe2, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import type { AnimalRound, WitnessNote } from '@/clueGame/animalBoard';
import type { AnimalSession } from '@/clueGame/animalSession';
import { clueFace, signsOf } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import type { Animal } from '@/clueGame/questionMatch';
import { GlossaryText } from '@/components/clueGame/GlossaryText';
import { WithBlanks } from '@/components/clueGame/LogEntryText';
import { Sheet } from '@/components/clueGame/Sheet';
import { useEscapeKey } from '@/components/clueGame/useEscapeKey';
import { backdropMotion, dialogMotion, drawerUpMotion, useOverlayPresence } from '@/lib/motion';
import { EvidenceGrid, SuspectPhoto } from './EvidenceGrid';

export const ANIMAL_HOW_TO_KEY = 'critter-connect:animal-board-how-to:v1';

/** A section label inside a sheet (cc Menu label: XS, medium). */
const LABEL = 'm-0 text-xs font-medium uppercase text-neutral-7';

const GUIDE: Array<[keyof Animal['guide'], string]> = [['body', 'Body'], ['habits', 'Habits'], ['habitat', 'Habitat'], ['range', 'Range'], ['life', 'Life cycle']];

export function SuspectSheet({ animal, species, round, onMark, onClose }: {
  animal: Animal; species: PoolSpecies | undefined; round: AnimalRound; onMark: (ruledOut: boolean) => void; onClose: () => void;
}) {
  const index = round.suspects.indexOf(animal.id);
  const released = round.released.includes(animal.id);
  const marked = round.marked.includes(animal.id);
  const signs = signsOf(animal.tags);
  const canMark = round.status === 'playing' && !released;
  return (
    <Sheet
      title={animal.name}
      onClose={onClose}
      footer={canMark ? (
        <button type="button" onClick={() => { onMark(!marked); onClose(); }} className={`btn flex-[2] ${marked ? 'btn-outline' : 'btn-danger'}`}>
          {marked ? 'Undo: not ruled out' : 'Rule out'}
        </button>
      ) : undefined}
    >
      <span className="mb-xs block h-36 w-full overflow-hidden rounded-s bg-neutral-3"><SuspectPhoto species={species} size={330} /></span>
      {released && <p className="m-0 mb-xs text-s font-medium text-neutral-7">Released: not the mystery.</p>}
      {marked && !released && <p className="m-0 mb-xs text-s font-medium text-error">Ruled out: it leaves the board when a gem next to it is cleared. If it&apos;s the mystery, it escapes!</p>}
      <h3 className={LABEL}>Its answers</h3>
      <ul className="m-0 mb-xs list-none p-0">
        {round.orders.map(order => (
          <li key={order.tag} className="flex items-center gap-xs py-xxs text-s shadow-[inset_0_-1px_0_0_var(--neutral-4)]">
            <span aria-hidden="true">{clueFace(order.tag)}</span>
            <span className="min-w-0 flex-1">{order.question}</span>
            <b className={`font-medium ${order.row[index] ? 'text-color-1' : 'text-neutral-7'}`}>{order.row[index] ? 'yes' : 'no'}</b>
          </li>
        ))}
      </ul>
      {signs.length > 0 && (
        <>
          <h3 className={LABEL}>Signs</h3>
          <p className="m-0 mb-xs mt-xxs flex flex-wrap gap-xxs">
            {signs.map(sign => <span key={sign} className="rounded-full bg-neutral-3 px-xs py-xxs text-xs text-neutral-8">{sign}</span>)}
          </p>
        </>
      )}
      {GUIDE.map(([key, label]) => animal.guide[key].length > 0 && (
        <section key={key} className="mb-xs">
          <h3 className={LABEL}>{label}</h3>
          {animal.guide[key].map(line => <p key={line} className="m-0 mt-xxs text-s text-neutral-8"><GlossaryText text={line} /></p>)}
        </section>
      ))}
    </Sheet>
  );
}

function NoteText({ note, count }: { note: WitnessNote; count: number }) {
  return <><WithBlanks text={note.text} /> <span className="text-neutral-7">The field guides of <b className="font-medium text-neutral-10">{note.fits} of the {count}</b> say this too.</span></>;
}

export function NotesSheet({ round, onClose }: { round: AnimalRound; onClose: () => void }) {
  return (
    <Sheet title="📓 Witness notes" onClose={onClose}>
      {round.notes.length === 0 && <p className="m-0 text-s text-neutral-7">Match next to a glowing purple witness gem to get a note about the mystery: something it does or has, and how many of the five animals share it.</p>}
      <ul className="m-0 flex list-none flex-col gap-xs p-0">
        {round.notes.map((note, index) => <li key={index} className="rounded-s bg-notes/15 p-s text-s"><NoteText note={note} count={round.suspects.length} /></li>)}
      </ul>
    </Sheet>
  );
}

const MENU_ROW = 'btn btn-ghost w-full justify-start px-s';

/** The menu behind the grid's corner button: the place and trail, then the globe, the journal, how to play and sound. */
export function GameMenu({ title, detail, soundOn, onSound, onJournal, onHelp, onClose }: {
  title: string; detail: string; soundOn: boolean; onSound: () => void; onJournal: () => void; onHelp: () => void; onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="m-0 mb-s text-s text-neutral-7">{detail}</p>
      <div className="flex flex-col gap-xxs pb-xxs">
        <Link href="/" className={MENU_ROW}><Globe2 className="h-5 w-5 text-neutral-7" aria-hidden="true" />Back to the globe</Link>
        <button type="button" onClick={onJournal} className={MENU_ROW} aria-label="Field journal"><BookOpen className="h-5 w-5 text-neutral-7" aria-hidden="true" />Field journal</button>
        <button type="button" onClick={onHelp} className={MENU_ROW}><CircleHelp className="h-5 w-5 text-neutral-7" aria-hidden="true" />How to play</button>
        <button type="button" onClick={onSound} className={MENU_ROW} aria-pressed={soundOn} aria-label={soundOn ? 'Sound on. Turn it off' : 'Sound off. Turn it on'}>
          {soundOn ? <Volume2 className="h-5 w-5 text-neutral-7" aria-hidden="true" /> : <VolumeX className="h-5 w-5 text-neutral-7" aria-hidden="true" />}
          Sound: {soundOn ? 'on' : 'off'}
        </button>
      </div>
    </Sheet>
  );
}

export function OutOfMovesSheet({ round, nameOf, onName }: { round: AnimalRound; nameOf: (id: number) => string; onName: (id: number | null) => void }) {
  const left = round.suspects.filter(id => !round.released.includes(id));
  const presence = useOverlayPresence();
  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center" {...presence} aria-label="Out of moves">
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative w-full max-w-md rounded-t-m bg-neutral-1 p-l pb-[max(var(--space-l),env(safe-area-inset-bottom))] text-s text-neutral-10 shadow-m" {...drawerUpMotion}>
        <h2 className="m-0 text-m font-medium">Out of moves!</h2>
        <p className="m-0 mt-xxs text-s text-neutral-7">The round is lost, and so is a heart. Which one was it? A right name still goes in your journal.</p>
        <div className="mt-s grid grid-cols-2 gap-xs">
          {left.map(id => <button key={id} type="button" onClick={() => onName(id)} className="btn btn-secondary px-s">{nameOf(id)}</button>)}
        </div>
        <button type="button" onClick={() => onName(null)} className="btn btn-ghost mt-xs w-full">Skip</button>
      </motion.div>
    </div>
  );
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function RoundEndSheet({ session, animal, species, speciesById, nameOf, onNext }: {
  session: AnimalSession; animal: Animal; species: PoolSpecies | undefined; speciesById: Map<number, PoolSpecies>; nameOf: (id: number) => string; onNext: () => void;
}) {
  const { round, end, trail } = session;
  const presence = useOverlayPresence();
  if (!end) return null;
  const tree = animal.familyTree;
  const headline: ReactNode = end.outcome === 'found'
    ? <>Found it: the {animal.name}! <span className="rounded-xs bg-emphasis-icon px-xxs text-on-emphasis-icon">{stars(end.stars)}</span></>
    : end.lostBy === 'escaped' ? <>Oh no! The {animal.name} was the mystery. It escaped!</> : <>Out of moves. It was the {animal.name}.</>;
  return (
    <div className="fixed inset-0 z-[8300] flex items-end justify-center" {...presence} aria-label={`It was the ${animal.name}`}>
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.section className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-m bg-neutral-1 p-l pb-[max(var(--space-l),env(safe-area-inset-bottom))] text-s text-neutral-10 shadow-m" aria-label={`It was the ${animal.name}`} {...drawerUpMotion}>
        <span className="mb-xs block h-44 w-full shrink-0 overflow-hidden rounded-s bg-neutral-3"><SuspectPhoto species={species} size={500} /></span>
        <h2 className="m-0 text-m font-medium">{headline}</h2>
        <p className="m-0 mt-xxs text-s text-neutral-7">
          {end.outcome === 'found' ? `+${end.points} points · ${round.movesLeft} moves to spare` : 'A heart lost.'}
          {round.named && ` You named the ${nameOf(round.named.id)}: ${round.named.correct ? 'right! It goes in your journal.' : 'not this time.'}`}
        </p>
        <h3 className={`${LABEL} mt-s`}>How the evidence lined up</h3>
        <div className="-mx-xxs mt-xxs shrink-0">
          <EvidenceGrid round={round} speciesById={speciesById} shown={round.orders.map(order => order.have)} review />
        </div>
        <p className="m-0 mt-xxs text-s text-neutral-7">
          {round.orders.some(order => order.answer)
            ? <>A <span className="rounded-xs bg-error-transparent px-xxs font-medium text-neutral-10 shadow-[inset_0_0_0_1.5px_var(--error)]">red</span> answer doesn&apos;t match the mystery&apos;s, so it rules that animal out.</>
            : 'No question was answered this time.'}
        </p>
        <p className="m-0 mt-xs text-xs italic text-neutral-7">{animal.scientificName}</p>
        <p className="m-0 text-xs text-neutral-7">Animalia › Chordata › {tree.class.latin} › {tree.order.latin} › {tree.family.latin} › {tree.genus}</p>
        {animal.notes.length + animal.revealNotes.length > 0 && (
          <>
            <h3 className={`${LABEL} mt-s`}>Field notes</h3>
            <ul className="m-0 list-disc pl-m text-s text-neutral-8">
              {[...animal.notes, ...animal.revealNotes].map((note, index) => <li key={index}>{note.full ?? note.text}</li>)}
            </ul>
          </>
        )}
        {trail.over && (
          <div className="mt-s rounded-s bg-color-3-transparent p-s text-s">
            <b className="font-medium">{trail.hearts > 0 ? 'Trail finished!' : 'Out of hearts: the trail is over.'}</b> You found {trail.finds} of {trail.rounds} animals. Score {session.score}.
          </div>
        )}
        <button type="button" onClick={onNext} className="btn btn-primary mt-s w-full">{trail.over ? 'New trail' : 'Next animal'}</button>
      </motion.section>
    </div>
  );
}

export function AnimalHowToPlay({ rules, seed, onClose }: { rules: AnimalRound['rules']; seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  const presence = useOverlayPresence();
  return (
    <div className="fixed inset-0 z-[8100] grid place-items-center p-m" {...presence} aria-labelledby="animal-how-title">
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative flex max-h-full w-full max-w-md flex-col gap-s overflow-y-auto rounded-m bg-neutral-1 p-l text-s text-neutral-10 shadow-m" {...dialogMotion}>
        <h2 id="animal-how-title" className="m-0 text-m font-medium">How to play</h2>
        <ol className="m-0 flex list-decimal flex-col gap-xs pl-l text-s text-neutral-8 [&_b]:font-medium [&_b]:text-neutral-10">
          <li>Our camera trap caught a blur. It was one of the <b>{rules.suspects} animals</b> on the board. Find out which.</li>
          <li>Swap gems to line up 3 or more. Each picture gem fills its <b>question</b> in the grid at the top. A full question answers it about the mystery: <b>yes</b> or <b>no</b>.</li>
          <li>Each animal&apos;s row shows its own answers. Compare them with the mystery&apos;s. Tap an animal (its row, or its numbered tile on the board) to pick it, then <b>Rule it out</b>.</li>
          <li>A ruled-out animal leaves the board when a gem next to it is cleared. Release every look-alike: the last one is your find. <b>Rule out the mystery and it escapes!</b></li>
          <li>Glowing purple <b>witness gems</b> give a note about the mystery and how many of the {rules.suspects} share it.</li>
          <li>{rules.moves} moves a round, {rules.trailRounds} rounds a trail, {rules.hearts} hearts. A lost round costs a heart.</li>
        </ol>
        <button type="button" onClick={onClose} className="btn btn-primary">Let&apos;s play</button>
        <p className="m-0 text-center text-xxs text-neutral-6">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
      </motion.div>
    </div>
  );
}
