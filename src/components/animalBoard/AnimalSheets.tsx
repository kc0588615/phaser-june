// The sheets over the animal board (plan 044): a suspect's field guide (with Rule
// out), the witness notes, the menu, out of moves (name it for the journal), the
// round's end (and the trail's, with the evidence grid replayed), and how to play.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BookOpen, CircleHelp, Globe2, Volume2, VolumeX } from 'lucide-react';
import type { AnimalRound, WitnessNote } from '@/clueGame/animalBoard';
import type { AnimalSession } from '@/clueGame/animalSession';
import { clueFace, signsOf } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import type { Animal } from '@/clueGame/questionMatch';
import { GlossaryText } from '@/components/clueGame/GlossaryText';
import { WithBlanks } from '@/components/clueGame/LogEntryText';
import { Sheet } from '@/components/clueGame/MatchSheets';
import { useEscapeKey } from '@/components/clueGame/useEscapeKey';
import { EvidenceGrid, SuspectPhoto } from './EvidenceGrid';

export const ANIMAL_HOW_TO_KEY = 'critter-connect:animal-board-how-to:v1';

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
        <button type="button" onClick={() => { onMark(!marked); onClose(); }} className={`h-12 flex-[2] rounded-xl text-sm font-bold active:scale-[.98] ${marked ? 'border border-white/25 text-mist' : 'bg-danger text-night'}`}>
          {marked ? 'Undo: not ruled out' : 'Rule out'}
        </button>
      ) : undefined}
    >
      <span className="mb-2 block h-36 w-full overflow-hidden rounded-xl bg-white/5"><SuspectPhoto species={species} size={330} /></span>
      {released && <p className="m-0 mb-2 text-sm font-semibold text-mist/70">Released: not the mystery.</p>}
      {marked && !released && <p className="m-0 mb-2 text-sm font-semibold text-danger">Ruled out: it leaves the board when a gem next to it is cleared. If it&apos;s the mystery, it escapes!</p>}
      <h3 className="m-0 text-[11px] font-bold uppercase tracking-[.12em] text-sage">Its answers</h3>
      <ul className="m-0 mb-2 list-none p-0">
        {round.orders.map(order => (
          <li key={order.tag} className="flex items-center gap-2 border-b border-white/5 py-1 text-[13px]">
            <span aria-hidden="true">{clueFace(order.tag)}</span>
            <span className="min-w-0 flex-1">{order.question}</span>
            <b className={order.row[index] ? 'text-leaf' : 'text-mist/55'}>{order.row[index] ? 'yes' : 'no'}</b>
          </li>
        ))}
      </ul>
      {signs.length > 0 && (
        <>
          <h3 className="m-0 text-[11px] font-bold uppercase tracking-[.12em] text-sage">Signs</h3>
          <p className="m-0 mb-2 mt-1 flex flex-wrap gap-1">
            {signs.map(sign => <span key={sign} className="rounded-full border border-white/15 bg-white/[.05] px-2 py-0.5 text-[12px]">{sign}</span>)}
          </p>
        </>
      )}
      {GUIDE.map(([key, label]) => animal.guide[key].length > 0 && (
        <section key={key} className="mb-2">
          <h3 className="m-0 text-[11px] font-bold uppercase tracking-[.12em] text-sage">{label}</h3>
          {animal.guide[key].map(line => <p key={line} className="m-0 mt-0.5 text-[13px] leading-snug text-mist/85"><GlossaryText text={line} /></p>)}
        </section>
      ))}
    </Sheet>
  );
}

function NoteText({ note, count }: { note: WitnessNote; count: number }) {
  return <><WithBlanks text={note.text} /> <span className="text-mist/60">The field guides of <b className="text-mist">{note.fits} of the {count}</b> say this too.</span></>;
}

