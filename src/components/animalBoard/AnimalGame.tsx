// The animal board screen (plans 044, 045). Mobile-first: the evidence grid on top
// (its corner holds the menu, hearts and moves; its Camera cell, the witness notes), then the board, which
// is as tall as the screen is wide, then the status line when the phone is tall
// enough (globals.css `roomy`); a tall phone's spare height grows the grid's rows.
// From the md breakpoint the board takes the left, the grid and status the right; from
// lg the witness notes fill the space below them (no notes drawer there).
// In the grid, an animal's name pill picks it (tap), opens its field guide (hold)
// and rules it out (slide right).
import Head from 'next/head';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Heart, Menu, Pause } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { AnimalLogEntry } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import { sightingPoint } from '@/clueGame/places';
import { CONTINENT_NAMES } from '@/clueGame/regions';
import { EventBus, type BoardKey } from '@/game/EventBus';
import { reducedMotion } from '@/game/motion';
import { isSoundOn, setSoundOn, sfx, wakeOnFirstGesture } from '@/game/sfx';
import { JournalSheet } from '@/components/clueGame/JournalSheet';
import { WithBlanks } from '@/components/clueGame/LogEntryText';
import { PhaserGame } from '@/components/clueGame/PhaserGame';
import { useJournal } from '@/components/clueGame/useJournal';
import { ANIMAL_HOW_TO_KEY, AnimalHowToPlay, GameMenu, NotesList, NotesSheet, OutOfMovesSheet, RoundEndSheet, SuspectSheet } from './AnimalSheets';
import { EvidenceGrid } from './EvidenceGrid';
import { useAnimalSession } from './useAnimalSession';
import { useShownOrders } from './useShownOrders';

/** Set once the slide-to-rule-out hint has played. */
const SLIDE_HINT_KEY = 'critter-connect:slide-hint:v1';

