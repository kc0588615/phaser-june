// The sheets over the animal board (plan 044): a suspect's field guide (with Rule
// out), the witness notes, the menu, out of moves (name it for the journal), the
// round's end (and the trail's, with the evidence grid replayed), and how to play.
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowUpRight, Ban, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Gem, Globe2, HeartCrack, ListTree, NotebookPen } from 'lucide-react';
import { motion } from 'motion/react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import type { AnimalSession } from '@/clueGame/animalSession';
import { clueFace, signsOf } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { prefixOf, type Animal } from '@/clueGame/questionMatch';
import { GlossaryText } from '@/components/clueGame/GlossaryText';
import { WithBlanks } from '@/components/clueGame/LogEntryText';
import { Sheet } from '@/components/clueGame/Sheet';
import { PhotoCredit } from '@/components/clueGame/SpeciesPortrait';
import { useEscapeKey } from '@/components/clueGame/useEscapeKey';
import { backdropMotion, dialogMotion, drawerUpMotion, SMALL, useOverlayPresence } from '@/lib/motion';
import { currentTheme, setTheme } from '@/lib/theme';
import { SuspectPhoto } from './AnimalCard';
import { EvidenceGrid } from './EvidenceGrid';

export const ANIMAL_HOW_TO_KEY = 'critter-connect:animal-board-how-to:v2';

/** A section label inside a sheet (cc Menu label: XS, medium). */
const LABEL = 'm-0 text-xs font-medium uppercase text-neutral-7';
/** A small square holding an animal's number this round, or a question's emoji. */
const TILE = 'grid shrink-0 place-items-center rounded-xs bg-neutral-3';
/** A one-line notice in a sheet: ruled out, released, a lost heart. */
const NOTICE = 'm-0 flex items-start gap-xs rounded-s px-s py-xs text-s';
const ROW_LINE = 'shadow-[inset_0_-1px_0_0_var(--neutral-4)]';

const GUIDE: Array<[keyof Animal['guide'], string]> = [['body', 'Body'], ['habits', 'Habits'], ['habitat', 'Habitat'], ['range', 'Range'], ['life', 'Life cycle']];

/** Horizontal travel (px) that counts as a swipe on the field guide's photo. */
const SWIPE = 40;

