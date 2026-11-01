// The evidence grid (plan 044): one table that lines the mystery up with the five
// suspects. A column per clue (its gem as the board draws it, and a short label);
// the Mystery row, where each clue's gems fill its cell until the answer stamps it;
// then a row per suspect with that animal's own answers and its number, the same
// number its board card wears (plan 046: the same pinned card, AnimalCard). Comparing down a column is the player's job: during
// play nothing points at a contradiction. Plan 045: a suspect's answer stays "?"
// until scouted (a move's clear of that clue's color next to its tile); tap a hidden
// cell to pencil your own guess (yes, no, blank). Once scouted, a right guess's cell sparkles
// for a moment and a wrong one shows the guess crossed out (the answer is showing by then, so
// this concludes nothing). An
// animal's name: tap to pick it (its tile pulses), hold for its field guide, drag its
// photo right across the name to rule it out (again to undo). `review` (the round-end card) shows
// every answer, outlines the mystery's own row; from the slide on, cells drop their ✓/✗: green where an animal's
// answer matches the mystery's, red where not (the Camera row says YES/NO).
// The Camera cell opens the witness notes (every note is about the mystery): it counts
// them, pulses when one comes in, and is where a collected witness gem flies.
// Hold a hidden answer cell (or press H on it) to highlight it (purple, "this one matters"): its gems next to that animal's
// card glow on the board until it's scouted. Hold a question's gem up top (or press H): all its gems glow until the answer lands. A ruled-out animal's
// cells take no pencil or highlight. Like pencil, the player's own mark: the rules never read it (liveHighlights).
// Players see the mystery as "the one caught on camera" (its row: "On camera"), so it doesn't read as a sixth
// animal; a ruled-out animal's row dims (the player's own mark). `landOn` (the round is over): the mystery's own row
// rises into the Camera row, which becomes that animal (its slot closes up), then `onLanded`. `review` keeps it so (plan 052).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NotebookPen } from 'lucide-react';
import { motion } from 'motion/react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { liveHighlights } from '@/clueGame/animalSession';
import { clueFace } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { columnLabel } from '@/clueGame/questionMatch';
import { GEM_TEXT_COLOR, type GemType } from '@/game/constants';
import { LARGE, SMALL } from '@/lib/motion';
import { AnimalCard, TrapCard } from './AnimalCard';
import { FaceIcon } from './FaceIcon';

const NEXT_PENCIL = { none: 'yes', yes: 'no', no: null } as const;
const NONE: ReadonlySet<string> = new Set();
/** `ev-flash` (globals.css): text that flashes these gems' colors (several: a rainbow across them), then back to its own. */
const flashStyle = (gems: readonly GemType[]): CSSProperties => {
  const colors = gems.map(gem => GEM_TEXT_COLOR[gem] ?? 'gray');
  return { '--flash': `linear-gradient(90deg, ${(colors.length === 1 ? [colors[0], colors[0]] : colors).join(', ')})` } as CSSProperties;
};
/** A press this long on an animal's row is a long press (its field guide); the board's tiles use the same (BoardController). */
const HOLD_MS = 450;
/** Holding an answer cell this long highlights it: longer than a name's hold, so a slow tap never highlights by mistake. */
const HIGHLIGHT_MS = 1000;
/** After the mystery's row reaches the Camera row, how long its match shows before `onLanded`. */
const LANDED_MS = 900;
/** The photo is the slide's handle (`--ev-photo`, globals.css). Its track runs half the name's width; drag it halfway along to rule the animal out (or back in). */
const TRACK_SHARE = 0.5;
const SLIDE_TO_MARK = 0.5;

/**
 * A press on an animal's name: still a tap, a long press (`held`), a slide (only from the photo, `handle`), or a
 * scroll (ignored). `travel`: how far the photo can go.
 */
interface Gesture { id: number; x: number; y: number; travel: number; handle: boolean; timer: number; mode: 'press' | 'held' | 'slide' | 'scroll' }