const BOARD_KEYS = new Set<string>(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

function onBoardKey(event: React.KeyboardEvent): void {
  if (!BOARD_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  EventBus.emit('clue-board-key', { key: event.key as BoardKey, shift: event.shiftKey });
}

type Pencil = Readonly<Record<string, 'yes' | 'no'>>;
const NO_REVEAL: ReadonlySet<string> = new Set();
/** How long a just-scouted guess sparkles (or shows crossed out) in the grid; the sparkle runs 3 s. */
const REVEAL_MS = 3100;

function LogText({ entry, nameOf, count, pencil = {} }: { entry: AnimalLogEntry; nameOf: (id: number) => string; count: number; pencil?: Pencil }): ReactNode {
  switch (entry.kind) {
    case 'answer': return <span>{clueFace(entry.tag)} {entry.question} <Stamp>{entry.answer === 'yes' ? 'Yes.' : 'No.'}</Stamp></span>;
    case 'scouted': {
      const guess = pencil[`${entry.id}:${entry.tag}`];
      return (
        <span>
          🔍 The {nameOf(entry.id)}: {clueFace(entry.tag)} {entry.question} <b className="font-medium">{entry.yes ? 'Yes.' : 'No.'}</b>
          {guess && ((guess === 'yes') === entry.yes ? <> <Stamp>You called it! ✨</Stamp></> : <span className="text-neutral-7"> You guessed {guess === 'yes' ? 'Yes' : 'No'}.</span>)}
        </span>
      );
    }
    case 'note': return <span>📓 <WithBlanks text={entry.note.text} /> <span className="text-neutral-7">Fits {entry.note.fits} of {count}.</span></span>;
    case 'released': return <span>The {nameOf(entry.id)} {entry.walked ? 'wandered off' : 'left'} the board.</span>;
    case 'escaped': return <span className="font-medium text-error">The {nameOf(entry.id)} was the one the camera saw. It escaped!</span>;
    case 'found': return <span className="font-medium text-color-1">Found it: the {nameOf(entry.id)}!</span>;
    case 'out-of-moves': return <span>Out of moves!</span>;
    case 'named': return <span>You named the {nameOf(entry.id)}.</span>;
  }
}

/** A landed answer: cc's emphasis pair (color-3 with its foreground) in both modes. */
function Stamp({ children }: { children: ReactNode }) {
  return <b className="rounded-xs bg-emphasis-icon px-xxs font-heavy text-on-emphasis-icon">{children}</b>;
}

/** Tailwind's lg breakpoint: the witness notes sit beside the board instead of in a drawer. */
const WIDE = '(min-width: 64rem)';

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const onChange = () => setWide(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return wide;
}

type Sheet = { kind: 'suspect'; id: number } | { kind: 'notes' } | { kind: 'menu' } | null;
/** A passing message in the status line, shown until the next event (`seen`: how many events were showing; `own`: answers the player's action). */
interface Hint { id: number; text: ReactNode; seen: number; roundNo: number; own: boolean }

/** Reading time for a status line: 1.5 s to look over plus 0.3 s a word (~200 wpm), 4-8 s; a new one at least 6 s. */
function dwellMs(text: string, fresh: boolean): number {
  const ms = Math.min(8000, Math.max(4000, 1500 + 300 * text.split(/\s+/).filter(Boolean).length));
  return fresh ? Math.max(ms, 6000) : ms;
}

/** A landed answer or witness note; `key` is its index in the round's log. */
interface Fact { key: number; node: ReactNode }
/** What changed `now`: the player's own action or the round's end, a new answer or note, or another event. */
type NowKind = 'urgent' | 'fact' | 'event';

/**
 * The status line. New answers and witness notes each get a full turn (a burst queues up),
 * then they take turns round-robin, each for its reading time. Other events show between
 * them but never cut a new one short; the player's own actions and the round's end always
 * show at once. Text too long for two lines scrolls up to its end. A tap pauses; another
 * resumes and moves on.
 */
function StatusTicker({ now, nowKey, nowKind, facts }: { now: ReactNode; nowKey: string; nowKind: NowKind; facts: Fact[] }) {
  // `key`: the fact showing, or null for `node` (`now` as it was when it came in); `fresh`: held longer.
  const [at, setAt] = useState<{ key: number | null; fresh: boolean; node?: ReactNode }>({ key: null, fresh: true, node: now });
  const [paused, setPaused] = useState(false);
  const [scroll, setScroll] = useState(0);
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const seen = useRef(new Set<number>());
  const last = useRef<number | null>(null);
  const latest = useRef(facts);
  useEffect(() => { latest.current = facts; }, [facts]);
  useEffect(() => { if (at.key !== null) last.current = at.key; }, [at]);

  // The oldest fact not yet shown in full, else the one after the last shown; never the same twice running.
  const next = useCallback(() => setAt(current => {
    const all = latest.current;
    const unseen = all.find(fact => !seen.current.has(fact.key));
    if (unseen) return { key: unseen.key, fresh: true };
    if (all.length === 0) return current;
    const key = all[(all.findIndex(fact => fact.key === last.current) + 1) % all.length].key;
    return key === current.key ? current : { key, fresh: false };
  }), []);
  // Moving on from a fact counts it as read (one cut short by an event comes round again as new).
  const finish = useCallback(() => {
    if (at.key !== null) seen.current.add(at.key);
    next();
  }, [at.key, next]);

  const shownKey = useRef(nowKey);
  useEffect(() => {
    if (shownKey.current === nowKey) return;
    shownKey.current = nowKey;
    if (nowKind === 'urgent') { setPaused(false); setAt({ key: null, fresh: true, node: now }); return; }
    // Paused, or a new answer or note still being read: leave it (new ones queue).
    if (paused || (at.key !== null && at.fresh)) return;
    if (nowKind === 'event') setAt({ key: null, fresh: true, node: now });
    else next();
  }, [now, nowKey, nowKind, paused, at.key, at.fresh, next]);

  // How far the text showing overflows its two lines.
  useLayoutEffect(() => setScroll(Math.max(0, (text.current?.offsetHeight ?? 0) - (box.current?.clientHeight ?? 0))), [at.key, nowKey]);
  const scrollMs = scroll * 50;
  useEffect(() => {
    if (paused) return;
    const read = dwellMs(text.current?.textContent ?? '', at.fresh);
    const timer = window.setTimeout(finish, scroll ? Math.max(read, 1500 + scrollMs + 2500) : read);
    return () => window.clearTimeout(timer);
  }, [at, paused, finish, scroll, scrollMs]);

  const onTap = () => {
    if (!paused) { setPaused(true); return; }
    setPaused(false);
    finish();
  };

  const index = at.key === null ? -1 : facts.findIndex(fact => fact.key === at.key);
  return (
    // The live region announces each event once; this rotating copy is for the eyes, and the button pauses it.
    <button
      type="button"
      aria-pressed={paused}
      aria-label="Pause the clue line"
      onClick={onTap}
      className="mx-xs my-xxs hidden h-12 min-w-0 shrink-0 select-none items-center gap-xs rounded-full bg-neutral-2 px-m text-left text-s [grid-area:status] roomy:flex md:mx-s md:flex"
    >
      <span key={index < 0 ? `now-${nowKey}` : `fact-${at.key}`} ref={box} aria-hidden="true" className="ev-fade block max-h-[2lh] min-w-0 grow overflow-hidden">
        <span ref={text} className={`block ${scroll ? 'ev-scroll' : ''}`} style={scroll ? { '--scroll-y': `-${scroll}px`, '--scroll-ms': `${scrollMs}ms` } as CSSProperties : undefined}>
          {index < 0 ? at.node : facts[index].node}
        </span>
      </span>
      {(paused || (index >= 0 && facts.length > 1)) && (
        <span aria-hidden="true" className="flex shrink-0 items-center gap-xxs font-data text-xs tabular-nums text-neutral-7">
          {index >= 0 && facts.length > 1 && <span className="whitespace-nowrap">Clue {index + 1} of {facts.length}</span>}
          {paused && <Pause className="h-3 w-3 fill-current" />}
        </span>
      )}
    </button>
  );
}

export function AnimalGame() {
  const { session, loadError, seed, rules, recordedRound, pool, place, continent, markSuspect, name, nextRound, pencil, highlight } = useAnimalSession();
  const { journal, records, record } = useJournal();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [boardStatus, setBoardStatus] = useState('');
  const [soundOn, setSoundOnState] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const wide = useWide();
  const [hint, setHint] = useState<Hint | null>(null);
  const [boardBusy, setBoardBusy] = useState(false);
  // Pencilled cells just scouted, for the grid's one-time sparkle (or crossed-out guess).
  const [reveal, setReveal] = useState(NO_REVEAL);
  useEffect(() => {
    if (reveal.size === 0) return;
    const timer = window.setTimeout(() => setReveal(NO_REVEAL), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [reveal]);
  // The field guide's drawer reaches up to the board's top edge (the grid above stays visible).
  const board = useRef<HTMLElement>(null);
  const [boardTop, setBoardTop] = useState(0);
  const guideOpen = sheet?.kind === 'suspect';
  useLayoutEffect(() => {
    if (!guideOpen) return;
    const measure = () => setBoardTop(board.current?.getBoundingClientRect().top ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [guideOpen]);
  useEffect(() => setSoundOnState(isSoundOn()), []);
  useEffect(() => wakeOnFirstGesture(), []);
  const toggleSound = useCallback(() => { setSoundOn(!soundOn); setSoundOnState(!soundOn); }, [soundOn]);

  useEffect(() => {
    const onAnnounce = (text: string) => setBoardStatus(text);
    // A tapped tile picks (or drops) its animal; a move drops the pick, so its events show.
    const onTile = ({ id }: { id: number }) => setSelected(current => (current === id ? null : id));
    const onMatched = ({ cascade }: { cascade: boolean }) => { setBoardBusy(true); if (!cascade) setSelected(null); };
    const onSettled = () => setBoardBusy(false);
    // A long-pressed tile opens its animal's field guide.
    const onTileHold = ({ id }: { id: number }) => setSheet({ kind: 'suspect', id });
    EventBus.on('clue-board-announce', onAnnounce);
    EventBus.on('clue-board-tile', onTile);
    EventBus.on('clue-board-tile-hold', onTileHold);
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-settled', onSettled);
    return () => {
      EventBus.off('clue-board-announce', onAnnounce);
      EventBus.off('clue-board-tile', onTile);
      EventBus.off('clue-board-tile-hold', onTileHold);
      EventBus.off('gems-matched', onMatched);
      EventBus.off('clue-board-settled', onSettled);
    };
  }, []);
  useEffect(() => {
    try { if (!window.localStorage.getItem(ANIMAL_HOW_TO_KEY)) setHelpOpen(true); } catch { setHelpOpen(true); }
  }, []);
  // Once ever, after how to play: show the slide on the first animal (EvidenceGrid `slideHint`).
  const [slideHint, setSlideHint] = useState(false);
  const playing = session?.round.status === 'playing';
  useEffect(() => {
    if (helpOpen || !playing) return;
    try {
      if (window.localStorage.getItem(SLIDE_HINT_KEY)) return;
      window.localStorage.setItem(SLIDE_HINT_KEY, '1');
    } catch { return; }
    setSlideHint(true);
  }, [helpOpen, playing]);
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    try { window.localStorage.setItem(ANIMAL_HOW_TO_KEY, '1'); } catch { /* shows again next visit */ }
  }, []);

  const speciesById = useMemo(() => new Map((pool?.species ?? []).map(species => [species.id, species])), [pool]);
  const nameOf = useCallback((id: number) => session?.book.byId.get(id)?.name ?? 'animal', [session?.book]);
  const round = session?.round;
  const roundNo = session?.roundNo;
  const shown = useShownOrders(round, roundNo);
  useEffect(() => { setSheet(null); setSelected(null); setHint(null); setBoardBusy(false); }, [roundNo]);
  useEffect(() => { EventBus.emit('clue-board-select', { id: selected }); }, [selected, roundNo]);

  // Record each finished round once in the journal: a find, or a right name when moves ran out.
  const recorded = useRef<number | null>(null);
  const end = session?.end;
  useEffect(() => {
    if (!session || !end || recorded.current === session.roundNo || recordedRound === session.roundNo) return;
    recorded.current = session.roundNo;
    const { round: done } = session;
    if (end.outcome !== 'found' && !done.named?.correct) return;
    const species = speciesById.get(done.mysteryId);
    if (!species) return;
    const point = place ? sightingPoint(place, species.id) : null;
    const sighting = place && point ? { placeKey: place.key, placeName: place.name, lon: point[0], lat: point[1] } : undefined;
    record(species, done.movesUsed, { score: session.score, streak: session.bestStreak }, sighting);
  }, [session, end, speciesById, place, record, recordedRound]);

  // Which answers the grid shows: an order's answer stamps once its gems have landed.
  const size = rules.orderSize;
  const answerShown = useCallback((tag: string) => {
    const i = round?.orders.findIndex(order => order.tag === tag) ?? -1;
    return i >= 0 && round?.orders[i].answer !== null && (shown[i] ?? 0) >= size;
  }, [round, shown, size]);

  // Sounds: an answer when its stamp lands; a find or an escape when it happens; a sparkle when a scouted guess was right.
  const heard = useRef({ roundNo: 0, logLength: 0, answers: new Set<string>() });
  useEffect(() => {
    if (!session) return;
    const { roundNo: current, round: { log, orders }, pencil: guesses } = session;
    // A new round, or this one resumed after a reload: answers already earned don't sound or play again.
    if (heard.current.roundNo !== current) heard.current = { roundNo: current, logLength: log.length, answers: new Set(orders.filter(order => order.answer !== null).map(order => order.tag)) };
    const guessed: string[] = [];
    let called = false;
    for (const entry of log.slice(heard.current.logLength)) {
      if (entry.kind === 'found') sfx.solve();
      if (entry.kind === 'escaped') sfx.wrong();
      const guess = entry.kind === 'scouted' ? guesses[`${entry.id}:${entry.tag}`] : undefined;
      if (entry.kind === 'scouted' && guess) {
        guessed.push(`${entry.id}:${entry.tag}`);
        if ((guess === 'yes') === entry.yes) called = true;
      }
    }
    if (called) sfx.calledIt();
    if (guessed.length > 0) setReveal(new Set(guessed));
    heard.current.logLength = log.length;
    for (const order of orders) {
      if (!answerShown(order.tag) || heard.current.answers.has(order.tag)) continue;
      heard.current.answers.add(order.tag);
      sfx.answer(order.answer === 'yes');
      EventBus.emit('clue-board-answer', { tag: order.tag, yes: order.answer === 'yes' });
    }
  }, [session, answerShown]);

  const visibleLog = useMemo(() => (round?.log ?? []).filter(entry => entry.kind !== 'answer' || answerShown(entry.tag)), [round, answerShown]);
  const hintId = useRef(0);
  const say = useCallback((text: ReactNode, own = true) => setHint({ id: ++hintId.current, text, seen: visibleLog.length, roundNo: roundNo ?? 0, own }), [visibleLog.length, roundNo]);

  // Plan 046: the first try at moving an animal's card in a round says why it doesn't move.
  const nudgedRound = useRef(0);
  useEffect(() => {
    const onNudge = () => {
      if (!playing || !roundNo || nudgedRound.current === roundNo) return;
      nudgedRound.current = roundNo;
      say('📌 Animals are pinned in place. Swap the gems around them.');
    };
    EventBus.on('clue-board-nudge', onNudge);
    return () => { EventBus.off('clue-board-nudge', onNudge); };
  }, [playing, roundNo, say]);

  // The first gems into a question: say the whole question once, qualifiers and all.
  const started = useRef({ roundNo: 0, tags: new Set<string>() });
  useEffect(() => {
    if (!round || !roundNo) return;
    if (started.current.roundNo !== roundNo) started.current = { roundNo, tags: new Set() };
    round.orders.forEach((order, i) => {
      if ((shown[i] ?? 0) === 0 || order.answer || started.current.tags.has(order.tag)) return;
      started.current.tags.add(order.tag);
      say(<>{clueFace(order.tag)} {order.question} <span className="text-neutral-7">Match more of its gems to find out.</span></>, false);
    });
  }, [round, roundNo, shown, say]);

  const onQuestion = useCallback((i: number) => {
    const order = round?.orders[i];
    if (!order) return;
    say(<>{clueFace(order.tag)} {order.question} {answerShown(order.tag)
      ? <Stamp>{order.answer === 'yes' ? 'Yes.' : 'No.'}</Stamp>
      : <span className="text-neutral-7">{shown[i] ?? 0} of {size} gems.</span>}</>);
  }, [round, answerShown, say, shown, size]);

  // With a field guide open (it leaves the grid tappable), a row switches the guide to that animal.
  const onSelect = useCallback((id: number) => {
    if (round?.status !== 'playing') return;
    if (sheet?.kind === 'suspect') { setSheet({ kind: 'suspect', id }); setSelected(id); return; }
    setSelected(current => (current === id ? null : id));
  }, [round?.status, sheet?.kind]);

  // The field guide's arrows, swipe and numbers switch it to another animal (and pick that row, like onSelect).
  const onShowGuide = useCallback((id: number) => {
    setSheet({ kind: 'suspect', id });
    if (round?.status === 'playing') setSelected(id);
  }, [round?.status]);

  // Pencil a guess in a hidden cell; the first time a round, say what it is (and isn't).
  const pencilled = useRef(0);
  const onPencil = useCallback((id: number, tag: string, value: 'yes' | 'no' | null) => {
    pencil(id, tag, value);
    if (value && pencilled.current !== roundNo) {
      pencilled.current = roundNo ?? 0;
      say(<>Pencilled your guess for the {nameOf(id)}. <span className="text-neutral-7">Clear that color next to its card to see the real answer.</span></>);
    }
  }, [pencil, roundNo, nameOf, say]);

  const rule = useCallback((id: number, ruledOut: boolean) => {
    markSuspect(id, ruledOut);
    setSelected(null);
    say(ruledOut ? `You ruled out the ${nameOf(id)}. It will wander off the board, or clear a gem next to its card to release it now.` : `The ${nameOf(id)} is back in.`);
  }, [markSuspect, nameOf, say]);

  const latest = visibleLog.at(-1);
  const hinting = hint && hint.roundNo === roundNo && hint.seen === visibleLog.length;
  const status: ReactNode = hinting ? hint.text
    : latest && session && round ? <LogText entry={latest} nameOf={nameOf} count={round.suspects.length} pencil={session.pencil} />
    : round ? `The camera caught one of these ${round.suspects.length} animals. Which one? Match gems to find out.`
    : 'Match gems to fill in what the camera saw.';
  // What the status line takes turns showing: the answers (once their gems land) and witness notes so far.
  const facts = useMemo<Fact[]>(() => round ? round.log.flatMap((entry, key) => (entry.kind === 'answer' && answerShown(entry.tag)) || entry.kind === 'note'
    ? [{ key, node: <LogText entry={entry} nameOf={nameOf} count={round.suspects.length} /> }] : []) : [], [round, answerShown, nameOf]);
  const nowKind: NowKind = hinting ? (hint.own ? 'urgent' : 'event') : latest && ['found', 'escaped', 'out-of-moves', 'named'].includes(latest.kind) ? 'urgent'
    : latest?.kind === 'answer' || latest?.kind === 'note' ? 'fact' : 'event';

  const placeName = continent ? CONTINENT_NAMES[continent] : null;
  const picked = session && sheet?.kind === 'suspect' ? session.book.byId.get(sheet.id) : undefined;
  const mystery = session && round ? session.book.byId.get(round.mysteryId) : undefined;
  const trail = session?.trail;
  const inTrail = trail ? Math.min(rules.trailRounds, trail.rounds + (session?.end ? 0 : 1)) : 0;
  const pick = round && selected !== null && round.status === 'playing' ? selected : null;

  // Round over: the grid's Camera row slides onto the mystery's row first, then the round-end card opens.
  const [landed, setLanded] = useState(0);
  const onLanded = useCallback(() => setLanded(roundNo ?? 0), [roundNo]);
  const landOn = round && end && !boardBusy ? round.mysteryId : null;

  // The Camera cell opens the notes: a drawer on phones; on desktop they're already beside the board, so it shows the newest.
  const sideNotes = useRef<HTMLElement>(null);
  const openNotes = () => {
    if (!wide) { setSheet({ kind: 'notes' }); return; }
    const newest = sideNotes.current?.querySelector<HTMLElement>('li:last-child');
    if (!newest) return;
    newest.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    newest.classList.remove('ev-pulse');
    void newest.offsetWidth; // restart the pulse
    newest.classList.add('ev-pulse');
  };
  // On narrow phones (corner under 9rem) the stats wrap under the menu.
  const corner = (
    <div className="@container">
    <div className="flex flex-wrap items-center gap-xxs pb-xxs">
      <button type="button" onClick={() => setSheet({ kind: 'menu' })} aria-label="Menu" className="btn btn-ghost btn-icon shrink-0 @max-[9rem]:p-xs"><Menu className="h-5 w-5" /></button>
      <div className="min-w-0">
        <div className="flex items-center gap-xxs">
          {trail && (
            <span className="flex" role="img" aria-label={`${trail.hearts} of ${rules.hearts} hearts`}>
              {Array.from({ length: rules.hearts }, (_, i) => <Heart key={i} className={`h-3 w-3 ${i < trail.hearts ? 'fill-error text-error' : 'text-neutral-5'}`} aria-hidden="true" />)}
            </span>
          )}
          <span className="font-data text-xs tabular-nums text-neutral-7" aria-label={`Animal ${inTrail} of ${rules.trailRounds}`}>{inTrail}/{rules.trailRounds}</span>
        </div>
        <div className="whitespace-nowrap"><b className="font-data text-m font-heavy tabular-nums">{round?.movesLeft ?? 0}</b> <span className="text-xs text-neutral-7">moves</span></div>
      </div>
    </div>
    </div>
  );

  return (
    <>
      <Head><title>{placeName ? `${placeName} · Critter Connect` : 'Critter Connect'}</title></Head>
      <main className="flex h-dvh flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] overscroll-none bg-neutral-1 text-neutral-10 md:grid md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_auto_minmax(0,1fr)] md:[grid-template-areas:'board_grid'_'board_status'_'board_.'] lg:grid-cols-[minmax(0,1fr)_460px] lg:[grid-template-areas:'board_grid'_'board_status'_'board_side']">
        <h1 className="sr-only">{placeName ?? 'Critter Connect'}</h1>
        <div className="min-w-0 shrink-0 px-xxs pt-xxs [grid-area:grid] md:px-s md:pt-s">
          {session && round ? (
            <EvidenceGrid round={round} speciesById={speciesById} shown={shown} selected={pick} onSelect={onSelect} onGuide={id => setSheet({ kind: 'suspect', id })} onMark={round.status === 'playing' ? rule : undefined} slideHint={slideHint && session.roundNo === 1} onQuestion={onQuestion} onNotes={openNotes} pencil={session.pencil} onPencil={round.status === 'playing' ? onPencil : undefined} highlight={session.highlight} onHighlight={round.status === 'playing' ? highlight : undefined} reveal={reveal} landOn={landOn} onLanded={onLanded} corner={corner} />
          ) : (
            <div className="flex items-center">{corner}</div>
          )}
          {loadError && <p className="m-0 px-xs py-xxs text-s text-error" role="alert">{loadError}</p>}
          <p className="sr-only" aria-live="polite">{session ? status : 'Loading animals…'}</p>
        </div>

        <section
          ref={board}
          role="application"
          aria-label="Game board"
          aria-describedby="board-keys"
          tabIndex={0}
          onKeyDown={onBoardKey}
          className="group relative min-h-0 w-full shrink grow-0 basis-[100vw] outline-none [grid-area:board] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-color-1"
        >
          <PhaserGame className="absolute inset-0" />
          <p id="board-keys" className="pointer-events-none absolute inset-x-xs bottom-xxs m-0 hidden rounded-s bg-neutral-10 px-xs py-xxs text-center text-xs font-medium text-neutral-1 shadow-m group-focus-visible:block">
            Arrows move the cursor. Shift + arrows swap its gem that way.
          </p>
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
        </section>

        <StatusTicker key={roundNo ?? 0} now={session ? status : 'Loading animals…'} nowKey={hinting ? `h${hint.id}` : `l${visibleLog.length}`} nowKind={nowKind} facts={facts} />

        {wide && round && (
          <section ref={sideNotes} aria-labelledby="side-notes" className="min-h-0 overflow-y-auto overscroll-contain px-m pb-m pt-xs [grid-area:side]">
            <h2 id="side-notes" className="m-0 mb-xs text-xs font-medium uppercase text-neutral-7">📓 Witness notes</h2>
            <NotesList round={round} />
          </section>
        )}
      </main>

      {/* Overlays animate in and out (src/lib/motion.ts); each needs its own key here. */}
      <AnimatePresence>
        {session && round && picked && <SuspectSheet key="suspect" animal={picked} species={speciesById.get(picked.id)} round={round} top={boardTop} pencil={session.pencil} onPencil={(tag, value) => onPencil(picked.id, tag, value)} speciesById={speciesById} onMark={ruledOut => rule(picked.id, ruledOut)} onShow={onShowGuide} onClose={() => setSheet(null)} />}
        {!wide && round && sheet?.kind === 'notes' && <NotesSheet key="notes" round={round} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'menu' && (
          <GameMenu
            key="menu"
            title={placeName ?? 'Critter Connect'}
            stats={trail ? [['Animal', `${inTrail} of ${rules.trailRounds}`], ['Trail', session?.trailNo ?? 1], ['Score', session?.score ?? 0]] : null}
            soundOn={soundOn}
            onSound={toggleSound}
            onJournal={() => { setSheet(null); setJournalOpen(true); }}
            onHelp={() => { setSheet(null); setHelpOpen(true); }}
            onClose={() => setSheet(null)}
          />
        )}
        {round?.status === 'out-of-moves' && <OutOfMovesSheet key="out-of-moves" round={round} nameOf={nameOf} onName={name} />}
        {session && end && mystery && !boardBusy && landed === session.roundNo && (
          <RoundEndSheet key={`end-${session.roundNo}`} session={session} animal={mystery} species={speciesById.get(mystery.id)} speciesById={speciesById} nameOf={nameOf} onNext={nextRound} />
        )}
        {helpOpen && <AnimalHowToPlay key="help" rules={rules} seed={seed} onClose={closeHelp} />}
        {journalOpen && <JournalSheet key="journal" pool={pool} journal={journal} records={records} onClose={() => setJournalOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
