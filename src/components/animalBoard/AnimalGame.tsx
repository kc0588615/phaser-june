// The animal board screen (plan 044). Mobile-first: the evidence grid on top (its
// corner holds the menu, hearts and moves), one status line, then the board, which
// takes the rest. From the md breakpoint the board takes the left and the rest the
// right. Picking an animal (a grid row or its board tile) puts its actions in the
// status line, so ruling out takes two taps.
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Heart, Menu } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import type { AnimalLogEntry } from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import { sightingPoint } from '@/clueGame/places';
import { CONTINENT_NAMES } from '@/clueGame/regions';
import { EventBus, type BoardKey } from '@/game/EventBus';
import { isSoundOn, setSoundOn, sfx, wakeOnFirstGesture } from '@/game/sfx';
import { JournalSheet } from '@/components/clueGame/JournalSheet';
import { WithBlanks } from '@/components/clueGame/LogEntryText';
import { PhaserGame } from '@/components/clueGame/PhaserGame';
import { useJournal } from '@/components/clueGame/useJournal';
import { ANIMAL_HOW_TO_KEY, AnimalHowToPlay, GameMenu, NotesSheet, OutOfMovesSheet, RoundEndSheet, SuspectSheet } from './AnimalSheets';
import { EvidenceGrid, SuspectPhoto } from './EvidenceGrid';
import { useAnimalSession } from './useAnimalSession';
import { useShownOrders } from './useShownOrders';