export function SuspectSheet({ animal, species, round, top, pencil, onPencil, onMark, onStep, onClose }: {
  animal: Animal; species: PoolSpecies | undefined; round: AnimalRound;
  /** The board's top edge (px from the viewport top): the drawer reaches up to it. */
  top: number;
  pencil: Readonly<Record<string, 'yes' | 'no'>>;
  /** Pencil a guess for a hidden answer (null clears it), right here while reading the guide. */
  onPencil: (tag: string, value: 'yes' | 'no' | null) => void;
  onMark: (ruledOut: boolean) => void;
  /** Flip to the next (1) or previous (-1) animal, wrapping 5 -> 1: arrows beside the name, or a swipe on the photo. */
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
}) {
  const index = round.suspects.indexOf(animal.id);
  // The new photo slides in from the side it was flipped toward.
  const [dir, setDir] = useState<1 | -1>(1);
  const step = (by: 1 | -1) => { setDir(by); onStep(by); };
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // Plan 045: while playing, the guide keeps quiet about the round's questions (scouting shows those answers).
  const asked = new Set(round.status === 'playing' ? round.orders.map(order => prefixOf(order.tag)) : []);
  const released = round.released.includes(animal.id);
  const marked = round.marked.includes(animal.id);
  const signs = signsOf(animal.tags);
  const canMark = round.status === 'playing' && !released;
  const isSeen = (i: number) => round.orders[i].seen[index] || round.status !== 'playing';
  const guides = GUIDE.flatMap(([key, label]) => {
    const lines = animal.guide[key].filter(line => !line.tags.some(tag => asked.has(prefixOf(tag))));
    return lines.length > 0 ? [{ key, label, lines }] : [];
  });
  return (
    <Sheet
      title={<><span className={`${TILE} h-6 w-6 font-data text-s`} aria-hidden="true">{index + 1}</span>{animal.name}</>}
      center
      before={<button type="button" onClick={() => step(-1)} className="btn btn-ghost btn-icon shrink-0" aria-label="Previous animal"><ChevronLeft className="h-5 w-5" /></button>}
      after={<button type="button" onClick={() => step(1)} className="btn btn-ghost btn-icon shrink-0" aria-label="Next animal"><ChevronRight className="h-5 w-5" /></button>}
      detail={(
        <span className="flex gap-xxs" aria-label={`Animal ${index + 1} of ${round.suspects.length}`} role="img">
          {round.suspects.map((id, i) => <span key={id} className={`h-1.5 rounded-full ${i === index ? 'w-4 bg-neutral-10' : 'w-1.5 bg-neutral-4'}`} />)}
        </span>
      )}
      onClose={onClose}
      modeless
      top={top}
      footer={canMark ? (
        <button type="button" onClick={() => { onMark(!marked); onClose(); }} className={`btn flex-1 ${marked ? 'btn-outline' : 'btn-danger'}`}>
          {!marked && <Ban className="h-5 w-5" aria-hidden="true" />}
          {marked ? 'Undo: not ruled out' : 'Rule out'}
        </button>
      ) : undefined}
    >
      {marked && !released && (
        <p className={`${NOTICE} mb-s bg-error-transparent`} role="status">
          <Ban className="mt-xxs h-4 w-4 shrink-0 text-error" aria-hidden="true" />
          <span><b className="font-medium">Ruled out:</b> it wanders a step toward the edge each move, or leaves at once when a gem next to it is cleared. If it&apos;s the mystery, it escapes! Bring it back to stop it.</span>
        </p>
      )}
      {released && (
        <p className={`${NOTICE} mb-s bg-neutral-3`} role="status">
          <ArrowUpRight className="mt-xxs h-4 w-4 shrink-0 text-neutral-7" aria-hidden="true" />
          <span><b className="font-medium">Released:</b> not the mystery.</span>
        </p>
      )}
      <div className="flex gap-s">
        <figure className="m-0 flex w-36 shrink-0 flex-col gap-xxs">
          <span
            className="block aspect-[4/3] touch-pan-y select-none overflow-hidden rounded-xs bg-neutral-3"
            onPointerDown={event => { swipe.current = { x: event.clientX, y: event.clientY }; }}
            onPointerUp={event => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = event.clientX - start.x;
              if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(event.clientY - start.y)) step(dx < 0 ? 1 : -1);
            }}
            onPointerCancel={() => { swipe.current = null; }}
          >
            <motion.span key={animal.id} className={`block h-full w-full ${marked || released ? 'grayscale' : ''}`} initial={{ opacity: 0, x: dir * 32 }} animate={{ opacity: 1, x: 0 }} transition={SMALL}>
              <SuspectPhoto species={species} size={330} />
            </motion.span>
          </span>
          {species?.photo && <figcaption className="truncate text-xxs"><PhotoCredit photo={species.photo} /></figcaption>}
        </figure>
        {signs.length > 0 && (
          <div className="flex min-w-0 flex-col gap-xxs">
            <h3 className={LABEL}>Signs</h3>
            <ul className="m-0 flex list-none flex-wrap gap-xxs p-0">
              {signs.map(sign => <li key={sign} className="rounded-xs bg-neutral-3 px-xs py-xxs text-xs font-medium text-neutral-8">{sign}</li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-m flex items-baseline justify-between gap-xs">
        <h3 className={LABEL}>Its answers</h3>
        {round.orders.some((_, i) => !isSeen(i)) && <span className="text-xxs text-neutral-7">Pencil a guess where you haven&apos;t scouted</span>}
      </div>
      <ul className="m-0 mb-m list-none p-0">
        {round.orders.map((order, i) => {
          const guess = pencil[`${animal.id}:${order.tag}`];
          const yes = order.row[index];
          return (
            <li key={order.tag} className={`flex min-h-12 items-center gap-s py-xxs ${ROW_LINE}`}>
              <span className={`${TILE} h-8 w-8 text-m`} aria-hidden="true">{clueFace(order.tag)}</span>
              <span className="min-w-0 flex-1 text-s text-neutral-8">{order.question}</span>
              {isSeen(i) ? (
                <b className={`flex w-20 shrink-0 -rotate-2 justify-center rounded-xs py-xxs text-s font-heavy uppercase ${yes ? 'bg-color-1-transparent text-color-1 shadow-[inset_0_0_0_2px_var(--color-1)]' : 'bg-neutral-3 text-neutral-7 shadow-[inset_0_0_0_2px_var(--neutral-5)]'}`}>
                  {yes ? 'yes' : 'no'}
                </b>
              ) : (
                <span className="grid w-20 shrink-0 grid-cols-2 gap-xxs" role="group" aria-label={`${order.question} Not scouted`}>
                  {(['yes', 'no'] as const).map(value => (
                    <button
                      key={value}
                      type="button"
                      data-pencil-guide={value}
                      aria-pressed={guess === value}
                      aria-label={`${order.question} Pencil ${value}`}
                      onClick={() => onPencil(order.tag, guess === value ? null : value)}
                      className={`pencil-mark h-9 rounded-xs text-m outline-dashed outline-1 -outline-offset-1 ${guess === value ? 'bg-neutral-4 text-neutral-10 outline-neutral-7' : 'text-neutral-7 outline-neutral-5'}`}
                    >
                      {value}
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {guides.length > 0 && (
        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-s gap-y-xs">
          {guides.map(({ key, label, lines }) => (
            <div key={key} className="contents">
              <dt className={`${LABEL} pt-xxs`}>{label}</dt>
              <dd className="m-0 flex flex-col gap-xxs text-s text-neutral-8">
                {lines.map(line => <span key={line.text}><GlossaryText text={line.text} /></span>)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Sheet>
  );
}

export function NotesSheet({ round, onClose }: { round: AnimalRound; onClose: () => void }) {
  return (
    <Sheet
      title={<>Witness notes <span className="font-data text-neutral-7">{round.notes.length}</span></>}
      before={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-notes/15 text-notes" aria-hidden="true"><NotebookPen className="h-5 w-5" /></span>}
      detail={<p className="m-0 text-xs text-neutral-7">What witnesses saw the mystery do or have</p>}
      onClose={onClose}
    >
      <NotesList round={round} />
    </Sheet>
  );
}

/** The round's witness notes (or how to get one). In a drawer on phones, beside the board on desktop. */
export function NotesList({ round }: { round: AnimalRound }) {
  const count = round.suspects.length;
  if (round.notes.length === 0) {
    return (
      <p className="m-0 flex items-start gap-s rounded-s p-m text-s text-neutral-8 outline-dashed outline-1 -outline-offset-1 outline-neutral-5">
        <Gem className="h-6 w-6 shrink-0 text-notes" aria-hidden="true" />
        <span>Match next to a glowing <b className="font-medium text-neutral-10">purple witness gem</b> to get a note about the mystery: something it does or has, and how many of the {count} animals share it.</span>
      </p>
    );
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-xs p-0">
      {round.notes.map((note, index) => (
        <li key={index} className="flex flex-col gap-xs rounded-s bg-notes/15 p-s">
          <p className="m-0 text-m"><WithBlanks text={note.text} /></p>
          <p className="m-0 flex items-center gap-xs text-xs text-neutral-7">
            <span className="flex gap-xxs" aria-hidden="true">
              {Array.from({ length: count }, (_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < note.fits ? 'bg-notes' : 'bg-notes/25'}`} />)}
            </span>
            <span><b className="font-data font-medium text-neutral-10">{note.fits} of {count}</b> field guides say this too</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/** A grouped list of rows, cc Menu style: one surface, rows split by a line. */
const GROUP = 'm-0 flex list-none flex-col overflow-hidden rounded-s bg-neutral-3 p-0';
const MENU_ROW = 'flex min-h-13 w-full items-center gap-s px-s text-left text-m font-medium text-neutral-10 no-underline hover:bg-neutral-4 focus-visible:-outline-offset-2 [li:not(:last-child)>&]:shadow-[inset_0_-1px_0_0_var(--neutral-4)]';

function MenuLink({ icon, children, ...action }: { icon: ReactNode; children: ReactNode } & ({ href: string } | { onClick: () => void })) {
  const inner = <>{icon}<span className="flex-1">{children}</span><ChevronRight className="h-5 w-5 text-neutral-6" aria-hidden="true" /></>;
  return <li>{'href' in action ? <Link href={action.href} className={MENU_ROW}>{inner}</Link> : <button type="button" onClick={action.onClick} className={MENU_ROW}>{inner}</button>}</li>;
}

/** cc Switch: a row that flips a setting. */
function SwitchRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <button type="button" role="switch" aria-checked={on} onClick={onToggle} className={MENU_ROW}>
        <span className="flex-1">{label}</span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-color-1' : 'bg-neutral-5'}`} aria-hidden="true">
          <span className={`absolute top-xxs h-5 w-5 rounded-full bg-neutral-1 transition-[left] ${on ? 'left-6' : 'left-xxs'}`} />
        </span>
      </button>
    </li>
  );
}

/** The menu behind the grid's corner button: the place and trail, then the globe, the journal, how to play, sound and dark mode. */
export function GameMenu({ title, stats, soundOn, onSound, onJournal, onHelp, onClose }: {
  title: string;
  /** Where the trail stands ([label, value]); null while loading. */
  stats: Array<[string, string | number]> | null;
  soundOn: boolean; onSound: () => void; onJournal: () => void; onHelp: () => void; onClose: () => void;
}) {
  // The menu only mounts after a tap, so reading <html> here can't mismatch the server render.
  const [dark, setDark] = useState(() => currentTheme() === 'dark');
  const toggleDark = () => { setTheme(dark ? 'light' : 'dark'); setDark(!dark); };
  // Full screen hides the browser's bars so the board can grow (the layout follows the screen). iPhones can't.
  const canFull = document.fullscreenEnabled;
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFull = () => { (full ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); };
  const icon = 'h-5 w-5 shrink-0 text-color-1';
  return (
    <Sheet
      title={title}
      detail={stats ? (
        <p className="m-0 flex flex-wrap gap-xxs">
          {stats.map(([label, value]) => <span key={label} className="rounded-xs bg-neutral-3 px-xs py-xxs text-xs text-neutral-8">{label} <b className="font-data font-medium text-neutral-10">{value}</b></span>)}
        </p>
      ) : <p className="m-0 text-xs text-neutral-7">Loading animals…</p>}
      onClose={onClose}
    >
      <nav aria-label="Go to">
        <ul className={GROUP}>
          <MenuLink href="/" icon={<Globe2 className={icon} aria-hidden="true" />}>Back to the globe</MenuLink>
          <MenuLink onClick={onJournal} icon={<BookOpen className={icon} aria-hidden="true" />}>Field journal</MenuLink>
          <MenuLink onClick={onHelp} icon={<CircleHelp className={icon} aria-hidden="true" />}>How to play</MenuLink>
        </ul>
      </nav>
      <ul className={`${GROUP} mt-s`} aria-label="Settings">
        <SwitchRow label="Sound" on={soundOn} onToggle={onSound} />
        <SwitchRow label="Dark mode" on={dark} onToggle={toggleDark} />
        {canFull && <SwitchRow label="Full screen" on={full} onToggle={toggleFull} />}
      </ul>
    </Sheet>
  );
}

export function OutOfMovesSheet({ round, nameOf, onName }: { round: AnimalRound; nameOf: (id: number) => string; onName: (id: number | null) => void }) {
  const left = round.suspects.filter(id => !round.released.includes(id));
  const presence = useOverlayPresence();
  return (
    <div className="fixed inset-0 z-[8200] flex items-end justify-center" {...presence} aria-label="Out of moves">
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-m bg-neutral-1 p-l pb-[max(var(--space-l),env(safe-area-inset-bottom))] text-s text-neutral-10 shadow-m" {...drawerUpMotion}>
        <div className="flex items-start gap-s">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-s bg-error-transparent text-error" aria-hidden="true"><HeartCrack className="h-6 w-6" /></span>
          <div>
            <h2 className="m-0 text-m font-medium">Out of moves!</h2>
            <p className="m-0 mt-xxs text-s text-neutral-7">The round is lost, and so is a heart. <b className="font-medium text-neutral-10">Which one was it?</b> A right name still goes in your journal.</p>
          </div>
        </div>
        <ul className="m-0 mt-m flex list-none flex-col gap-xs p-0" aria-label="Animals still on the board">
          {left.map(id => (
            <li key={id}>
              <button type="button" onClick={() => onName(id)} className="flex min-h-14 w-full items-center gap-s rounded-s bg-neutral-3 px-s text-left text-m font-medium text-neutral-10 hover:bg-neutral-4">
                <span className={`${TILE} h-7 w-7 bg-neutral-1 font-data text-s`} aria-hidden="true">{round.suspects.indexOf(id) + 1}</span>
                <span className="flex-1">{nameOf(id)}</span>
                <ChevronRight className="h-5 w-5 text-neutral-6" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => onName(null)} className="btn btn-ghost mx-auto mt-xs flex">Skip</button>
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
  const [tab, setTab] = useState<'evidence' | 'notes'>('evidence');
  if (!end) return null;
  const tree = animal.familyTree;
  const found = end.outcome === 'found';
  // The player's pencilled guesses, each right or wrong (scouted or not).
  const guesses = round.suspects.flatMap((id, i) => round.orders.flatMap(order => {
    const guess = session.pencil[`${id}:${order.tag}`];
    return guess ? [(guess === 'yes') === order.row[i]] : [];
  }));
  const called = guesses.filter(Boolean).length;
  const [kicker, lead] = found ? ['Found it!', null] : end.lostBy === 'escaped' ? ['It escaped!', 'Oh no! The mystery was the'] : ['Out of moves', 'It was the'];
  const notes = [...animal.notes, ...animal.revealNotes];
  const tabs: Array<['evidence' | 'notes', ReactNode]> = [['evidence', 'The evidence'], ['notes', <>Field notes <span className="rounded-full bg-color-1-transparent px-xs font-data text-xs">{notes.length}</span></>]];
  const shown = notes.length > 0 ? tab : 'evidence';
  // Two tabs, so either arrow moves to the other one (roving focus).
  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const other = shown === 'evidence' ? 'notes' : 'evidence';
    setTab(other);
    document.getElementById(`end-tab-${other}`)?.focus();
  };
  return (
    <div className="fixed inset-0 z-[8300] flex items-end justify-center" {...presence} aria-label={`It was the ${animal.name}`}>
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.section className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-m bg-neutral-1 text-s text-neutral-10 shadow-m" aria-label={`It was the ${animal.name}`} {...drawerUpMotion}>
        <div className="flex shrink-0 flex-col gap-s px-l pt-l">
          <div className="flex items-center gap-s">
            <span className="block aspect-[4/3] w-32 shrink-0 overflow-hidden rounded-xs bg-neutral-3"><SuspectPhoto species={species} size={330} /></span>
            <div className="flex min-w-0 flex-col gap-xxs">
              <p className="m-0 flex items-center gap-xs">
                <span className={`text-xs font-heavy uppercase ${found ? 'text-color-1' : 'text-error'}`}>{kicker}</span>
                {found && <span className="rounded-xs bg-emphasis-icon px-xxs text-xs text-on-emphasis-icon" role="img" aria-label={`${end.stars} of 3 stars`}>{stars(end.stars)}</span>}
              </p>
              {lead && <p className="m-0 text-xs text-neutral-7">{lead}</p>}
              <h2 className="m-0 text-l font-heavy [text-wrap:balance]">{animal.name}</h2>
              <p className="m-0 text-s italic text-neutral-7">{animal.scientificName}</p>
            </div>
          </div>
          <p className="m-0 flex items-center gap-xs text-xs text-neutral-7">
            <ListTree className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Animalia › Chordata › {tree.class.latin} › {tree.order.latin} › {tree.family.latin} › <span className="text-neutral-10">{tree.genus}</span></span>
          </p>
          <dl className="m-0 grid auto-cols-fr grid-flow-col gap-px overflow-hidden rounded-s bg-neutral-4">
            <Stat label="points" value={`+${end.points}`} />
            {found && <Stat label="moves to spare" value={round.movesLeft} />}
            {guesses.length > 0 && <Stat label="guesses right" value={`${called}/${guesses.length}`} data-guesses={`${called}/${guesses.length}`} />}
          </dl>
          {!found && (
            <p className={`${NOTICE} bg-error-transparent`}>
              <HeartCrack className="mt-xxs h-4 w-4 shrink-0 text-error" aria-hidden="true" />
              <span>You lost a heart.{round.named && ` You named the ${nameOf(round.named.id)}: ${round.named.correct ? 'right! It goes in your journal.' : 'not this time.'}`}</span>
            </p>
          )}
          {notes.length > 0 && (
            <div role="tablist" aria-label="Round details" className="grid grid-cols-2 gap-xxs rounded-m bg-neutral-3 p-xxs">
              {tabs.map(([key, label]) => (
                <button key={key} type="button" role="tab" id={`end-tab-${key}`} aria-selected={shown === key} aria-controls="end-panel" tabIndex={shown === key ? 0 : -1} onClick={() => setTab(key)} onKeyDown={tabKeys} className={`flex items-center justify-center gap-xs rounded-s px-s py-xs text-s font-medium ${shown === key ? 'bg-neutral-1 text-neutral-10' : 'text-neutral-7 hover:text-neutral-10'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div id="end-panel" role={notes.length > 0 ? 'tabpanel' : undefined} aria-labelledby={notes.length > 0 ? `end-tab-${shown}` : undefined} tabIndex={notes.length > 0 ? 0 : undefined} className="min-h-40 flex-1 overflow-y-auto overscroll-contain px-l py-s">
          {shown === 'evidence' ? (
            <>
              {/* Compact rows here; the game screen's grow with the phone (globals.css `--ev-row`). */}
              <div className="-mx-xxs [--ev-photo:30px] [--ev-row:34px]">
                <EvidenceGrid round={round} speciesById={speciesById} shown={round.orders.map(order => order.have)} pencil={session.pencil} review />
              </div>
              <ul className="m-0 mt-xs flex list-none flex-col gap-xxs p-0 text-xs text-neutral-7">
                {round.orders.some(order => order.answer) ? (
                  <li className="flex items-center gap-xs">
                    <span className="h-3.5 w-5 shrink-0 rounded-xs bg-error-transparent shadow-[inset_0_0_0_1.5px_var(--error)]" aria-hidden="true" />
                    A red answer doesn&apos;t match the mystery&apos;s, so it rules that animal out.
                  </li>
                ) : <li>No question was answered this time.</li>}
                {called < guesses.length && (
                  <li className="flex items-center gap-xs">
                    <span className="ev-missed grid w-5 shrink-0 place-items-center" aria-hidden="true">✓</span>
                    A crossed-out mark was a wrong guess.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-xs p-0">
              {notes.map((note, index) => (
                <li key={index} className="flex gap-xs text-s text-neutral-8">
                  <span className="mt-xs h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-5" aria-hidden="true" />
                  <span>{note.full ?? note.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-s px-l pb-[max(var(--space-l),env(safe-area-inset-bottom))] pt-s shadow-[inset_0_1px_0_0_var(--neutral-4)]">
          {trail.over && (
            <div className="flex items-center justify-between gap-s rounded-s bg-color-3-transparent px-s py-xs">
              <div className="flex flex-col">
                <b className="text-s font-medium">{trail.hearts > 0 ? 'Trail finished!' : 'Out of hearts: the trail is over.'}</b>
                <span className="text-xs text-neutral-7">Trail {session.trailNo} total</span>
              </div>
              <dl className="m-0 flex gap-m text-center">
                <Stat label="finds" value={`${trail.finds}/${trail.rounds}`} plain />
                <Stat label="score" value={session.score} plain />
              </dl>
            </div>
          )}
          <button type="button" onClick={onNext} className="btn btn-primary w-full">{trail.over ? 'New trail' : 'Next animal'}</button>
        </div>
      </motion.section>
    </div>
  );
}

/** A number over its label (round end). `plain`: no cell of its own. */
function Stat({ label, value, plain = false, ...rest }: { label: string; value: ReactNode; plain?: boolean; 'data-guesses'?: string }) {
  return (
    <div className={`flex flex-col ${plain ? '' : 'bg-neutral-3 px-s py-xs'}`} {...rest}>
      <dt className="text-xs text-neutral-7">{label}</dt>
      <dd className={`order-first m-0 font-data font-heavy ${plain ? 'text-m' : 'text-l'}`}>{value}</dd>
    </div>
  );
}

export function AnimalHowToPlay({ rules, seed, onClose }: { rules: AnimalRound['rules']; seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  const presence = useOverlayPresence();
  const steps: ReactNode[] = [
    <>Our camera trap caught a blur. It was one of the <b>{rules.suspects} animals</b> on the board. Find out which.</>,
    <>Swap gems to line up 3 or more. Each picture gem fills its <b>question</b> in the grid at the top. A full question answers it about the mystery: <b>yes</b> or <b>no</b>.</>,
    <>Each animal&apos;s own answers start hidden. <b>Scout</b> them: clear a gem next to an animal&apos;s card and its answer to that gem&apos;s question shows. Know it already? Tap a <b>?</b> to pencil your guess, then scout it to see if you called it. Hold any answer to <b>highlight</b> it: its gem glows up top, so you remember which gem to go for. Hold an animal&apos;s picture to open its <b>field guide</b>, and pencil there as you read.</>,
    <>Compare each animal&apos;s answers with the mystery&apos;s. To <b>rule an animal out</b>, drag its photo in the grid to the right, across its name (drag again to bring it back).</>,
    <>A ruled-out animal <b>wanders</b> a step toward the edge after each move and leaves the board there (bring it back to stop it). Clear a gem next to it to release it now: your own match leaves a <b>line gem</b> in its place. Release every look-alike: the last one is your find. <b>Rule out the mystery and it escapes!</b></>,
    <>Glowing purple <b>witness gems</b> give a note about the mystery and how many of the {rules.suspects} share it.</>,
    <>{rules.moves} moves a round, {rules.trailRounds} rounds a trail, {rules.hearts} hearts. A lost round costs a heart.</>,
  ];
  return (
    <div className="fixed inset-0 z-[8100] grid place-items-center p-m" {...presence} aria-labelledby="animal-how-title">
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.div className="relative flex max-h-full w-full max-w-md flex-col gap-m overflow-y-auto rounded-m bg-neutral-1 p-l text-s text-neutral-10 shadow-m" {...dialogMotion}>
        <h2 id="animal-how-title" className="m-0 text-m font-medium">How to play</h2>
        <ol className="m-0 flex list-none flex-col gap-s p-0 text-s text-neutral-8 [&_b]:font-medium [&_b]:text-neutral-10">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-s">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-color-1-transparent font-data text-xs font-medium text-neutral-10" aria-hidden="true">{i + 1}</span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-xs">
          <button type="button" onClick={onClose} className="btn btn-primary">Let&apos;s play</button>
          <p className="m-0 text-center text-xxs text-neutral-6">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
        </div>
      </motion.div>
    </div>
  );
}
