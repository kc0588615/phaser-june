// The game screen (plans 041, 043). Mobile-first: on a phone, a top bar, the square board
// (a panel covers it once moves run out), then the rail: the gem legend (what each
// color asks), the latest answer and the round's animals. From the md breakpoint the board takes
// the left and the rail the right.
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GEM_OF } from '@/clueGame/gems';
import { sightingPoint } from '@/clueGame/places';
import { scoreSolve, standing } from '@/clueGame/questionMatch';
import { CONTINENT_NAMES } from '@/clueGame/regions';
import type { SolveReport } from '@/clueGame/solveReport';
import { EventBus, type BoardKey } from '@/game/EventBus';
import { isSoundOn, setSoundOn, sfx, wakeOnFirstGesture } from '@/game/sfx';
import { AnimalTiles } from './AnimalTiles';
import { HOW_TO_PLAY_SEEN_KEY, HowToPlay } from './HowToPlay';
import { JournalSheet } from './JournalSheet';
import { LogEntryText, isLive } from './LogEntryText';
import { GemLegend } from './GemLegend';
import { FamilyTreeSheet, FieldGuideSheet, LogSheet, NotesSheet } from './MatchSheets';
import { PhaserGame } from './PhaserGame';
import { RevealSheet } from './RevealSheet';
import { SpendPanel } from './SpendPanel';
import { TopBar } from './TopBar';
import { useJournal } from './useJournal';
import { useMatchSession } from './useMatchSession';