const BOARD_KEYS = new Set<string>(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

function onBoardKey(event: React.KeyboardEvent): void {
  if (!BOARD_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  EventBus.emit('clue-board-key', { key: event.key as BoardKey, shift: event.shiftKey });
}

function LogText({ entry, nameOf, count }: { entry: AnimalLogEntry; nameOf: (id: number) => string; count: number }): ReactNode {
  switch (entry.kind) {
    case 'answer': return <span>{clueFace(entry.tag)} {entry.question} <Stamp>{entry.answer === 'yes' ? 'Yes.' : 'No.'}</Stamp></span>;
    case 'note': return <span>📓 <WithBlanks text={entry.note.text} /> <span className="text-neutral-7">Fits {entry.note.fits} of {count}.</span></span>;
    case 'released': return <span>The {nameOf(entry.id)} left the board.</span>;
    case 'escaped': return <span className="font-medium text-error">The {nameOf(entry.id)} was the mystery. It escaped!</span>;
    case 'found': return <span className="font-medium text-color-1">Found it: the {nameOf(entry.id)}!</span>;
    case 'out-of-moves': return <span>Out of moves!</span>;
    case 'named': return <span>You named the {nameOf(entry.id)}.</span>;
  }
}

/** A landed answer: cc's emphasis pair (color-3 with its foreground) in both modes. */
function Stamp({ children }: { children: ReactNode }) {
  return <b className="rounded-xs bg-emphasis-icon px-xxs font-heavy text-on-emphasis-icon">{children}</b>;
}

type Sheet = { kind: 'suspect'; id: number } | { kind: 'notes' } | { kind: 'menu' } | null;
/** A passing message in the status line, shown until the next event (`seen`: how many events were showing). */
interface Hint { text: ReactNode; seen: number; roundNo: number }

export function AnimalGame() {
  const { session, loadError, seed, rules, pool, place, continent, markSuspect, name, nextRound } = useAnimalSession();
  const { journal, records, record } = useJournal();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [boardStatus, setBoardStatus] = useState('');
  const [soundOn, setSoundOnState] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [boardBusy, setBoardBusy] = useState(false);
  useEffect(() => setSoundOnState(isSoundOn()), []);
  useEffect(() => wakeOnFirstGesture(), []);
  const toggleSound = useCallback(() => { setSoundOn(!soundOn); setSoundOnState(!soundOn); }, [soundOn]);

  useEffect(() => {
    const onAnnounce = (text: string) => setBoardStatus(text);
    // A tapped tile picks (or drops) its animal; a move drops the pick, so its events show.
    const onTile = ({ id }: { id: number }) => setSelected(current => (current === id ? null : id));
    const onMatched = ({ cascade }: { cascade: boolean }) => { setBoardBusy(true); if (!cascade) setSelected(null); };
    const onSettled = () => setBoardBusy(false);
    EventBus.on('clue-board-announce', onAnnounce);
    EventBus.on('clue-board-tile', onTile);
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-settled', onSettled);
    return () => {
      EventBus.off('clue-board-announce', onAnnounce);
      EventBus.off('clue-board-tile', onTile);
      EventBus.off('gems-matched', onMatched);
      EventBus.off('clue-board-settled', onSettled);
    };
  }, []);
  useEffect(() => {
    try { if (!window.localStorage.getItem(ANIMAL_HOW_TO_KEY)) setHelpOpen(true); } catch { setHelpOpen(true); }
  }, []);
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
    if (!session || !end || recorded.current === session.roundNo) return;
    recorded.current = session.roundNo;
    const { round: done } = session;
    if (end.outcome !== 'found' && !done.named?.correct) return;
    const species = speciesById.get(done.mysteryId);
    if (!species) return;
    const point = place ? sightingPoint(place, species.id) : null;
    const sighting = place && point ? { placeKey: place.key, placeName: place.name, lon: point[0], lat: point[1] } : undefined;
    record(species, done.movesUsed, { score: session.score, streak: session.bestStreak }, sighting);
  }, [session, end, speciesById, place, record]);

  // Which answers the grid shows: an order's answer stamps once its gems have landed.
  const size = rules.orderSize;
  const answerShown = useCallback((tag: string) => {
    const i = round?.orders.findIndex(order => order.tag === tag) ?? -1;
    return i >= 0 && round?.orders[i].answer !== null && (shown[i] ?? 0) >= size;
  }, [round, shown, size]);

  // Sounds: an answer when its stamp lands; a find or an escape when it happens.
  const heard = useRef({ roundNo: 0, logLength: 0, answers: new Set<string>() });
  useEffect(() => {
    if (!session) return;
    const { roundNo: current, round: { log, orders } } = session;
    if (heard.current.roundNo !== current) heard.current = { roundNo: current, logLength: 0, answers: new Set() };
    for (const entry of log.slice(heard.current.logLength)) {
      if (entry.kind === 'found') sfx.solve();
      if (entry.kind === 'escaped') sfx.wrong();
    }
    heard.current.logLength = log.length;
    for (const order of orders) {
      if (!answerShown(order.tag) || heard.current.answers.has(order.tag)) continue;
      heard.current.answers.add(order.tag);
      sfx.answer(order.answer === 'yes');
    }
  }, [session, answerShown]);

  const visibleLog = useMemo(() => (round?.log ?? []).filter(entry => entry.kind !== 'answer' || answerShown(entry.tag)), [round, answerShown]);
  const say = useCallback((text: ReactNode) => setHint({ text, seen: visibleLog.length, roundNo: roundNo ?? 0 }), [visibleLog.length, roundNo]);

  // The first gems into a question: say the whole question once, qualifiers and all.
  const started = useRef({ roundNo: 0, tags: new Set<string>() });
  useEffect(() => {
    if (!round || !roundNo) return;
    if (started.current.roundNo !== roundNo) started.current = { roundNo, tags: new Set() };
    round.orders.forEach((order, i) => {
      if ((shown[i] ?? 0) === 0 || order.answer || started.current.tags.has(order.tag)) return;
      started.current.tags.add(order.tag);
      say(<>{clueFace(order.tag)} {order.question} <span className="text-neutral-7">Match more of its gems to find out.</span></>);
    });
  }, [round, roundNo, shown, say]);

  const onQuestion = useCallback((i: number) => {
    const order = round?.orders[i];
    if (!order) return;
    say(<>{clueFace(order.tag)} {order.question} {answerShown(order.tag)
      ? <Stamp>{order.answer === 'yes' ? 'Yes.' : 'No.'}</Stamp>
      : <span className="text-neutral-7">{shown[i] ?? 0} of {size} gems.</span>}</>);
  }, [round, answerShown, say, shown, size]);

  const onSelect = useCallback((id: number) => {
    if (round?.status !== 'playing') return;
    setSelected(current => (current === id ? null : id));
  }, [round?.status]);

  const rule = useCallback((id: number, ruledOut: boolean) => {
    markSuspect(id, ruledOut);
    setSelected(null);
    say(ruledOut ? `You ruled out the ${nameOf(id)}. Clear a gem next to its tile to release it.` : `The ${nameOf(id)} is back in.`);
  }, [markSuspect, nameOf, say]);

  const latest = visibleLog.at(-1);
  const status: ReactNode = hint && hint.roundNo === roundNo && hint.seen === visibleLog.length ? hint.text
    : latest && round ? <LogText entry={latest} nameOf={nameOf} count={round.suspects.length} />
    : 'Match gems to fill a question in the grid. Tap an animal to pick it.';

  const placeName = continent ? CONTINENT_NAMES[continent] : null;
  const picked = session && sheet?.kind === 'suspect' ? session.book.byId.get(sheet.id) : undefined;
  const mystery = session && round ? session.book.byId.get(round.mysteryId) : undefined;
  const trail = session?.trail;
  const inTrail = trail ? Math.min(rules.trailRounds, trail.rounds + (session?.end ? 0 : 1)) : 0;
  const pick = round && selected !== null && round.status === 'playing' ? selected : null;
  const pickedSpecies = pick === null ? undefined : speciesById.get(pick);

  const corner = (
    <div className="flex items-center gap-xxs pb-xxs">
      <button type="button" onClick={() => setSheet({ kind: 'menu' })} aria-label="Menu" className="btn btn-ghost btn-icon shrink-0"><Menu className="h-5 w-5" /></button>
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
  );

  return (
    <>
      <Head><title>{placeName ? `${placeName} · Critter Connect` : 'Critter Connect'}</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden overscroll-none bg-neutral-1 text-neutral-10 [grid-template-areas:'grid'_'status'_'board'] md:grid-cols-[minmax(0,1fr)_400px] md:[grid-template-areas:'board_grid'_'board_status'_'board_.'] lg:grid-cols-[minmax(0,1fr)_460px]">
        <h1 className="sr-only">{placeName ?? 'Critter Connect'}</h1>
        <div className="min-w-0 px-xxs pt-xxs [grid-area:grid] md:px-s md:pt-s">
          {session && round ? (
            <EvidenceGrid round={round} speciesById={speciesById} shown={shown} selected={pick} onSelect={onSelect} onQuestion={onQuestion} corner={corner} />
          ) : (
            <div className="flex items-center">{corner}</div>
          )}
        </div>

        <div className="mx-xs my-xxs flex h-12 min-w-0 items-center gap-xs rounded-full bg-neutral-2 pl-m pr-xxs [grid-area:status] md:mx-s">
          {loadError && <p className="m-0 min-w-0 flex-1 text-s text-error" role="alert">{loadError}</p>}
          {!loadError && (
            <p className={pick === null ? 'm-0 line-clamp-2 min-w-0 flex-1 text-s' : 'sr-only'} aria-live="polite">
              {session ? status : 'Loading animals…'}
            </p>
          )}
          {round && pick !== null && (
            <>
              <span className="-ml-xs block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-3"><SuspectPhoto species={pickedSpecies} /></span>
              <b className="line-clamp-2 min-w-0 flex-1 text-s font-medium">{round.suspects.indexOf(pick) + 1}: {nameOf(pick)}</b>
              <button type="button" onClick={() => setSheet({ kind: 'suspect', id: pick })} className="btn btn-outline shrink-0">Field guide</button>
              {round.released.includes(pick) ? (
                <span className="shrink-0 px-xxs text-xs text-neutral-7">Left the board</span>
              ) : round.marked.includes(pick) ? (
                <button type="button" data-act="undo" onClick={() => rule(pick, false)} className="btn btn-outline shrink-0">Undo</button>
              ) : (
                <button type="button" data-act="rule-out" onClick={() => rule(pick, true)} className="btn btn-danger shrink-0">Rule out</button>
              )}
            </>
          )}
          {round && pick === null && (
            <button type="button" onClick={() => setSheet({ kind: 'notes' })} className="btn btn-secondary shrink-0 bg-notes/20" aria-label={`Witness notes: ${round.notes.length}`}>
              📓 {round.notes.length}
            </button>
          )}
        </div>

        <section
          role="application"
          aria-label="Game board"
          aria-describedby="board-keys"
          tabIndex={0}
          onKeyDown={onBoardKey}
          className="group relative min-h-0 w-full outline-none [grid-area:board] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-color-1"
        >
          <PhaserGame className="absolute inset-0" />
          <p id="board-keys" className="pointer-events-none absolute inset-x-xs bottom-xxs m-0 hidden rounded-s bg-neutral-10 px-xs py-xxs text-center text-xs font-medium text-neutral-1 shadow-m group-focus-visible:block">
            Arrows move the cursor. Shift + arrows swap its gem that way.
          </p>
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
        </section>
      </main>

      {/* Overlays animate in and out (src/lib/motion.ts); each needs its own key here. */}
      <AnimatePresence>
        {session && round && picked && <SuspectSheet key="suspect" animal={picked} species={speciesById.get(picked.id)} round={round} onMark={ruledOut => rule(picked.id, ruledOut)} onClose={() => setSheet(null)} />}
        {round && sheet?.kind === 'notes' && <NotesSheet key="notes" round={round} onClose={() => setSheet(null)} />}
        {sheet?.kind === 'menu' && (
          <GameMenu
            key="menu"
            title={placeName ?? 'Critter Connect'}
            detail={trail ? `Animal ${inTrail} of ${rules.trailRounds}${(session?.trailNo ?? 1) > 1 ? ` · trail ${session?.trailNo}` : ''} · Score ${session?.score ?? 0}` : 'Loading animals…'}
            soundOn={soundOn}
            onSound={toggleSound}
            onJournal={() => { setSheet(null); setJournalOpen(true); }}
            onHelp={() => { setSheet(null); setHelpOpen(true); }}
            onClose={() => setSheet(null)}
          />
        )}
        {round?.status === 'out-of-moves' && <OutOfMovesSheet key="out-of-moves" round={round} nameOf={nameOf} onName={name} />}
        {session && end && mystery && !boardBusy && (
          <RoundEndSheet key={`end-${session.roundNo}`} session={session} animal={mystery} species={speciesById.get(mystery.id)} speciesById={speciesById} nameOf={nameOf} onNext={nextRound} />
        )}
        {helpOpen && <AnimalHowToPlay key="help" rules={rules} seed={seed} onClose={closeHelp} />}
        {journalOpen && <JournalSheet key="journal" pool={pool} journal={journal} records={records} onClose={() => setJournalOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
