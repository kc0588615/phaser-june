// The evidence grid (plan 044): one table that lines the mystery up with the five
// suspects. A column per clue (its gem as the board draws it, and a short label);
// the Mystery row, where each clue's gems fill its cell until the answer stamps it;
// then a row per suspect with that animal's own answers and its number, the same
// number its board card wears (plan 046: the same pinned card, AnimalCard). Comparing down a column is the player's job: during
// play nothing points at a contradiction. Plan 045: a suspect's answer stays "?"
// until scouted (a move's clear of that clue's color next to its tile); tap a hidden
// cell to pencil your own guess (yes, no, blank). Once scouted, a right guess's cell sparkles
// for a moment and a wrong one shows the guess crossed out (the answer is showing by then, so
// this concludes nothing); the round-end card marks every guess. An
// animal's name: tap to pick it (its tile pulses), hold for its field guide, drag its
// photo right across the name to rule it out (again to undo). `review` (the round-end card) shows
// every answer, outlines the mystery's own row and marks each earned answer that rules an animal out.
// The Camera cell opens the witness notes (every note is about the mystery): it counts
// them, pulses when one comes in, and is where a collected witness gem flies.
// Hold any answer cell to highlight it (gold, "this one matters"); its column's gem glows so the
// player remembers which gem to go for. Like pencil, the player's own mark: the rules never read it.
// Players see the mystery as "the one caught on camera" (its row: "On camera"), so it doesn't read as a sixth
// animal; a ruled-out animal's row dims (the player's own mark). `landOn` (the round is over): the Camera row
// slides down onto the mystery's own row, fades into it and the row lights up, then `onLanded`.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { NotebookPen } from 'lucide-react';
import { motion } from 'motion/react';
import type { AnimalRound } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import type { PoolSpecies } from '@/clueGame/pool';
import { columnLabel } from '@/clueGame/questionMatch';
import { LARGE, SMALL } from '@/lib/motion';
import { AnimalCard, TrapCard } from './AnimalCard';
import { FaceIcon } from './FaceIcon';

const NEXT_PENCIL = { none: 'yes', yes: 'no', no: null } as const;
const NONE: ReadonlySet<string> = new Set();
/** A press this long on an animal's row is a long press (its field guide); the board's tiles use the same (BoardController). */
const HOLD_MS = 450;
/** Holding an answer cell this long highlights it: longer than a name's hold, so a slow tap never highlights by mistake. */
const HIGHLIGHT_MS = 1000;
/** After the Camera row lands, how long its match shows before `onLanded`. */
const LANDED_MS = 900;
/** The photo is the slide's handle (`--ev-photo`, globals.css). Its track runs half the name's width; drag it halfway along to rule the animal out (or back in). */
const TRACK_SHARE = 0.5;
const SLIDE_TO_MARK = 0.5;

/**
 * A press on an animal's name: still a tap, a long press (`held`), a slide (only from the photo, `handle`), or a
 * scroll (ignored). `travel`: how far the photo can go.
 */
interface Gesture { id: number; x: number; y: number; travel: number; handle: boolean; timer: number; mode: 'press' | 'held' | 'slide' | 'scroll' }