export function NotesSheet({ round, onClose }: { round: AnimalRound; onClose: () => void }) {
  return (
    <Sheet title="📓 Witness notes" onClose={onClose}>
      {round.notes.length === 0 && <p className="m-0 text-sm text-mist/70">Match next to a glowing purple witness gem to get a note about the mystery: something it does or has, and how many of the five animals share it.</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {round.notes.map((note, index) => <li key={index} className="rounded-lg border border-notes/30 bg-notes/10 p-2 text-[13px] leading-snug"><NoteText note={note} count={round.suspects.length} /></li>)}
      </ul>
    </Sheet>
  );
}

const MENU_ROW = 'flex h-12 w-full items-center gap-3 rounded-xl border border-white/15 px-3 text-left text-sm font-semibold text-mist active:bg-white/10';

/** The menu behind the grid's corner button: the place and trail, then the globe, the journal, how to play and sound. */
export function GameMenu({ title, detail, soundOn, onSound, onJournal, onHelp, onClose }: {
  title: string; detail: string; soundOn: boolean; onSound: () => void; onJournal: () => void; onHelp: () => void; onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="m-0 mb-3 text-sm text-sage">{detail}</p>
      <div className="flex flex-col gap-2 pb-1">
        <Link href="/" className={MENU_ROW}><Globe2 className="h-5 w-5 text-sage" aria-hidden="true" />Back to the globe</Link>
        <button type="button" onClick={onJournal} className={MENU_ROW} aria-label="Field journal"><BookOpen className="h-5 w-5 text-sage" aria-hidden="true" />Field journal</button>
        <button type="button" onClick={onHelp} className={MENU_ROW}><CircleHelp className="h-5 w-5 text-sage" aria-hidden="true" />How to play</button>
        <button type="button" onClick={onSound} className={MENU_ROW} aria-pressed={soundOn} aria-label={soundOn ? 'Sound on. Turn it off' : 'Sound off. Turn it on'}>
          {soundOn ? <Volume2 className="h-5 w-5 text-sage" aria-hidden="true" /> : <VolumeX className="h-5 w-5 text-sage" aria-hidden="true" />}
          Sound: {soundOn ? 'on' : 'off'}
        </button>
      </div>
    </Sheet>
  );
}

export function OutOfMovesSheet({ round, nameOf, onName }: { round: AnimalRound; nameOf: (id: number) => string; onName: (id: number | null) => void }) {
  const left = round.suspects.filter(id => !round.released.includes(id));
  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Out of moves">
      <div className="cm-pop-in w-full max-w-md rounded-t-2xl border border-white/15 bg-surface p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-mist">
        <h2 className="m-0 font-display text-lg font-bold">Out of moves!</h2>
        <p className="m-0 mt-1 text-[13px] text-mist/75">The round is lost, and so is a heart. Which one was it? A right name still goes in your journal.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {left.map(id => <button key={id} type="button" onClick={() => onName(id)} className="min-h-12 rounded-xl border border-white/20 bg-white/[.06] px-2 text-sm font-semibold active:bg-white/15">{nameOf(id)}</button>)}
        </div>
        <button type="button" onClick={() => onName(null)} className="mt-2 h-11 w-full rounded-xl text-sm text-mist/70">Skip</button>
      </div>
    </div>
  );
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function RoundEndSheet({ session, animal, species, speciesById, nameOf, onNext }: {
  session: AnimalSession; animal: Animal; species: PoolSpecies | undefined; speciesById: Map<number, PoolSpecies>; nameOf: (id: number) => string; onNext: () => void;
}) {
  const { round, end, trail } = session;
  if (!end) return null;
  const tree = animal.familyTree;
  const headline: ReactNode = end.outcome === 'found'
    ? <>Found it: the {animal.name}! <span className="text-ochre">{stars(end.stars)}</span></>
    : end.lostBy === 'escaped' ? <>Oh no! The {animal.name} was the mystery. It escaped!</> : <>Out of moves. It was the {animal.name}.</>;
  return (
    <div className="fixed inset-0 z-[8300] flex items-end justify-center bg-black/70" role="dialog" aria-modal="true" aria-label={`It was the ${animal.name}`}>
      <section className="cm-pop-in flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl border border-white/15 bg-surface p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-mist" aria-label={`It was the ${animal.name}`}>
        <span className="mb-2 block h-44 w-full shrink-0 overflow-hidden rounded-xl bg-white/5"><SuspectPhoto species={species} size={500} /></span>
        <h2 className="m-0 font-display text-lg font-bold leading-tight">{headline}</h2>
        <p className="m-0 mt-1 text-[13px] text-mist/75">
          {end.outcome === 'found' ? `+${end.points} points · ${round.movesLeft} moves to spare` : 'A heart lost.'}
          {round.named && ` You named the ${nameOf(round.named.id)}: ${round.named.correct ? 'right! It goes in your journal.' : 'not this time.'}`}
        </p>
        <h3 className="m-0 mt-3 text-[11px] font-bold uppercase tracking-[.12em] text-sage">How the evidence lined up</h3>
        <div className="-mx-1 mt-1 shrink-0">
          <EvidenceGrid round={round} speciesById={speciesById} shown={round.orders.map(order => order.have)} review />
        </div>
        <p className="m-0 mt-1 text-[13px] text-mist/75">
          {round.orders.some(order => order.answer)
            ? <>A <span className="rounded bg-danger/25 px-1 shadow-[inset_0_0_0_1.5px_rgb(208_122_110/.8)]">red</span> answer doesn&apos;t match the mystery&apos;s, so it rules that animal out.</>
            : 'No question was answered this time.'}
        </p>
        <p className="m-0 mt-2 text-[12px] italic text-mist/70">{animal.scientificName}</p>
        <p className="m-0 text-[12px] text-mist/70">Animalia › Chordata › {tree.class.latin} › {tree.order.latin} › {tree.family.latin} › {tree.genus}</p>
        {animal.notes.length + animal.revealNotes.length > 0 && (
          <>
            <h3 className="m-0 mt-3 text-[11px] font-bold uppercase tracking-[.12em] text-sage">Field notes</h3>
            <ul className="m-0 list-disc pl-4 text-[13px] leading-snug text-mist/85">
              {[...animal.notes, ...animal.revealNotes].map((note, index) => <li key={index}>{note.full ?? note.text}</li>)}
            </ul>
          </>
        )}
        {trail.over && (
          <div className="mt-3 rounded-xl border border-ochre/40 bg-ochre/15 p-3 text-sm">
            <b>{trail.hearts > 0 ? 'Trail finished!' : 'Out of hearts: the trail is over.'}</b> You found {trail.finds} of {trail.rounds} animals. Score {session.score}.
          </div>
        )}
        <button type="button" onClick={onNext} className="mt-3 h-12 w-full rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">{trail.over ? 'New trail' : 'Next animal'}</button>
      </section>
    </div>
  );
}

export function AnimalHowToPlay({ rules, seed, onClose }: { rules: AnimalRound['rules']; seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  return (
    <div className="fixed inset-0 z-[8100] grid place-items-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-labelledby="animal-how-title">
      <div className="cm-pop-in flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface p-4 text-mist shadow-2xl">
        <h2 id="animal-how-title" className="m-0 font-display text-lg font-bold">How to play</h2>
        <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-snug text-mist/90">
          <li>Our camera trap caught a blur. It was one of the <b>{rules.suspects} animals</b> on the board. Find out which.</li>
          <li>Swap gems to line up 3 or more. Each picture gem fills its <b>question</b> in the grid at the top. A full question answers it about the mystery: <b>yes</b> or <b>no</b>.</li>
          <li>Each animal&apos;s row shows its own answers. Compare them with the mystery&apos;s. Tap an animal (its row, or its numbered tile on the board) to pick it, then <b>Rule it out</b>.</li>
          <li>A ruled-out animal leaves the board when a gem next to it is cleared. Release every look-alike: the last one is your find. <b>Rule out the mystery and it escapes!</b></li>
          <li>Glowing purple <b>witness gems</b> give a note about the mystery and how many of the {rules.suspects} share it.</li>
          <li>{rules.moves} moves a round, {rules.trailRounds} rounds a trail, {rules.hearts} hearts. A lost round costs a heart.</li>
        </ol>
        <button type="button" onClick={onClose} className="h-12 rounded-xl bg-action text-sm font-bold text-mist active:scale-[.98]">Let&apos;s play</button>
        <p className="m-0 text-center text-[10px] text-mist/35">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
      </div>
    </div>
  );
}
