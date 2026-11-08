// The sheets over the animal board (plan 044): a suspect's field guide (with Rule
// out, and plan 053's one name), the witness notes, the menu, out of moves (a last name), the
// round's end over the board (and the trail's; the grid above replays the evidence, plan 052), and how to play (with a worked
// comparison on made-up answers, never the live round's). Players see the mystery as "the one caught on camera".
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Ban, BookOpen, Camera, ChevronLeft, ChevronRight, CircleHelp, Gem, Globe2, HeartCrack, ListTree, NotebookPen } from 'lucide-react';
import { animate, motion, useIsPresent, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react';
import { PENCIL_POINTS, sharpEye, type AnimalRound } from '@/clueGame/animalBoard';
import type { AnimalSession } from '@/clueGame/animalSession';
import { clueFace } from '@/clueGame/clueFaces';
import type { CluePool, PoolSpecies } from '@/clueGame/pool';
import { CATEGORY_LABELS, CHARGE_CATEGORIES, categoryOf, prefixOf, type Animal } from '@/clueGame/questionMatch';
import { noteCategories } from '@/clueGame/signs';
import { FactsWithSources } from '@/components/clueGame/FactsWithSources';
import { GlossaryText } from '@/components/clueGame/GlossaryText';
import { WithBlanks } from '@/components/clueGame/WithBlanks';
import { Sheet } from '@/components/clueGame/Sheet';
import { PhotoCredit } from '@/components/clueGame/SpeciesPortrait';
import { useEscapeKey } from '@/components/clueGame/useEscapeKey';
import { backdropMotion, dialogMotion, drawerUpMotion, SMALL, useOverlayPresence } from '@/lib/motion';
import { currentTheme, setTheme } from '@/lib/theme';
import { SuspectPhoto, TrapCard } from './AnimalCard';
import { CategoryMark } from './CategoryMark';

export const ANIMAL_HOW_TO_KEY = 'critter-connect:animal-board-how-to:v5';

/** A section label inside a sheet (cc Menu label: XS, medium). */
const LABEL = 'm-0 text-xs font-medium uppercase text-neutral-7';
/** The small category word under an answer or a witness note (plan 055). */
const MARK_CAPTION = 'text-xxs font-medium uppercase text-neutral-7';
/** A small square holding an animal's number this round, or a question's emoji. */
const TILE = 'grid shrink-0 place-items-center rounded-xs bg-neutral-3';
/** A one-line notice in a sheet: ruled out, released, a lost heart. */
const NOTICE = 'm-0 flex items-start gap-xs rounded-s px-s py-xs text-s';
const ROW_LINE = 'shadow-[inset_0_-1px_0_0_var(--neutral-4)]';

/** Horizontal travel (px) that counts as a swipe on the field guide's title row. */
const SWIPE = 40;
/** Set once the field guide has nudged sideways, to show it swipes (plan 048). */
const GUIDE_SWIPE_HINT_KEY = 'critter-connect:guide-swipe-hint:v1';
const CHIP = 'rounded-xs bg-neutral-3 px-xs text-xs font-medium text-neutral-8';

export function SuspectSheet({ animal, species, speciesById, round, top, pencil, onPencil, onMark, onName, onShow, onClose }: {
  animal: Animal; species: PoolSpecies | undefined; speciesById: Map<number, PoolSpecies>; round: AnimalRound;
  /** The board's top edge (px from the viewport top): the drawer reaches up to it. */
  top: number;
  pencil: Readonly<Record<string, 'yes' | 'no'>>;
  /** Pencil a guess for a hidden answer (null clears it), right here while reading the guide. */
  onPencil: (tag: string, value: 'yes' | 'no' | null) => void;
  onMark: (ruledOut: boolean) => void;
  /** Plan 053: name this animal as the one caught on camera (once a round; right finds it, wrong loses the round). */
  onName: () => void;
  /** Show another animal's guide: arrows, ←/→, a swipe (wrapping 5 -> 1), or its number. */
  onShow: (id: number) => void;
  onClose: () => void;
}) {
  const { suspects } = round;
  const index = suspects.indexOf(animal.id);
  const at = (by: number) => suspects[(index + by + suspects.length) % suspects.length];
  // The new photo slides in from the side it was flipped toward.
  const [dir, setDir] = useState<1 | -1>(1);
  const show = (id: number, by: 1 | -1) => { setDir(by); onShow(id); };
  const step = (by: 1 | -1) => show(at(by), by);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // Plan 048: the photo row follows the finger; a drag past a quarter of its width (or a flick) flips.
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const row = useRef<HTMLDivElement>(null);
  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const width = row.current?.offsetWidth ?? 300;
    const dx = info.offset.x;
    if (Math.abs(dx) > width / 4 || (Math.abs(info.velocity.x) > 400 && Math.abs(dx) > SWIPE / 2)) step(dx < 0 ? 1 : -1);
  };
  // Once ever: nudge the row sideways so the next photo peeks out further.
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    try {
      if (window.localStorage.getItem(GUIDE_SWIPE_HINT_KEY)) return;
      window.localStorage.setItem(GUIDE_SWIPE_HINT_KEY, '1');
    } catch { return; }
    const nudge = animate(x, [0, -24, 0], { duration: 0.7, delay: 0.5, ease: 'easeInOut' });
    return () => nudge.stop();
  }, [reduce, x]);
  // Plan 045: while playing, the guide keeps quiet about the round's questions (scouting shows those answers).
  const asked = new Set(round.status === 'playing' ? round.orders.map(order => prefixOf(order.tag)) : []);
  const released = round.released.includes(animal.id);
  const marked = round.marked.includes(animal.id);
  const canMark = round.status === 'playing' && !released;
  // Naming asks twice: one try, and a wrong one loses the round. A new animal's guide, or one ruled out from the grid, starts unasked.
  const [confirming, setConfirming] = useState(false);
  // Plan 054: a right name scores the pencil marks once an animal is ruled out (`pencilBonus`).
  const scored = round.fewestIn < round.suspects.length
    && round.suspects.some((id, i) => id !== animal.id && !round.released.includes(id) && round.orders.some(order => !order.seen[i] && pencil[`${id}:${order.tag}`]));
  useEffect(() => setConfirming(false), [animal.id, marked]);
  const isSeen = (i: number) => round.orders[i].seen[index] || round.status !== 'playing';
  // Plan 055: each category's row holds its guide lines, then its signs (never hidden); it shows when it has either.
  const guides = CHARGE_CATEGORIES.flatMap(key => {
    const lines = animal.guide[key].filter(line => !line.tags.some(tag => asked.has(prefixOf(tag))));
    const signs = animal.signs.filter(sign => sign.category === key);
    return lines.length > 0 || signs.length > 0 ? [{ key, lines, signs }] : [];
  });
  return (
    <Sheet
      // At least two lines tall so the body doesn't jump between short and long names; never clipped (grades 6-12 must
      // read it whole). No number badge: the number tiles under it already show which animal this is.
      title={<span data-guide-name className="flex min-h-[2lh] items-center">{animal.name}</span>}
      center
      before={<button type="button" onClick={() => step(-1)} className="btn btn-ghost btn-icon shrink-0" aria-label="Previous animal"><ChevronLeft className="h-5 w-5" /></button>}
      after={<button type="button" onClick={() => step(1)} className="btn btn-ghost btn-icon shrink-0" aria-label="Next animal"><ChevronRight className="h-5 w-5" /></button>}
      detail={(
        <span className="flex gap-xxs" role="group" aria-label={`Animal ${index + 1} of ${suspects.length}`}>
          {suspects.map((id, i) => (
            <button
              key={id}
              type="button"
              data-guide-number={i + 1}
              aria-label={`Animal ${i + 1}`}
              aria-current={i === index || undefined}
              onClick={() => { if (i !== index) show(id, i > index ? 1 : -1); }}
              className={`h-6 w-6 rounded-xs font-data text-xs ${i === index ? 'bg-neutral-10 text-neutral-1' : 'bg-neutral-3 text-neutral-8'}`}
            >
              {i + 1}
            </button>
          ))}
        </span>
      )}
      headerProps={{
        className: 'touch-pan-y',
        onPointerDown: event => { swipe.current = { x: event.clientX, y: event.clientY }; },
        onPointerUp: event => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = event.clientX - start.x;
          if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(event.clientY - start.y)) step(dx < 0 ? 1 : -1);
        },
        onPointerCancel: () => { swipe.current = null; },
      }}
      onKeyDown={event => {
        if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        step(event.key === 'ArrowLeft' ? -1 : 1);
      }}
      onClose={onClose}
      modeless
      top={top}
      footer={!canMark ? undefined : confirming ? (
        <div className="flex flex-1 flex-col gap-xs" data-name-confirm>
          <p className="m-0 text-s text-neutral-8" role="status"><b className="font-medium text-neutral-10">One try only.</b> Right, and you find it (★){scored && `, plus a bonus for your pencil marks on the other animals: right ones add, wrong ones take away (${PENCIL_POINTS.sharpAt} or more from ${PENCIL_POINTS.sharpPencils}+ marks, none wrong: a second ★ and a Sharp eye badge)`}. Wrong, and the round is lost.</p>
          <div className="flex gap-xs">
            {/* Focus lands here: the button that opened the ask is gone. */}
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-outline flex-1" autoFocus>Back</button>
            <button type="button" onClick={onName} className="btn btn-primary flex-1">Yes, it&apos;s this one</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => { onMark(!marked); onClose(); }} className={`btn flex-1 ${marked ? 'btn-outline' : 'btn-danger'}`}>
            {!marked && <Ban className="h-5 w-5" aria-hidden="true" />}
            {marked ? 'Undo: not ruled out' : 'Rule out'}
          </button>
          {!marked && (
            <button type="button" onClick={() => setConfirming(true)} className="btn btn-primary flex-1" data-name-it>
              <Camera className="h-5 w-5" aria-hidden="true" />
              It&apos;s this one!
            </button>
          )}
        </>
      )}
    >
      {marked && !released && (
        <p className={`${NOTICE} mb-s bg-error-transparent`} role="status">
          <Ban className="mt-xxs h-4 w-4 shrink-0 text-error" aria-hidden="true" />
          <span><b className="font-medium">Ruled out:</b> it wanders a step toward the edge each move, or leaves at once when a gem next to it is cleared. If it&apos;s the one caught on camera, it escapes! Bring it back to stop it.</span>
        </p>
      )}
      {released && (
        <p className={`${NOTICE} mb-s bg-neutral-3`} role="status">
          <ArrowUpRight className="mt-xxs h-4 w-4 shrink-0 text-neutral-7" aria-hidden="true" />
          <span><b className="font-medium">Released:</b> not the one caught on camera.</span>
        </p>
      )}
      <motion.div
        ref={row}
        data-guide-swipe
        className="relative flex select-none gap-s"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onPointerDownCapture={() => { dragged.current = false; }}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={onDragEnd}
        onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); } }}
      >
        {/* The neighbours' photos peek in from the sheet's edges: there is more to either side. */}
        <GuidePeek species={speciesById.get(at(-1))} side="left" />
        <GuidePeek species={speciesById.get(at(1))} side="right" />
        <figure className="m-0 flex w-36 shrink-0 flex-col gap-xxs">
          <span className="block aspect-[4/3] overflow-hidden rounded-xs bg-neutral-3">
            <motion.span key={animal.id} className={`block h-full w-full ${marked || released ? 'grayscale' : ''}`} initial={{ opacity: 0, x: dir * 32 }} animate={{ opacity: 1, x: 0 }} transition={SMALL}>
              <SuspectPhoto species={species} size={330} />
            </motion.span>
          </span>
          {species?.photo && <figcaption className="truncate text-xxs"><PhotoCredit photo={species.photo} /></figcaption>}
        </figure>
      </motion.div>
      <div className="mt-m flex items-baseline justify-between gap-xs">
        <h3 className={LABEL}>Its answers</h3>
        {!marked && round.orders.some((_, i) => !isSeen(i)) && <span className="text-xxs text-neutral-7">Pencil a guess where you haven&apos;t scouted</span>}
      </div>
      <ul className="m-0 mb-m list-none p-0">
        {round.orders.map((order, i) => {
          const guess = pencil[`${animal.id}:${order.tag}`];
          const yes = order.row[index];
          return (
            <li key={order.tag} data-answer-tag={order.tag} className={`flex min-h-12 items-center gap-s py-xxs ${ROW_LINE}`}>
              <span className={`${TILE} h-8 w-8 text-m`} aria-hidden="true">{clueFace(order.tag)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <CategoryMark category={categoryOf(order.tag)} small className={MARK_CAPTION} />
                <span className="text-s text-neutral-8">{order.question}</span>
              </span>
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
                      disabled={marked} // a ruled-out animal takes no pencil (animalSession)
                      aria-pressed={guess === value}
                      aria-label={`${order.question} Pencil ${value}`}
                      onClick={() => onPencil(order.tag, guess === value ? null : value)}
                      className={`pencil-mark h-9 rounded-xs text-m outline-dashed disabled:opacity-50 outline-1 -outline-offset-1 ${guess === value ? 'bg-neutral-4 text-neutral-10 outline-neutral-7' : 'text-neutral-7 outline-control-edge'}`}
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
          {guides.map(({ key, lines, signs }) => (
            <div key={key} className="contents" data-guide-cat={key}>
              <dt className={`${LABEL} pt-xxs`}><CategoryMark category={key} /></dt>
              <dd className="m-0 flex flex-col gap-xxs text-s text-neutral-8">
                {lines.map(line => <span key={line.text} data-guide-line={line.tags.map(prefixOf).join(' ')}><GlossaryText text={line.text} /></span>)}
                {signs.length > 0 && (
                  <ul data-signs className={`m-0 flex list-none flex-wrap gap-xxs p-0 ${lines.length > 0 ? 'pt-xxs' : ''}`} aria-label={`${CATEGORY_LABELS[key]} signs`}>
                    {signs.map(sign => <li key={sign.tag} data-sign={sign.tag} className={CHIP}>{sign.text}</li>)}
                  </ul>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Sheet>
  );
}

/** A sliver of the previous (left) or next (right) animal's photo, in the sheet's side padding. */
function GuidePeek({ species, side }: { species: PoolSpecies | undefined; side: 'left' | 'right' }) {
  return (
    <span className={`pointer-events-none absolute top-0 aspect-[1/9] w-3 overflow-hidden bg-neutral-3 opacity-70 ${side === 'left' ? '-left-6 rounded-r-xs' : '-right-6 rounded-l-xs'}`} aria-hidden="true">
      <span className={`absolute inset-y-0 w-36 ${side === 'left' ? 'right-0' : 'left-0'}`}><SuspectPhoto species={species} size={120} /></span>
    </span>
  );
}

export function NotesSheet({ round, onClose }: { round: AnimalRound; onClose: () => void }) {
  return (
    <Sheet
      title={<>Witness notes <span className="font-data text-neutral-7">{round.notes.length}</span></>}
      before={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-xs bg-notes/15 text-notes" aria-hidden="true"><NotebookPen className="h-5 w-5" /></span>}
      detail={<p className="m-0 text-xs text-neutral-7">What witnesses saw the camera&apos;s animal do or have</p>}
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
        <span>Match next to a glowing <b className="font-medium text-neutral-10">purple witness gem</b> to get a note about the camera&apos;s animal: something it does or has, and how many of the {count} animals share it.</span>
      </p>
    );
  }
  return (
    <ol className="m-0 flex list-none flex-col gap-xs p-0">
      {round.notes.map((note, index) => (
        <li key={index} className="flex flex-col gap-xs rounded-s bg-notes/15 p-s">
          <p className="m-0 text-m"><WithBlanks text={note.text} /></p>
          <p className={`m-0 flex flex-wrap gap-x-s gap-y-xxs ${MARK_CAPTION}`}>
            {noteCategories(note.tags).map(category => <CategoryMark key={category} category={category} small />)}
          </p>
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

/** The menu behind the grid's corner button: the place and trail, then the globe, the journal, how to play, sound, auto rule-out and dark mode. */
export function GameMenu({ title, stats, soundOn, onSound, autoRuleOut, onAutoRuleOut, onJournal, onHelp, onClose }: {
  title: string;
  /** Where the trail stands ([label, value]); null while loading. */
  stats: Array<[string, string | number]> | null;
  soundOn: boolean; onSound: () => void;
  /** On by default: the game rules out animals whose shown answer doesn't match the camera's. */
  autoRuleOut: boolean; onAutoRuleOut: () => void;
  onJournal: () => void; onHelp: () => void; onClose: () => void;
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
        <SwitchRow label="Auto rule-out" on={autoRuleOut} onToggle={onAutoRuleOut} />
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
            <p className="m-0 mt-xxs text-s text-neutral-7"><b className="font-medium text-neutral-10">Which one was it?</b> Name it right and you find it (★). Wrong, or skip, and you lose a heart.</p>
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

/** The round-end card's headline: how the round ended. */
function endKicker({ round, end }: AnimalSession): string {
  if (end?.outcome === 'found') return round.named ? 'Named it!' : 'Found it!';
  return end?.lostBy === 'escaped' ? 'It escaped!' : end?.lostBy === 'wrong-name' ? 'Wrong animal' : 'Out of moves';
}

/** Read out once as the round-end card opens (AnimalGame's live region, there before the card mounts). */
export function roundEndAnnouncement(session: AnimalSession, animal: Animal): string {
  const { end } = session;
  if (!end) return '';
  return end.outcome === 'found'
    ? `${endKicker(session)} ${animal.name}. ${end.stars} of 3 stars, ${end.points} points.`
    : `${endKicker(session)} It was the ${animal.name}. You lost a heart.`;
}

/** A grid-key swatch: a cell of the replay grid, small, with the answered cells' edge. */
const SWATCH = 'h-5 w-7 shrink-0 rounded-xs shadow-[inset_0_0_0_1px_var(--control-edge)]';

export function RoundEndSheet({ session, animal, species, citations, box, nameOf, onNext }: {
  session: AnimalSession; animal: Animal; species: PoolSpecies | undefined;
  /** The pool's citations by page URL, for the field notes' Sources. */
  citations: CluePool['citations'];
  /** The board's box (px, viewport): the card covers the board only, so the grid (above, or beside on desktop) shows the replay (plan 052). */
  box: { top: number; left: number; width: number };
  nameOf: (id: number) => string; onNext: () => void;
}) {
  const { round, end, trail } = session;
  const present = useIsPresent();
  // Focus moves to the name as the card opens (the grid it came from stops taking input). On a narrow phone the name
  // sits under the photo, so the card scrolls it into view; only the card scrolls (preventScroll keeps the page still).
  const title = useRef<HTMLHeadingElement>(null);
  const details = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const heading = title.current, scroller = details.current;
    if (!heading || !scroller) return;
    heading.focus({ preventScroll: true });
    const bottom = heading.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + scroller.scrollTop;
    if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
  }, []);
  if (!end) return null;
  const tree = animal.familyTree;
  const found = end.outcome === 'found';
  // The player's pencilled guesses, each right or wrong (scouted or not).
  const guesses = round.suspects.flatMap((id, i) => round.orders.flatMap(order => {
    const guess = session.pencil[`${id}:${order.tag}`];
    return guess ? [(guess === 'yes') === order.row[i]] : [];
  }));
  const called = guesses.filter(Boolean).length;
  const answered = round.orders.some(order => order.answer);
  const notes = [...animal.notes, ...animal.revealNotes];
  // A find pops the photo in, then fills the stars one by one (MotionConfig turns this off for reduced motion).
  const pop = (delay: number) => (found ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring' as const, stiffness: 420, damping: 18, delay } } : {});
  return (
    // Under the menu, help and journal (z 8100+), which stay reachable from the grid's corner. Not a dialog: the replay
    // grid outside it is part of the reading. Animating out, it's hidden and lets taps through (like useOverlayPresence).
    <div
      className="fixed bottom-0 z-[8000] flex items-end justify-center"
      aria-hidden={present ? undefined : true}
      style={{ top: box.top, left: box.left, width: box.width || '100%', pointerEvents: present ? undefined : 'none' }}
    >
      <motion.div className="absolute inset-0 bg-neutral-10-transparent" aria-hidden="true" {...backdropMotion} />
      <motion.section className="relative flex h-full w-full max-w-md flex-col rounded-t-m bg-neutral-1 text-s text-neutral-10 shadow-m" aria-labelledby="end-title" {...drawerUpMotion}>
        {/* Focusable, so a keyboard can scroll to the notes; the padding keeps what scrolls into view clear of the footer's fade. */}
        <div ref={details} tabIndex={0} role="region" aria-label="Round details" className="min-h-0 flex-1 scroll-pb-xl overflow-y-auto overscroll-contain rounded-t-m px-l pb-s pt-l outline-none! focus-visible:shadow-[inset_0_0_0_2px_var(--color-1)]">
        {/* Its own box, so the scroller doesn't squeeze its rows. */}
        <div className="flex flex-col gap-m">
          {/* The reward reads together: stars, points, moves to spare (a loss always scores 0, so it shows none). */}
          <p className="m-0 flex flex-wrap items-center gap-xs">
            <span className={`text-s font-heavy uppercase tracking-[0.02em] ${found ? 'text-color-1' : 'text-error'}`}>{endKicker(session)}</span>
            {found && (
              <span className="flex rounded-xs bg-emphasis-icon px-xs text-m tracking-[0.08em] text-on-emphasis-icon">
                {[0, 1, 2].map(i => <motion.span key={i} className="inline-block" aria-hidden="true" {...(i < end.stars ? pop(0.5 + i * 0.18) : {})}>{i < end.stars ? '★' : '☆'}</motion.span>)}
                <span className="sr-only">{end.stars} of 3 stars</span>
              </span>
            )}
            {found && (
              <motion.span className="flex items-baseline gap-xxs whitespace-nowrap" {...pop(0.5 + end.stars * 0.18)}>
                <b className="font-data text-m font-heavy text-color-1">+{end.points}</b>
                <span className="text-s text-neutral-7">points</span>
              </motion.span>
            )}
            {/* A find by name earns nothing for moves left (plan 053), so it shows none. */}
            {found && !round.named && (
              <span className="flex items-baseline gap-xxs whitespace-nowrap">
                <b className="font-data text-m font-heavy">{round.movesLeft}/{round.rules.moves}</b>
                <span className="text-s text-neutral-7">moves to spare</span>
              </span>
            )}
          </p>
          {/* The name drops under the photo when there's no room beside it (320px phones). */}
          <div className="flex flex-wrap items-start gap-m">
            <figure className="m-0 flex w-36 shrink-0 flex-col gap-xxs">
              <motion.span className="block aspect-[4/3] overflow-hidden rounded-xs bg-neutral-3" {...pop(0.25)}><SuspectPhoto species={species} size={330} /></motion.span>
              {species?.photo && <figcaption className="text-xs [overflow-wrap:anywhere]"><PhotoCredit photo={species.photo} /></figcaption>}
            </figure>
            <div className="flex min-w-[200px] flex-1 flex-col gap-xxs">
              {/* By its number on the board and in the grid: the camera's animal was one of the five all along. */}
              <h2 id="end-title" ref={title} tabIndex={-1} className="m-0 flex flex-col outline-none!">
                <span className="text-s font-regular text-neutral-7">The camera saw #{round.suspects.indexOf(round.mysteryId) + 1}</span>
                <span className="text-xl font-heavy [text-wrap:balance] [overflow-wrap:anywhere]">{animal.name}</span>
              </h2>
              <p className="m-0 text-m italic text-neutral-7" lang="la">{animal.scientificName}</p>
              {(guesses.length > 0 || round.pencilBonus !== null) && <dl className="m-0 mt-xxs flex flex-col">
                {guesses.length > 0 && <Stat label="pencil guesses right" value={`${called}/${guesses.length}`} data-guesses={`${called}/${guesses.length}`} row />}
                {round.pencilBonus !== null && <Stat label="pencil bonus (in the points)" value={round.pencilBonus < 0 ? `−${-round.pencilBonus}` : `+${round.pencilBonus}`} data-pencil-bonus={round.pencilBonus} row />}
              </dl>}
              {sharpEye(round) && <p className="m-0 mt-xxs flex items-center gap-xs text-s font-medium" data-sharp-eye><span aria-hidden="true">🎯</span>Sharp eye! A badge for its journal page.</p>}
            </div>
          </div>
          <div className="flex items-start gap-xs text-neutral-7">
            <ListTree className="h-5 w-5 shrink-0" aria-hidden="true" />
            <ol aria-label="Family tree" className="m-0 flex list-none flex-wrap gap-x-xxs p-0 text-s">
              {['Animalia', 'Chordata', tree.class.latin, tree.order.latin, tree.family.latin].map(rank => <li key={rank}>{rank} <span aria-hidden="true">›</span></li>)}
              <li className="font-medium text-neutral-10">{tree.genus}</li>
            </ol>
          </div>
          {!found && (
            <p className={`${NOTICE} bg-error-transparent`}>
              <HeartCrack className="mt-xxs h-4 w-4 shrink-0 text-error" aria-hidden="true" />
              <span>You lost a heart.{round.named && ` You named the ${nameOf(round.named.id)}.`}</span>
            </p>
          )}
          {/* The key to the replay in the grid above: one row per kind of cell it shows. */}
          <section aria-labelledby="end-key" className="flex flex-col gap-xs rounded-s bg-neutral-2 px-m py-s">
            <h3 id="end-key" className={`${LABEL} tracking-[0.04em]`}>Reading the grid above</h3>
            <ul className="m-0 flex list-none flex-col gap-xs p-0 text-s text-neutral-8">
              {answered ? (
                <>
                  <li className="flex items-center gap-s"><span className={`${SWATCH} ev-match`} aria-hidden="true" />Same answer as the camera</li>
                  <li className="flex items-center gap-s">
                    <span className={`${SWATCH} ev-clash ev-stripes`} aria-hidden="true" />
                    <span><b className="font-medium text-neutral-10">Striped red:</b> a different answer, so that animal is ruled out</span>
                  </li>
                  {round.orders.some(order => !order.answer) && <li className="flex items-center gap-s"><span className={`${SWATCH} bg-neutral-3`} aria-hidden="true" />Never asked this round</li>}
                </>
              ) : <li>No question was answered this time.</li>}
              {called < guesses.length && (
                <li className="flex items-center gap-s">
                  <span className="ev-missed grid h-5 w-7 shrink-0 place-items-center text-s!" aria-hidden="true">✓</span>
                  Crossed out: your pencil guess was wrong
                </li>
              )}
            </ul>
          </section>
          {notes.length > 0 && (
            <section aria-labelledby="end-notes">
              <h3 id="end-notes" className={`${LABEL} mb-xs flex items-center gap-xs tracking-[0.04em]`}>
                Field notes <span className="rounded-full bg-color-1-transparent px-xs font-data normal-case text-neutral-10">{notes.length}</span>
              </h3>
              <FactsWithSources
                facts={notes.map((note, index) => ({ key: index, text: note.full ?? note.text, source: note.source }))}
                citations={citations}
                className="flex list-disc flex-col gap-s pl-m text-m text-neutral-8 marker:text-neutral-6"
              />
            </section>
          )}
        </div>
        </div>
        <div className="relative flex shrink-0 flex-col gap-s px-l pb-[max(var(--space-l),env(safe-area-inset-bottom))] pt-xs">
          {/* No divider: the notes fade out under the button, so it sits on the card. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-full h-l bg-linear-to-t from-neutral-1 to-transparent" aria-hidden="true" />
          {trail.over && (
            <div className="flex items-center justify-between gap-s rounded-s bg-color-3-transparent px-s py-xs">
              <div className="flex flex-col">
                <b className="text-s font-medium">{trail.hearts > 0 ? 'Trail finished!' : 'Out of hearts: the trail is over.'}</b>
                <span className="text-xs text-neutral-7">Trail {session.trailNo} total</span>
              </div>
              <dl className="m-0 flex gap-m text-center">
                <Stat label="finds" value={`${trail.finds}/${trail.rounds}`} />
                <Stat label="score" value={session.score} />
              </dl>
            </div>
          )}
          <button type="button" onClick={onNext} className="btn btn-primary min-h-xxl w-full text-m">{trail.over ? 'New trail' : 'Next animal'}</button>
        </div>
      </motion.section>
    </div>
  );
}

/** A number over its label (the trail total), or before it on one line (`row`, the round-end card). */
function Stat({ label, value, row = false, ...rest }: { label: string; value: ReactNode; row?: boolean; 'data-guesses'?: string; 'data-pencil-bonus'?: number }) {
  return (
    <div className={`flex ${row ? 'items-baseline gap-xxs' : 'flex-col'}`} {...rest}>
      <dt className={`${row ? 'text-s' : 'text-xs'} text-neutral-7`}>{label}</dt>
      <dd className="order-first m-0 font-data text-m font-heavy">{value}</dd>
    </div>
  );
}

/** How to play, step 1: one column of a made-up grid, and the player decides whether animal 2 can be the camera's. */
function CompareExample() {
  const [pick, setPick] = useState<'yes' | 'no' | null>(null);
  return (
    <span className="mt-xs flex flex-col gap-xs rounded-s bg-neutral-2 p-s">
      <span className="grid grid-cols-[1fr_64px] items-center gap-x-xs gap-y-xxs text-neutral-10" aria-label="Example: on camera, yes, active at night. Animal 2: no." role="img">
        <span />
        <span className="text-center text-xs text-neutral-7">🌙 Night?</span>
        <span className="flex items-center gap-xs"><span className="block w-7 shrink-0"><TrapCard /></span>On camera</span>
        <span className="rounded-xs bg-emphasis-icon py-xxs text-center text-s font-heavy text-on-emphasis-icon">✓ YES</span>
        <span className="flex items-center gap-xs"><span className={`${TILE} h-7 w-7 font-data text-s`}>2</span>Animal 2</span>
        <span className="rounded-xs bg-neutral-3 py-xxs text-center text-m font-heavy text-neutral-7">✗</span>
      </span>
      <span>Can animal 2 be the one caught on camera?</span>
      <span className="flex gap-xs">
        {(['yes', 'no'] as const).map(answer => (
          <button key={answer} type="button" onClick={() => setPick(answer)} aria-pressed={pick === answer} className={`btn flex-1 ${pick === answer ? 'btn-primary' : 'btn-outline'}`}>{answer === 'yes' ? 'Yes' : 'No'}</button>
        ))}
      </span>
      {pick && (
        <span role="status" className={pick === 'no' ? 'text-neutral-10' : 'text-error'}>
          {pick === 'no'
            ? <><b>Right!</b> The camera saw a night animal, and animal 2 isn&apos;t one. Rule it out.</>
            : <>Look again: in the 🌙 column the camera says <b>YES</b> and animal 2 says <b>NO</b>. They don&apos;t match, so it isn&apos;t the one.</>}
        </span>
      )}
    </span>
  );
}

export function AnimalHowToPlay({ rules, seed, onClose }: { rules: AnimalRound['rules']; seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  const presence = useOverlayPresence();
  const steps: ReactNode[] = [
    <>Your trail camera caught a blurry shot last night. Only the <b>{rules.suspects} animals</b> on the board live here, so it&apos;s one of them. Which one? In the grid, the top row, <b>On camera</b>, is what the camera found out; the rows under it are the {rules.suspects} animals. Try one:<CompareExample /></>,
    <>Swap gems to line up 3 or more. Each picture gem fills its <b>question</b> in the On camera row. A full question answers it: <b>yes</b> or <b>no</b>.</>,
    <>Each animal&apos;s own answers start hidden. <b>Scout</b> them: clear a gem next to an animal&apos;s card and its answer to that gem&apos;s question shows. Know it already? Tap a <b>?</b> to pencil your guess, then scout it to see if you called it. Hold a <b>?</b> to <b>highlight</b> it: that gem glows next to the animal&apos;s card on the board until you scout it. Hold a gem up top and every gem of it glows until its answer comes in. Hold an animal&apos;s picture to open its <b>field guide</b>, and pencil there as you read.</>,
    <>Compare down each column: an animal whose answer doesn&apos;t match the camera&apos;s isn&apos;t the one. To <b>rule an animal out</b>, drag its photo in the grid to the right, across its name (drag again to bring it back). After each move, <b>Auto rule-out</b> rules out every animal with a shown answer that doesn&apos;t match; turn it off in the menu to do it all yourself.</>,
    <>A ruled-out animal <b>wanders</b> a step toward the edge after each move and leaves the board there (bring it back to stop it, unless Auto rule-out in the menu is on and it doesn&apos;t match). Clear a gem next to it to release it now: your own match leaves a <b>line gem</b> in its place. Release every look-alike: the last one is your find. <b>Rule out the one caught on camera and it escapes!</b></>,
    <>Sure already? Open its field guide and tap <b>It&apos;s this one!</b> You get one try a round, even when the moves run out: right is a find worth ★, wrong loses the round. Once you&apos;ve ruled one out, a right name also scores your <b>pencil marks</b> on the other animals: each right one adds (harder kinds of questions more), each wrong one takes away, and calling more kinds, or naming it with more animals still in (the fewest you&apos;ve had in this round), multiplies it. A bonus of {PENCIL_POINTS.sharpAt} or more from {PENCIL_POINTS.sharpPencils} or more pencil marks, none wrong, earns a second ★ and a 🎯 <b>Sharp eye</b> badge on that animal&apos;s journal page.</>,
    <>Glowing purple <b>witness gems</b> give a note about the camera&apos;s animal and how many of the {rules.suspects} share it.</>,
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
          <p className="m-0 text-center text-xxs text-neutral-7">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
        </div>
      </motion.div>
    </div>
  );
}