export function EvidenceGrid({ round, speciesById, shown, selected = null, onSelect, onGuide, onMark, slideHint = false, onQuestion, onNotes, pencil = {}, onPencil, highlight = [], onHighlight, reveal = NONE, landOn = null, onLanded, corner, review = false }: {
  round: AnimalRound;
  speciesById: Map<number, PoolSpecies>;
  /** Gems each order shows as collected (the grid trails the rules while gems fly); an answer shows once its order looks full. */
  shown: readonly number[];
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
  /** The player's highlighted cells, by `${id}:${tag}`; a long press on a cell toggles one. */
  highlight?: readonly string[];
  onHighlight?: (id: number, tag: string) => void;
  /** Pencilled cells (`${id}:${tag}`) just scouted: a right guess sparkles, a wrong one shows, a ruled-out card wiggles. */
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
  const cellPress = (event: React.PointerEvent, id: number, tag: string) => {
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
  const holdCell = (id: number, tag: string) => onHighlight ? {
    onPointerDown: (event: React.PointerEvent) => cellPress(event, id, tag),
    onPointerMove: cellMove, onPointerUp: cellEnd, onPointerCancel: cellEnd, onPointerLeave: cellEnd,
    onClickCapture: cellClick,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  } : {};
  const highlighted = new Set(highlight);
  const glowing = new Set(highlight.map(key => key.slice(key.indexOf(':') + 1)));
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
  const answered = round.orders.map((order, j) => order.answer !== null && (review || (shown[j] ?? 0) >= size));
  // The end-of-round slide: how far down the mystery's row is, then whether the Camera row has arrived there.
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
  useLayoutEffect(() => {
    if (matched === null) return;
    const timer = window.setTimeout(() => onLanded?.(), LANDED_MS);
    return () => window.clearTimeout(timer);
  }, [matched, onLanded]);
  return (
    <table aria-label={review ? 'How the evidence lined up' : 'Evidence'} className="w-full table-fixed border-separate [border-spacing:3px_2px]">
      {onMark && <caption className="sr-only">Drag an animal&apos;s photo right across its name, or press the right arrow on it, to rule it out (left arrow: back in). Hold it, or press Shift and Enter, for its field guide.</caption>}
      <colgroup>
        <col />
        {round.orders.map(order => <col key={order.tag} className="w-[54px]" />)}
      </colgroup>
      <thead>
        <tr>
          <td className="p-0 align-bottom">{corner}</td>
          {round.orders.map((order, j) => (
            <th key={order.tag} scope="col" data-tag={order.tag} className="p-0 align-bottom font-regular">
              <button
                type="button"
                disabled={!onQuestion}
                onClick={() => onQuestion?.(j)}
                aria-label={order.question}
                className="flex w-full flex-col items-center gap-xxs rounded-xs pb-xxs transition-colors enabled:hover:bg-neutral-3-transparent enabled:active:bg-neutral-3 short:gap-zero short:pb-zero"
              >
                <FaceIcon gem={order.gem} face={clueFace(order.tag)} className={`h-6 w-6 text-[13px] ${!review && glowing.has(order.tag) ? 'ev-glow' : ''}`} />
                <span className="line-clamp-2 min-h-[calc(2*var(--line-xs))] text-xs text-neutral-7 short:min-h-[calc(2*var(--line-xxs))] short:text-xxs" lang="en">{columnLabel(order.tag)}</span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <motion.tr
          ref={cameraRow}
          data-mystery
          className="relative z-20"
          initial={false}
          animate={landing ? { y: landing.dy, opacity: matched === null ? 1 : 0 } : { y: 0, opacity: 1 }}
          transition={{ y: { type: 'tween', duration: 0.8, ease: 'easeInOut' }, opacity: LARGE }}
          onAnimationComplete={() => { if (landing && matched === null) setMatched(landing.id); }}
        >
          <th scope="row" className="h-(--ev-row) p-0 text-left font-medium text-neutral-10">
            {review || !onNotes ? (
              <span className="flex items-center gap-xs">
                <span className="block w-(--ev-photo) shrink-0 text-m">{trapCard}</span>
                <span className="whitespace-nowrap text-s">On camera</span>
                {markCount}
              </span>
            ) : (
              <button
                type="button"
                onClick={onNotes}
                data-flight-target="notes"
                data-notes={notes}
                aria-label={`On camera: one of these ${round.suspects.length} animals${round.marked.length > 0 ? `, ${round.marked.length} ruled out` : ''}. ${notes > 0 ? `${notes} witness note${notes === 1 ? '' : 's'}: open them` : 'No witness notes yet'}`}
                className={`relative flex h-(--ev-row) w-full items-center gap-xs rounded-xs pl-xxs text-left outline outline-[1.5px] -outline-offset-[1.5px] ${notes > 0 ? 'bg-notes/10 outline-notes/60' : 'outline-neutral-4'}`}
              >
                {/* Keyed by the count, so the cell pulses once each time a note comes in. */}
                {notes > 0 && <span key={notes} className="ev-pulse pointer-events-none absolute inset-0 rounded-xs" aria-hidden="true" />}
                <span className="block w-(--ev-photo) shrink-0 text-m">{trapCard}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="whitespace-nowrap text-s">On camera</span>
                  {/* Until the first note: which animals the camera's one is among (a fixed count, never who still fits). */}
                  <span className={`flex min-w-0 items-center gap-xxs whitespace-nowrap text-xxs font-medium ${notes > 0 ? 'text-neutral-8' : 'text-neutral-6'}`}>
                    {notes > 0 ? <NotebookPen className="h-3 w-3 shrink-0 text-notes" aria-hidden="true" /> : null}
                    <span className="min-w-0 truncate">{notes > 0 ? `${notes} note${notes === 1 ? '' : 's'}` : `One of these ${round.suspects.length} ↓`}</span>
                    {markCount}
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
                className={`relative h-(--ev-row) overflow-hidden rounded-xs p-0 text-center ${answered[j] ? 'bg-emphasis-icon text-on-emphasis-icon' : 'bg-neutral-4 text-neutral-10'}`}
              >
                {answered[j] ? (
                  <motion.span className="block text-s font-heavy" initial={review ? false : { rotateX: 90, scale: 1.3 }} animate={{ rotateX: 0, scale: 1 }} transition={LARGE}>{order.answer === 'yes' ? '✓ YES' : '✗ NO'}</motion.span>
                ) : (
                  <>
                    {!review && <motion.span className="absolute bottom-0 left-0 h-1 bg-color-3" initial={false} animate={{ width: `${(100 * have) / size}%` }} transition={SMALL} aria-hidden="true" />}
                    <span className="relative font-data text-xs font-medium tabular-nums">{review ? '?' : `${have}/${size}`}</span>
                  </>
                )}
              </td>
            );
          })}
        </motion.tr>
        {/* Sets the Camera row apart from the animals it's one of (globals.css counts its height in --ev-reserve). */}
        <tr aria-hidden="true"><td colSpan={round.orders.length + 1} className="h-1 p-0"><div className="h-px bg-neutral-4" /></td></tr>
        {round.suspects.map((id, i) => {
          const species = speciesById.get(id);
          const name = species?.commonName ?? 'animal';
          const released = round.released.includes(id) && !review && matched !== id; // the replay (and the landed match) keeps the row readable
          const marked = round.marked.includes(id) && !released;
          const picked = selected === id;
          const wasIt = (review && id === round.mysteryId) || matched === id;
          const canSlide = Boolean(onMark) && !released;
          // (The photo slides; the track behind it shows only while dragging.)
          const dx = slide?.id === id ? slide.dx : 0;
          const missed = (order: AnimalRound['orders'][number]) => {
            const guess = pencil[`${id}:${order.tag}`];
            return Boolean(guess) && (guess === 'yes') !== order.row[i];
          };
          const wiggle = marked && round.orders.some(order => reveal.has(`${id}:${order.tag}`) && missed(order));
          return (
            <tr key={id} data-suspect={id} onClick={onSelect ? () => pick(id) : undefined} data-match={wasIt || undefined} className={`${released ? 'opacity-30' : marked && !review && !wasIt ? '[&>td]:opacity-50 [&_[data-name]]:opacity-50' : ''} ${onSelect ? 'cursor-pointer' : ''}`}>
              <th scope="row" className={`relative h-(--ev-row) rounded-xs p-0 text-left font-regular ${picked ? 'bg-color-1-transparent outline outline-2 outline-color-1' : wasIt ? 'bg-color-3-transparent outline outline-2 outline-color-3' : ''}`}>
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
                  <span data-name="" className={`line-clamp-2 min-w-0 text-xs [hyphens:auto] ${released ? 'line-through' : ''}`} style={dx > 0 ? { opacity: Math.max(0.15, 1 - dx / 80) } : undefined} lang="en">{name}</span>
                  {hinted === id && <span aria-hidden="true" className="ev-hint pointer-events-none absolute inset-y-0 left-[calc(var(--ev-photo)+8px)] right-0 flex items-center bg-neutral-1 text-xs font-medium text-error">Slide to rule out →</span>}
                </button>
              </th>
              {round.orders.map((order, j) => {
                if (!review && !order.seen[i]) {
                  const guess = pencil[`${id}:${order.tag}`];
                  const starred = highlighted.has(`${id}:${order.tag}`);
                  return (
                    <td key={order.tag} data-tag={order.tag} data-hidden="" data-pencil={guess ?? ''} data-highlight={starred || undefined} {...holdCell(id, order.tag)} className={`h-(--ev-row) select-none rounded-xs p-0 text-center [-webkit-touch-callout:none] ${starred ? 'ev-highlight' : picked ? 'bg-color-1-transparent' : 'bg-neutral-2'}`}>
                      <button
                        type="button"
                        disabled={!onPencil}
                        onClick={event => { event.stopPropagation(); onPencil?.(id, order.tag, NEXT_PENCIL[guess ?? 'none']); }}
                        aria-label={`${name}, ${columnLabel(order.tag)}: not scouted${guess ? `, your guess ${guess}` : ''}${starred ? ', highlighted' : ''}. Tap to pencil a guess, hold to highlight.`}
                        className={`h-full w-full rounded-xs outline-dashed outline-1 -outline-offset-2 outline-neutral-5 ${starred ? '' : 'enabled:active:bg-neutral-3'} ${guess ? 'text-m font-regular text-neutral-7' : 'font-data text-s text-neutral-6'}`}
                      >
                        <span aria-hidden="true">{guess === 'yes' ? '✓' : guess === 'no' ? '✗' : '?'}</span>
                      </button>
                    </td>
                  );
                }
                const yes = order.row[i];
                const guess = pencil[`${id}:${order.tag}`];
                const called = guess !== undefined && !missed(order);
                const fresh = !review && reveal.has(`${id}:${order.tag}`);
                const miss = review && order.answer !== null && yes !== (order.answer === 'yes');
                const lit = !review && answered[j];
                const starred = !review && highlighted.has(`${id}:${order.tag}`);
                const fill = miss ? 'bg-error-transparent shadow-[inset_0_0_0_1.5px_var(--error)]' : starred ? 'ev-highlight' : picked ? 'bg-color-1-transparent' : 'bg-neutral-3';
                return (
                  // Keyed by the answer showing, so the cell remounts and lights up once when it lands.
                  <td key={`${order.tag}:${lit}:seen`} data-tag={order.tag} data-yes={yes} data-miss={miss || undefined} data-guess={guess ? (called ? 'right' : 'wrong') : undefined} data-highlight={starred || undefined} {...(review ? {} : holdCell(id, order.tag))} className={`relative h-(--ev-row) select-none rounded-xs p-0 text-center text-m font-heavy [-webkit-touch-callout:none] ${fill} ${lit ? 'ev-lit' : ''}`}>
                    {called && fresh && <span aria-hidden="true" className="ev-sparkle" />}
                    <motion.span aria-hidden="true" className={`relative inline-block ${yes ? 'text-color-1' : 'text-neutral-6'}`} initial={review ? false : { scale: 1.6 }} animate={{ scale: 1 }} transition={LARGE}>{yes ? '✓' : '✗'}</motion.span>
                    <span className="sr-only">{yes ? 'yes' : 'no'}{guess && (called ? ', you called it' : `, you guessed ${guess}`)}{starred && ', highlighted'}</span>
                    {guess && !called && (review || fresh) && <span aria-hidden="true" className={`ev-missed absolute right-xxs top-px ${fresh ? 'is-fresh' : ''}`}>{guess === 'yes' ? '✓' : '✗'}</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