export function EvidenceGrid({ round, speciesById, shown, landed = [], selected = null, onSelect, onGuide, onMark, slideHint = false, onQuestion, onNotes, pencil = {}, onPencil, highlight = [], onHighlight, reveal = NONE, landOn = null, onLanded, corner, review = false }: {
  round: AnimalRound;
  speciesById: Map<number, PoolSpecies>;
  /** Gems each order shows as collected (the grid trails the rules while gems fly); an answer shows once its order looks full. */
  shown: readonly number[];
  /** Gems each order has had fly in this round: the count flashes its gem's color with each. */
  landed?: readonly number[];
  selected?: number | null;
  onSelect?: (id: number) => void;
  /** A long press on an animal's row: open its field guide. */
  onGuide?: (id: number) => void;
  /** An animal's photo dragged right: rule it out (or, if it is, back in). */
  onMark?: (id: number, ruledOut: boolean) => void;
  /** Once, for a new player: the first animal's photo nudges right and says "Slide to rule out". */
  slideHint?: boolean;
  onQuestion?: (index: number) => void;
  /** The Mystery's cell: open the witness notes. */
  onNotes?: () => void;
  /** The player's pencilled answers for hidden cells, by `${id}:${tag}`; `onPencil` sets the next one. */
  pencil?: Readonly<Record<string, 'yes' | 'no'>>;
  onPencil?: (id: number, tag: string, value: 'yes' | 'no' | null) => void;
  /** The player's highlights, by `${id}:${tag}` (a cell) or `*:${tag}` (a question's gem); a long press toggles one (id null: the gem). */
  highlight?: readonly string[];
  onHighlight?: (id: number | null, tag: string) => void;
  /** Cells (`${id}:${tag}`) just scouted: the answer and the animal's name flash the clue's gem color; a right guess sparkles, a wrong one shows, a ruled-out card wiggles. */
  reveal?: ReadonlySet<string>;
  /** The round is over: the Camera row slides onto this animal's row (the mystery's), then `onLanded`. */
  landOn?: number | null;
  onLanded?: () => void;
  /** The top-left cell, over the animals' names. */
  corner?: ReactNode;
  review?: boolean;
}) {
  const gesture = useRef<Gesture | null>(null);
  const [slide, setSlide] = useState<{ id: number; dx: number; travel: number } | null>(null);
  // The click that ends a long press or a slide doesn't also pick the row.
  const skipClick = useRef(false);
  const press = (event: React.PointerEvent<HTMLButtonElement>, id: number) => {
    if (gesture.current) window.clearTimeout(gesture.current.timer);
    skipClick.current = false; // a gesture that ended without its click (a cancel) mustn't swallow this one
    const box = event.currentTarget.getBoundingClientRect();
    const photo = event.currentTarget.querySelector('[data-handle]')?.clientWidth ?? 30;
    const next: Gesture = { id, x: event.clientX, y: event.clientY, travel: Math.round((box.width - photo) * TRACK_SHARE), handle: event.clientX - box.left <= photo + 6, timer: 0, mode: 'press' };
    next.timer = window.setTimeout(() => {
      if (next.mode !== 'press' || !onGuide) return;
      next.mode = 'held';
      skipClick.current = true;
      onGuide(id);
    }, HOLD_MS);
    gesture.current = next;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* a synthetic pointer */ }
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>, canSlide: boolean) => {
    const g = gesture.current;
    if (!g || g.mode === 'held' || g.mode === 'scroll') return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.mode === 'press') {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { g.mode = 'scroll'; window.clearTimeout(g.timer); return; }
      if (dx <= 10 || !canSlide || !g.handle) return;
      g.mode = 'slide';
      window.clearTimeout(g.timer);
    }
    setSlide({ id: g.id, dx: Math.max(0, Math.min(dx, g.travel)), travel: g.travel });
  };
  const release = (event: React.PointerEvent<HTMLButtonElement>, marked: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    window.clearTimeout(g.timer);
    if (g.mode === 'slide') {
      skipClick.current = true;
      if (event.clientX - g.x >= g.travel * SLIDE_TO_MARK) onMark?.(g.id, !marked);
    }
    setSlide(null);
  };
  const cancel = () => {
    if (gesture.current) window.clearTimeout(gesture.current.timer);
    skipClick.current = false;
    gesture.current = null;
    setSlide(null);
  };
  // A long press on an answer cell highlights it; the click that ends it doesn't also pencil or pick.
  const cellHold = useRef<{ x: number; y: number; timer: number; held: boolean } | null>(null);
  const cellPress = (event: React.PointerEvent, id: number | null, tag: string) => {
    if (cellHold.current) window.clearTimeout(cellHold.current.timer);
    const hold = { x: event.clientX, y: event.clientY, timer: 0, held: false };
    hold.timer = window.setTimeout(() => { hold.held = true; onHighlight?.(id, tag); }, HIGHLIGHT_MS);
    cellHold.current = hold;
  };
  const cellMove = (event: React.PointerEvent) => {
    const hold = cellHold.current;
    if (hold && !hold.held && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 10) { window.clearTimeout(hold.timer); cellHold.current = null; }
  };
  const cellEnd = () => { if (cellHold.current && !cellHold.current.held) { window.clearTimeout(cellHold.current.timer); cellHold.current = null; } };
  const cellClick = (event: React.MouseEvent) => {
    if (!cellHold.current?.held) return;
    cellHold.current = null;
    event.stopPropagation();
  };
  const holdCell = (id: number | null, tag: string) => onHighlight ? {
    onPointerDown: (event: React.PointerEvent) => cellPress(event, id, tag),
    onPointerMove: cellMove, onPointerUp: cellEnd, onPointerCancel: cellEnd, onPointerLeave: cellEnd,
    onClickCapture: cellClick,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  } : {};
  const highlighted = new Set(liveHighlights(round, highlight));
  const pick = (id: number) => {
    if (skipClick.current) { skipClick.current = false; return; }
    onSelect?.(id);
  };
  const hinted = slideHint ? round.suspects.find(id => !round.marked.includes(id) && !round.released.includes(id)) : undefined;
  const size = round.rules.orderSize;
  const notes = round.notes.length;
  const trapCard = <TrapCard />;
  // The player's own marks, in the Camera row's label (red like the cards' crosses).
  const markCount = round.marked.length > 0 && <span className="shrink-0 font-heavy text-error" aria-hidden="true">✕{round.marked.length}</span>;
  // While playing, the count's place is kept from the start (invisible at 0): the label wraps (never clips), so the
  // first mark mustn't reflow it and change the grid's height under the board.
  const markSlot = <span className={`shrink-0 font-heavy text-error ${round.marked.length > 0 ? '' : 'invisible'}`} aria-hidden="true">✕{Math.max(1, round.marked.length)}</span>;
  const answered = round.orders.map((order, j) => order.answer !== null && (review || (shown[j] ?? 0) >= size));
  // The end-of-round slide: how far below the Camera row the mystery's row is, then whether it has risen there.
  const cameraRow = useRef<HTMLTableRowElement>(null);
  const [landing, setLanding] = useState<{ id: number; dy: number } | null>(null);
  const [matched, setMatched] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (landOn === null) { setLanding(null); setMatched(null); return; }
    const from = cameraRow.current?.getBoundingClientRect().top;
    const to = cameraRow.current?.parentElement?.querySelector(`tr[data-suspect="${landOn}"]`)?.getBoundingClientRect().top;
    const dy = from === undefined || to === undefined ? 0 : to - from;
    setLanding({ id: landOn, dy });
    if (dy === 0) setMatched(landOn); // nothing to slide (no row found): match at once, so the card still opens
  }, [landOn]);
  // Which animal the Camera row shows: the replay's, or the one that just rose into it.
  const revealed = review ? round.mysteryId : matched;
  // From the slide on: no ✓/✗ marks. An answered column's cells go green (same as the camera's animal) or red
  // (striped, so it isn't color alone), under the camera's YES (green) or NO (red); unanswered columns stay grey.
  const done = review || landing !== null;
  const truth = (order: AnimalRound['orders'][number]) => order.row[round.suspects.indexOf(round.mysteryId)];
  useLayoutEffect(() => {
    if (matched === null) return;
    const timer = window.setTimeout(() => onLanded?.(), LANDED_MS);
    return () => window.clearTimeout(timer);
  }, [matched, onLanded]);
  return (
    <table aria-label={review ? 'How the evidence lined up' : 'Evidence'} className="w-full table-fixed border-separate [border-spacing:3px_2px]">
      {onMark && <caption className="sr-only">Drag an animal&apos;s photo right across its name, or press the right arrow on it, to rule it out (left arrow: back in). Hold it, or press Shift and Enter, for its field guide. Press H on an answer cell or a question to highlight it.</caption>}
      <colgroup>
        <col />
        {round.orders.map(order => <col key={order.tag} className="w-[54px]" />)}
      </colgroup>
      <thead>
        <tr>
          <td className="p-0 align-bottom">{corner}</td>
          {round.orders.map((order, j) => (
            <th key={order.tag} scope="col" data-tag={order.tag} data-highlight={highlighted.has(`*:${order.tag}`) || undefined} {...holdCell(null, order.tag)} className="select-none p-0 align-bottom font-regular [-webkit-touch-callout:none]">
              <button
                type="button"
                disabled={!onQuestion}
                onClick={() => onQuestion?.(j)}
                onKeyDown={event => {
                  if ((event.key === 'h' || event.key === 'H') && onHighlight && !event.metaKey && !event.ctrlKey && !event.altKey) {
                    event.preventDefault();
                    onHighlight(null, order.tag);
                  }
                }}
                aria-label={`${order.question}${highlighted.has(`*:${order.tag}`) ? ', highlighted' : ''}`}
                className={`flex w-full flex-col items-center gap-xxs rounded-xs pb-xxs transition-colors short:gap-zero short:pb-zero ${highlighted.has(`*:${order.tag}`) ? 'ev-highlight' : 'enabled:hover:bg-neutral-3-transparent enabled:active:bg-neutral-3'}`}
              >
                <FaceIcon gem={order.gem} face={clueFace(order.tag)} className={`h-6 w-6 text-[13px] ${highlighted.has(`*:${order.tag}`) ? 'ev-glow' : ''}`} />
                <span className="min-h-[calc(2*var(--line-xs))] text-xs text-neutral-7 short:min-h-[calc(2*var(--line-xxs))] short:text-xxs" lang="en">{columnLabel(order.tag)}</span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr ref={cameraRow} data-mystery data-match={revealed ?? undefined}>
          <th scope="row" className={`h-(--ev-row) p-0 text-left font-medium text-neutral-10 ${revealed !== null ? 'rounded-xs bg-color-3-transparent outline outline-2 outline-color-3' : ''}`}>
            {revealed !== null ? (
              // The Camera row is now the animal the camera caught: its card, number and name.
              <span className="flex items-center gap-xs">
                <span className="block w-(--ev-photo) shrink-0"><AnimalCard species={speciesById.get(revealed)} number={round.suspects.indexOf(revealed) + 1} /></span>
                <span className="min-w-0 text-xs narrow:sr-only [hyphens:auto] [overflow-wrap:anywhere]" lang="en"><span className="sr-only">On camera: </span>{speciesById.get(revealed)?.commonName ?? 'animal'}</span>
              </span>
            ) : review || !onNotes ? (
              <span className="flex items-center gap-xs">
                <span className="block w-(--ev-photo) shrink-0 text-m">{trapCard}</span>
                <span className="text-s narrow:sr-only">On camera</span>
                {markCount}
              </span>
            ) : (
              <button
                type="button"
                onClick={onNotes}
                data-flight-target="notes"
                data-notes={notes}
                aria-label={`On camera: one of these ${round.suspects.length} animals${round.marked.length > 0 ? `, ${round.marked.length} ruled out` : ''}. ${notes > 0 ? `${notes} witness note${notes === 1 ? '' : 's'}: open them` : 'No witness notes yet'}`}
                className={`relative flex min-h-(--ev-row) w-full items-center gap-xs rounded-xs pl-xxs text-left narrow:gap-xxs outline outline-[1.5px] -outline-offset-[1.5px] outline-control-edge ${notes > 0 ? 'bg-notes/10' : ''}`}
              >
                {/* Keyed by the count, so the cell pulses for 3 s each time a note comes in. */}
                {notes > 0 && <span key={notes} className="ev-unread pointer-events-none absolute inset-0 rounded-xs" aria-hidden="true" />}
                <span className="block w-(--ev-photo) shrink-0 text-m">{trapCard}</span>
                <span className="flex min-w-0 flex-col">
                  {/* `narrow` (globals.css): no room for words beside the card, so only the counts (the button's label has it all). */}
                  <span className="text-s narrow:hidden">On camera</span>
                  {/* Until the first note: which animals the camera's one is among (a fixed count, never who still fits). */}
                  <span className="flex min-w-0 flex-wrap items-center gap-x-xxs text-xs font-medium text-neutral-8">
                    {notes > 0 ? <NotebookPen className="h-3 w-3 shrink-0 text-notes" aria-hidden="true" /> : null}
                    {notes > 0
                      ? <span className="min-w-0">{notes}<span className="narrow:hidden"> note{notes === 1 ? '' : 's'}</span></span>
                      : <span className="min-w-0 narrow:hidden">One of {round.suspects.length} ↓</span>}
                    {markSlot}
                  </span>
                </span>
              </button>
            )}
          </th>
          {round.orders.map((order, j) => {
            const have = Math.min(shown[j] ?? 0, size);
            return (
              <td
                key={order.tag}
                data-tag={order.tag}
                data-have={order.have}
                data-answer={order.answer ?? ''}
                data-flight-target={review ? undefined : order.tag}
                className={`relative h-(--ev-row) overflow-hidden rounded-xs p-0 text-center ${answered[j] ? (done ? (order.answer === 'yes' ? 'ev-match' : 'ev-clash') : 'bg-emphasis-icon text-on-emphasis-icon') : 'bg-neutral-4 text-neutral-10'}`}
              >
                {answered[j] ? (
                  // Keyed: otherwise React reuses the progress bar's motion.span (and its width) for the answer.
                  <motion.span key="answer" className="block text-s font-heavy" initial={review ? false : { rotateX: 90, scale: 1.3 }} animate={{ rotateX: 0, scale: 1 }} transition={LARGE}>{done ? (order.answer === 'yes' ? 'YES' : 'NO') : order.answer === 'yes' ? '✓ YES' : '✗ NO'}</motion.span>
                ) : revealed !== null ? (
                  // Unasked, so the camera never said: the risen animal's own answer.
                  <span className="text-s font-heavy text-neutral-8">{order.row[round.suspects.indexOf(revealed)] ? 'YES' : 'NO'}</span>
                ) : (
                  <>
                    {!review && <motion.span className="absolute bottom-0 left-0 h-1 bg-color-3" initial={false} animate={{ width: `${(100 * have) / size}%` }} transition={SMALL} aria-hidden="true" />}
                    {/* Keyed by the gems that flew in, so it flashes its gem's color as each lands (not on a reload). */}
                    <span key={landed[j] ?? 0} className={`relative font-data text-xs font-medium tabular-nums ${!review && landed[j] ? 'ev-flash' : ''}`} style={!review && landed[j] ? flashStyle([order.gem]) : undefined}>{review ? '?' : `${have}/${size}`}</span>
                  </>
                )}
              </td>
            );
          })}
        </tr>
        {/* Sets the Camera row apart from the animals it's one of (globals.css counts its height in --ev-reserve). */}
        <tr aria-hidden="true"><td colSpan={round.orders.length + 1} className="h-1 p-0"><div className="h-px bg-neutral-4" /></td></tr>
        {round.suspects.map((id, i) => {
          if (id === revealed) return null; // risen into the Camera row
          const species = speciesById.get(id);
          const name = species?.commonName ?? 'animal';
          const rising = landing?.id === id;
          const released = round.released.includes(id) && !review && !rising; // the rising row stays readable
          const marked = round.marked.includes(id) && !released;
          const picked = selected === id;
          const canSlide = Boolean(onMark) && !released;
          const out = round.marked.includes(id); // ruled out (or released): its cells take no pencil or highlight
          // (The photo slides; the track behind it shows only while dragging.)
          const dx = slide?.id === id ? slide.dx : 0;
          const missed = (order: AnimalRound['orders'][number]) => {
            const guess = pencil[`${id}:${order.tag}`];
            return Boolean(guess) && (guess === 'yes') !== order.row[i];
          };
          const wiggle = marked && round.orders.some(order => reveal.has(`${id}:${order.tag}`) && missed(order));
          const flashGems = review ? [] : round.orders.filter(order => reveal.has(`${id}:${order.tag}`)).map(order => order.gem);
          return (
            <motion.tr
              key={id}
              data-suspect={id}
              onClick={onSelect ? () => pick(id) : undefined}
              // The rows below the risen one close the gap; the rising row slides up over the Camera row.
              layout={rising ? undefined : 'position'}
              initial={false}
              animate={rising ? { y: -landing.dy } : { y: 0 }}
              transition={{ y: { type: 'tween', duration: 0.8, ease: 'easeInOut' }, layout: LARGE }}
              onAnimationComplete={() => { if (rising && matched === null) setMatched(id); }}
              className={`${rising ? 'relative z-30' : ''} ${released ? 'opacity-30' : marked && !review && !rising ? '[&>td]:opacity-50 [&_[data-name]]:text-neutral-7' : ''} ${onSelect ? 'cursor-pointer' : ''}`}
            >
              <th scope="row" className={`relative h-(--ev-row) rounded-xs p-0 text-left font-regular ${picked ? 'bg-color-1-transparent outline outline-2 outline-color-1' : rising ? 'bg-color-3-transparent outline outline-2 outline-color-3' : ''}`}>
                {dx > 0 && (
                  // The slide's track, only while dragging: it fills behind the photo toward the target at the end.
                  <span aria-hidden="true" style={{ width: `calc(${slide?.travel ?? 0}px + var(--ev-photo))` }} className={`absolute inset-y-0 left-0 flex items-center justify-end overflow-hidden rounded-full pr-xs text-s font-heavy ${marked ? 'bg-neutral-3 text-neutral-7' : 'bg-error-transparent text-error'}`}>
                    <span className={`absolute inset-y-0 left-0 rounded-full ${marked ? 'bg-neutral-5' : 'bg-error'}`} style={{ width: `calc(${dx}px + var(--ev-photo))` }} />
                    <span className="relative">{marked ? '↩' : '✕'}</span>
                  </span>
                )}
                <button
                  type="button"
                  disabled={!onSelect}
                  data-pill=""
                  aria-pressed={onSelect ? picked : undefined}
                  aria-label={`${i + 1}: ${name}${released ? ', released' : marked ? ', ruled out' : ''}`}
                  onPointerDown={onSelect ? event => press(event, id) : undefined}
                  onPointerMove={onSelect ? event => move(event, canSlide) : undefined}
                  onPointerUp={onSelect ? event => release(event, marked) : undefined}
                  onPointerCancel={cancel}
                  onContextMenu={onGuide ? event => event.preventDefault() : undefined}
                  onKeyDown={event => {
                    if (event.key === 'ArrowRight' && canSlide && !marked) { event.preventDefault(); onMark?.(id, true); }
                    else if (event.key === 'ArrowLeft' && canSlide && marked) { event.preventDefault(); onMark?.(id, false); }
                    else if (event.key === 'Enter' && event.shiftKey && onGuide) { event.preventDefault(); onGuide(id); }
                  }}
                  className="relative flex w-full touch-pan-y select-none items-center gap-xs text-left [-webkit-touch-callout:none]"
                >
                  <span
                    data-handle=""
                    style={{ transform: `translateX(${dx}px)`, transition: dx > 0 ? 'none' : 'transform 160ms ease-out' }}
                    className={`relative z-10 block w-(--ev-photo) shrink-0 ${hinted === id ? 'ev-nudge' : ''} ${wiggle ? 'ev-wiggle' : ''}`}
                  >
                    <AnimalCard species={species} number={i + 1} marked={marked} picked={picked} />
                  </span>
                  {/* Keyed by its flash, so a later move's scouting flashes it again. */}
                  <span key={flashGems.join()} data-name="" className={`min-w-0 text-xs narrow:hidden [hyphens:auto] [overflow-wrap:anywhere] ${released ? 'line-through' : ''} ${flashGems.length > 0 ? 'ev-flash' : ''}`} style={{ ...(flashGems.length > 0 ? flashStyle(flashGems) : {}), ...(dx > 0 ? { opacity: Math.max(0.15, 1 - dx / 80) } : {}) }} lang="en">{name}</span>
                  {hinted === id && <span aria-hidden="true" className="ev-hint pointer-events-none absolute inset-y-0 left-[calc(var(--ev-photo)+8px)] right-0 flex items-center bg-neutral-1 text-xs font-medium text-error narrow:right-auto narrow:w-max narrow:pr-xs">Slide to rule out →</span>}
                </button>
              </th>
              {round.orders.map((order, j) => {
                if (!done && !order.seen[i]) {
                  const guess = pencil[`${id}:${order.tag}`];
                  const starred = highlighted.has(`${id}:${order.tag}`);
                  return (
                    <td key={order.tag} data-tag={order.tag} data-hidden="" data-pencil={guess ?? ''} data-highlight={starred || undefined} {...(out ? {} : holdCell(id, order.tag))} className={`h-(--ev-row) select-none rounded-xs p-0 text-center [-webkit-touch-callout:none] ${starred ? 'ev-highlight' : picked ? 'bg-color-1-transparent' : 'bg-neutral-2'}`}>
                      <button
                        type="button"
                        disabled={!onPencil || out}
                        onClick={event => { event.stopPropagation(); onPencil?.(id, order.tag, NEXT_PENCIL[guess ?? 'none']); }}
                        onKeyDown={event => {
                          if ((event.key === 'h' || event.key === 'H') && onHighlight && !out && !event.metaKey && !event.ctrlKey && !event.altKey) {
                            event.preventDefault();
                            onHighlight(id, order.tag);
                          }
                        }}
                        aria-label={`${name}, ${columnLabel(order.tag)}: not scouted${guess ? `, your guess ${guess}` : ''}${starred ? ', highlighted' : ''}${out ? '' : '. Tap to pencil a guess. Hold, or press H, to highlight.'}`}
                        className={`h-full w-full rounded-xs outline-dashed outline-1 -outline-offset-2 outline-control-edge ${starred ? '' : 'enabled:active:bg-neutral-3'} ${guess ? 'text-m font-regular text-neutral-7' : 'font-data text-s text-neutral-7'}`}
                      >
                        <span aria-hidden="true">{guess === 'yes' ? '✓' : guess === 'no' ? '✗' : '?'}</span>
                      </button>
                    </td>
                  );
                }
                const yes = order.row[i];
                const guess = pencil[`${id}:${order.tag}`];
                const called = guess !== undefined && !missed(order);
                const fresh = !done && reveal.has(`${id}:${order.tag}`);
                const miss = review && order.answer !== null && yes !== (order.answer === 'yes');
                const lit = !done && answered[j];
                const fill = done ? (!answered[j] ? 'bg-neutral-3' : yes === truth(order) ? 'ev-match' : 'ev-clash ev-stripes') : picked ? 'bg-color-1-transparent' : 'bg-neutral-3';
                return (
                  // Keyed by the answer showing, so the cell remounts and lights up once when it lands.
                  <td key={`${order.tag}:${lit}:seen`} data-tag={order.tag} data-yes={yes} data-miss={miss || undefined} data-guess={guess ? (called ? 'right' : 'wrong') : undefined} className={`relative h-(--ev-row) rounded-xs p-0 text-center text-m font-heavy ${fill} ${lit ? 'ev-lit' : ''}`}>
                    {called && fresh && <span aria-hidden="true" className="ev-sparkle" />}
                    {!done && <motion.span aria-hidden="true" className={`relative inline-block ${yes ? 'text-color-1' : 'text-neutral-7'} ${fresh ? 'ev-flash' : ''}`} style={fresh ? flashStyle([order.gem]) : undefined} initial={review ? false : { scale: 1.6 }} animate={{ scale: 1 }} transition={LARGE}>{yes ? '✓' : '✗'}</motion.span>}
                    <span className="sr-only">{yes ? 'yes' : 'no'}{guess && (called ? ', you called it' : `, you guessed ${guess}`)}</span>
                    {guess && !called && fresh && <span aria-hidden="true" className={`ev-missed absolute right-xxs top-px ${fresh ? 'is-fresh' : ''}`}>{guess === 'yes' ? '✓' : '✗'}</span>}
                  </td>
                );
              })}
            </motion.tr>
          );
        })}
      </tbody>
    </table>
  );
}