const BOARD_KEYS = new Set<string>(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

/** Keys on the focused board go to the board scene (arrows, Shift+arrows, Escape). */
function onBoardKey(event: React.KeyboardEvent): void {
  if (!BOARD_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  EventBus.emit('clue-board-key', { key: event.key as BoardKey, shift: event.shiftKey });
}

/** Send a finished round to POST /api/clue-game/solves. Best effort: play never waits on it or fails because of it. */
function reportRound(report: SolveReport): void {
  fetch('/api/clue-game/solves/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(error => console.error('[Explore] Failed to save the round:', error));
}

type Sheet =
  | { kind: 'guide'; id: number }
  | { kind: 'tree' }
  | { kind: 'notes' }
  | { kind: 'log' };

export function MatchGame() {
  const { session, loadError, seed, rules, pool, place, continent, ask, buyFamilyTreeStep, guess, nextRound } = useMatchSession();
  const { journal, records, record } = useJournal();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [newDiscovery, setNewDiscovery] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [boardStatus, setBoardStatus] = useState('');
  const [soundOn, setSoundOnState] = useState(false);
  useEffect(() => setSoundOnState(isSoundOn()), []);
  useEffect(() => wakeOnFirstGesture(), []);
  const toggleSound = useCallback(() => {
    setSoundOn(!soundOn);
    setSoundOnState(!soundOn);
  }, [soundOn]);

  useEffect(() => {
    const onAnnounce = (text: string) => setBoardStatus(text);
    EventBus.on('clue-board-announce', onAnnounce);
    return () => { EventBus.off('clue-board-announce', onAnnounce); };
  }, []);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)) setHelpOpen(true);
    } catch {
      setHelpOpen(true);
    }
  }, []);
  const closeHelp = useCallback(() => {
    setHelpOpen(false);
    try { window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1'); } catch { /* shows again next visit */ }
  }, []);
  const closeJournal = useCallback(() => setJournalOpen(false), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const speciesById = useMemo(() => new Map((pool?.species ?? []).map(species => [species.id, species])), [pool]);
  const nameOf = useCallback((id: number) => session?.book.byId.get(id)?.name ?? 'animal', [session?.book]);
  const roundNo = session?.roundNo;
  useEffect(() => setSheet(null), [roundNo]);

  // Save each finished round once, and record solves in the journal (noting a first find or a new best score).
  const journalRef = useRef(journal);
  useEffect(() => { journalRef.current = journal; }, [journal]);
  const recordsRef = useRef(records);
  useEffect(() => { recordsRef.current = records; }, [records]);
  const savedRound = useRef<number | null>(null);
  const end = session?.end;
  useEffect(() => {
    if (!session || !end || savedRound.current === session.roundNo) return;
    savedRound.current = session.roundNo;
    const { round } = session;
    const species = speciesById.get(round.mysteryId);
    if (!species) return;
    const answers = round.log.flatMap(entry => entry.kind === 'answer' ? [entry] : []);
    const questionsByGem: Record<string, number> = {};
    for (const answer of answers) questionsByGem[GEM_OF[answer.category]] = (questionsByGem[GEM_OF[answer.category]] ?? 0) + 1;
    reportRound({
      seed, round: session.roundNo, speciesId: species.id, moves: round.movesUsed, wrongGuesses: round.wrongGuesses.length,
      cluesSeen: answers.length + round.log.filter(entry => entry.kind === 'note').length, relatives: 0, points: end.points,
      revealedByGem: questionsByGem,
      ...(place ? { placeKey: place.key } : {}),
      outcome: end.outcome, lastChance: end.lastChance, rulesVersion: round.rules.version, movesLeft: round.movesLeft,
      standingAtGuess: standing(round).length + round.wrongGuesses.length, notesSaved: round.notesCollected,
      treeSteps: round.log.filter(entry => entry.kind === 'step' && !entry.free).length,
      questions: answers.map(answer => ({ tag: answer.tag, answer: answer.answer })),
    });
    if (end.outcome !== 'solved') {
      setNewDiscovery(false);
      setNewBest(false);
      return;
    }
    setNewDiscovery(!journalRef.current[species.scientificName]);
    setNewBest(recordsRef.current.bestScore > 0 && session.score > recordsRef.current.bestScore);
    const point = place ? sightingPoint(place, species.id) : null;
    const sighting = place && point ? { placeKey: place.key, placeName: place.name, lon: point[0], lat: point[1] } : undefined;
    record(species, round.movesUsed, { score: session.score, streak: session.bestStreak }, sighting);
  }, [session, end, speciesById, seed, place, record]);

  const round = session?.round;
  // Sounds for what the round's log gains: an answer, a wrong guess, the solve.
  const heard = useRef({ roundNo: 0, logLength: 0 });
  useEffect(() => {
    if (!session) return;
    const { roundNo, round: { log } } = session;
    const from = heard.current.roundNo === roundNo ? heard.current.logLength : 0;
    heard.current = { roundNo, logLength: log.length };
    const added = log.slice(from);
    // Answers asked for the player can arrive several at once: one sound for the last.
    const answer = [...added].reverse().find(entry => entry.kind === 'answer' && entry.answer !== 'no-record');
    if (answer?.kind === 'answer') sfx.answer(answer.answer === 'yes');
    for (const entry of added) if (entry.kind === 'guess') (entry.correct ? sfx.solve : sfx.wrong)();
  }, [session]);
  const live = round ? isLive(round.status) : false;
  const worth = session && round && live ? scoreSolve(round, session.streak).reduce((sum, part) => sum + part.points, 0) : 0;
  const latest = round ? [...round.log].reverse().find(entry => !(entry.kind === 'step' && entry.free) && !(entry.kind === 'guess' && entry.correct)) : undefined;
  const mystery = session && round ? session.book.byId.get(round.mysteryId) : undefined;
  const guideAnimal = session && sheet?.kind === 'guide' ? session.book.byId.get(sheet.id) : undefined;
  const placeName = continent ? CONTINENT_NAMES[continent] : null;

  const onGuess = useCallback((id: number) => {
    setSheet(null);
    guess(id);
  }, [guess]);

  return (
    <>
      <Head><title>{placeName ? `${placeName} · Critter Connect` : 'Critter Connect'}</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden overscroll-none bg-[#06121a] text-white [grid-template-areas:'top'_'board'_'rail'] md:grid-cols-[minmax(0,1fr)_400px] lg:grid-cols-[minmax(0,1fr)_460px] md:grid-rows-[auto_minmax(0,1fr)] md:[grid-template-areas:'board_top'_'board_rail']">
        <TopBar
          placeName={placeName}
          roundNo={session?.roundNo ?? null}
          standing={round ? standing(round).length : 0}
          total={round?.candidateIds.length ?? 0}
          movesLeft={round?.movesLeft ?? 0}
          moves={round?.rules.moves ?? 0}
          score={session?.score ?? 0}
          streak={session?.streak ?? 0}
          worth={worth}
          soundOn={soundOn}
          onSound={toggleSound}
          onHelp={() => setHelpOpen(true)}
          onJournal={() => setJournalOpen(true)}
        />
        <section
          role="application"
          aria-label="Game board"
          aria-describedby="board-keys"
          tabIndex={0}
          onKeyDown={onBoardKey}
          className="group relative h-[min(calc(100vw-8px),calc(100dvh-490px))] w-full outline-none [grid-area:board] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-200/70 md:h-full"
        >
          <PhaserGame className="absolute inset-0" />
          {session && round && (round.status === 'out-of-moves' || round.status === 'last-chance') && (
            <SpendPanel book={session.book} round={round} nameOf={nameOf} onAsk={ask} onBuy={buyFamilyTreeStep} />
          )}
          <p id="board-keys" className="pointer-events-none absolute inset-x-2 bottom-1 m-0 hidden rounded-md bg-black/75 px-2 py-1 text-center text-[11px] text-white/90 group-focus-visible:block">
            Arrows move the cursor. Shift + arrows swap its gem that way.
          </p>
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
        </section>
        <div className="relative flex min-h-0 flex-col gap-2 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 [grid-area:rail] md:border-l md:border-white/10 md:px-3">
          {loadError && <p className="m-0 rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100" role="alert">{loadError}</p>}
          {!session && !loadError && <p className="m-0 p-2 text-xs text-white/60">Loading animals…</p>}
          {session && round && (
            <>
              <GemLegend book={session.book} round={round} onNotes={() => setSheet({ kind: 'notes' })} onTree={() => setSheet({ kind: 'tree' })} />
              <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] py-1 pl-2.5 pr-1 text-[13px] leading-snug" aria-live="polite">
                <p className="m-0 line-clamp-2 min-w-0 flex-1">
                  {latest ? <LogEntryText entry={latest} status={round.status} nameOf={nameOf} /> : (rules.questionCost > 1 ? 'Match gems to fill their dots. Full dots ask that gem\'s question.' : 'Match gems to ask their questions.')}
                </p>
                <button type="button" onClick={() => setSheet({ kind: 'log' })} className="h-10 shrink-0 rounded-lg border border-white/15 px-3 text-[12px] font-semibold text-cyan-100 active:bg-white/10">All</button>
              </div>
              <AnimalTiles round={round} speciesById={speciesById} onPick={id => setSheet({ kind: 'guide', id })} />
            </>
          )}
        </div>
      </main>

      {session && round && guideAnimal && <FieldGuideSheet animal={guideAnimal} species={speciesById.get(guideAnimal.id)} round={round} onGuess={onGuess} onClose={closeSheet} />}
      {session && round && mystery && sheet?.kind === 'tree' && <FamilyTreeSheet book={session.book} animal={mystery} round={round} onBuy={() => { buyFamilyTreeStep(); setSheet(null); }} onClose={closeSheet} />}
      {round && sheet?.kind === 'notes' && <NotesSheet round={round} nameOf={nameOf} onClose={closeSheet} />}
      {round && sheet?.kind === 'log' && <LogSheet round={round} nameOf={nameOf} onClose={closeSheet} />}
      {session && round && end && mystery && speciesById.get(mystery.id) && (
        <RevealSheet key={session.roundNo} animal={mystery} species={speciesById.get(mystery.id)!} round={round} end={end} isNew={newDiscovery} newBest={newBest} onNext={nextRound} />
      )}
      {helpOpen && <HowToPlay rules={rules} seed={seed} onClose={closeHelp} />}
      {journalOpen && <JournalSheet pool={pool} journal={journal} records={records} onClose={closeJournal} />}
    </>
  );
}
