// The animal board screen (plan 044). Mobile-first: the evidence grid on top (its
// corner holds the menu, hearts and moves), one status line, then the board, which
// takes the rest. From the md breakpoint the board takes the left and the rest the
// right. Picking an animal (a grid row or its board tile) puts its actions in the
// status line, so ruling out takes two taps.
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Heart, Menu } from 'lucide-react';
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
    case 'answer': return <span>{clueFace(entry.tag)} {entry.question} <b className="text-ochre">{entry.answer === 'yes' ? 'Yes.' : 'No.'}</b></span>;
    case 'note': return <span>📓 <WithBlanks text={entry.note.text} /> <span className="text-mist/60">Fits {entry.note.fits} of {count}.</span></span>;
    case 'released': return <span>The {nameOf(entry.id)} left the board.</span>;
    case 'escaped': return <span className="text-danger">The {nameOf(entry.id)} was the mystery. It escaped!</span>;
    case 'found': return <span className="text-leaf">Found it: the {nameOf(entry.id)}!</span>;
    case 'out-of-moves': return <span>Out of moves!</span>;
    case 'named': return <span>You named the {nameOf(entry.id)}.</span>;
  }
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
      say(<>{clueFace(order.tag)} {order.question} <span className="text-mist/70">Match more of its gems to find out.</span></>);
    });
  }, [round, roundNo, shown, say]);

  const onQuestion = useCallback((i: number) => {
    const order = round?.orders[i];
    if (!order) return;
    say(<>{clueFace(order.tag)} {order.question} {answerShown(order.tag)
      ? <b className="text-ochre">{order.answer === 'yes' ? 'Yes.' : 'No.'}</b>
      : <span className="text-mist/70">{shown[i] ?? 0} of {size} gems.</span>}</>);
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
    <div className="flex items-center gap-1 pb-1">
      <button type="button" onClick={() => setSheet({ kind: 'menu' })} aria-label="Menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sage hover:bg-white/10"><Menu className="h-5 w-5" /></button>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1">
          {trail && (
            <span className="flex gap-0.5" role="img" aria-label={`${trail.hearts} of ${rules.hearts} hearts`}>
              {Array.from({ length: rules.hearts }, (_, i) => <Heart key={i} className={`h-3 w-3 ${i < trail.hearts ? 'fill-danger text-danger' : 'text-mist/25'}`} aria-hidden="true" />)}
            </span>
          )}
          <span className="text-[12px] text-sage" aria-label={`Animal ${inTrail} of ${rules.trailRounds}`}>{inTrail}/{rules.trailRounds}</span>
        </div>
        <div className="whitespace-nowrap"><b className="text-base tabular-nums">{round?.movesLeft ?? 0}</b> <span className="text-[12px] text-mist/60">moves</span></div>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>{placeName ? `${placeName} · Critter Connect` : 'Critter Connect'}</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden overscroll-none bg-night text-mist [grid-template-areas:'grid'_'status'_'board'] md:grid-cols-[minmax(0,1fr)_400px] md:[grid-template-areas:'board_grid'_'board_status'_'board_.'] lg:grid-cols-[minmax(0,1fr)_460px]">
        <h1 className="sr-only">{placeName ?? 'Critter Connect'}</h1>
        <div className="min-w-0 px-1 pt-1 [grid-area:grid] md:px-3 md:pt-3">
          {session && round ? (
            <EvidenceGrid round={round} speciesById={speciesById} shown={shown} selected={pick} onSelect={onSelect} onQuestion={onQuestion} corner={corner} />
          ) : (
            <div className="flex items-center">{corner}</div>
          )}
        </div>

        <div className="mx-2 my-1.5 flex h-12 min-w-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] py-1 pl-2.5 pr-1 [grid-area:status] md:mx-3">
          {loadError && <p className="m-0 min-w-0 flex-1 text-[13px] text-danger" role="alert">{loadError}</p>}
          {!loadError && (
            <p className={pick === null ? 'm-0 line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug' : 'sr-only'} aria-live="polite">
              {session ? status : 'Loading animals…'}
            </p>
          )}
          {round && pick !== null && (
            <>
              <span className="-ml-1.5 block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white/5"><SuspectPhoto species={pickedSpecies} /></span>
              <b className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-tight">{round.suspects.indexOf(pick) + 1}: {nameOf(pick)}</b>
              <button type="button" onClick={() => setSheet({ kind: 'suspect', id: pick })} className="h-10 shrink-0 rounded-lg border border-white/20 px-2.5 text-[13px] font-semibold active:bg-white/10">Field guide</button>
              {round.released.includes(pick) ? (
                <span className="shrink-0 px-1 text-[12px] text-sage">Left the board</span>
              ) : round.marked.includes(pick) ? (
                <button type="button" data-act="undo" onClick={() => rule(pick, false)} className="h-10 shrink-0 rounded-lg border border-white/20 px-2.5 text-[13px] font-semibold active:bg-white/10">Undo</button>
              ) : (
                <button type="button" data-act="rule-out" onClick={() => rule(pick, true)} className="h-10 shrink-0 rounded-lg bg-danger px-2.5 text-[13px] font-bold text-night active:scale-[.97]">Rule out</button>
              )}
            </>
          )}
          {round && pick === null && (
            <button type="button" onClick={() => setSheet({ kind: 'notes' })} className="h-10 shrink-0 rounded-lg border border-notes/50 bg-notes/10 px-3 text-[13px] font-semibold text-mist active:bg-white/10" aria-label={`Witness notes: ${round.notes.length}`}>
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
          className="group relative min-h-0 w-full outline-none [grid-area:board] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-globe"
        >
          <PhaserGame className="absolute inset-0" />
          <p id="board-keys" className="pointer-events-none absolute inset-x-2 bottom-1 m-0 hidden rounded-md bg-black/75 px-2 py-1 text-center text-[12px] text-mist/90 group-focus-visible:block">
            Arrows move the cursor. Shift + arrows swap its gem that way.
          </p>
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
        </section>
      </main>

      {session && round && picked && <SuspectSheet animal={picked} species={speciesById.get(picked.id)} round={round} onMark={ruledOut => rule(picked.id, ruledOut)} onClose={() => setSheet(null)} />}
      {round && sheet?.kind === 'notes' && <NotesSheet round={round} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'menu' && (
        <GameMenu
          title={placeName ?? 'Critter Connect'}
          detail={trail ? `Animal ${inTrail} of ${rules.trailRounds}${(session?.trailNo ?? 1) > 1 ? ` · trail ${session?.trailNo}` : ''} · Score ${session?.score ?? 0}` : 'Loading animals…'}
          soundOn={soundOn}
          onSound={toggleSound}
          onJournal={() => { setSheet(null); setJournalOpen(true); }}
          onHelp={() => { setSheet(null); setHelpOpen(true); }}
          onClose={() => setSheet(null)}
        />
      )}
      {round?.status === 'out-of-moves' && <OutOfMovesSheet round={round} nameOf={nameOf} onName={name} />}
      {session && end && mystery && !boardBusy && (
        <RoundEndSheet key={session.roundNo} session={session} animal={mystery} species={speciesById.get(mystery.id)} speciesById={speciesById} nameOf={nameOf} onNext={nextRound} />
      )}
      {helpOpen && <AnimalHowToPlay rules={rules} seed={seed} onClose={closeHelp} />}
      {journalOpen && <JournalSheet pool={pool} journal={journal} records={records} onClose={() => setJournalOpen(false)} />}
    </>
  );
}
