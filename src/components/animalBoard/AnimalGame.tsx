// The animal board screen (plan 044, Part 2 graybox). Mobile-first: a top bar
// (trail, hearts, moves, score), the five suspect cards, the square board with the
// animals pinned on it, then the clue orders and the latest event. From the md
// breakpoint the board takes the left and the rest the right.
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BookOpen, CircleHelp, Globe2, Heart, Star, Volume2, VolumeX } from 'lucide-react';
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
import { ANIMAL_HOW_TO_KEY, AnimalHowToPlay, NotesSheet, OutOfMovesSheet, RoundEndSheet, SuspectSheet } from './AnimalSheets';
import { OrderTiles } from './OrderTiles';
import { SuspectRow } from './SuspectRow';
import { useAnimalSession } from './useAnimalSession';

const BOARD_KEYS = new Set<string>(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

function onBoardKey(event: React.KeyboardEvent): void {
  if (!BOARD_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  EventBus.emit('clue-board-key', { key: event.key as BoardKey, shift: event.shiftKey });
}

function LogText({ entry, nameOf, count }: { entry: AnimalLogEntry; nameOf: (id: number) => string; count: number }): ReactNode {
  switch (entry.kind) {
    case 'answer': return <span>{clueFace(entry.tag)} {entry.question} <b className={entry.answer === 'yes' ? 'text-emerald-300' : 'text-rose-300'}>{entry.answer === 'yes' ? 'Yes.' : 'No.'}</b></span>;
    case 'note': return <span>📓 <WithBlanks text={entry.note.text} /> <span className="text-white/60">Fits {entry.note.fits} of {count}.</span></span>;
    case 'released': return <span>The {nameOf(entry.id)} left the board.</span>;
    case 'escaped': return <span className="text-rose-300">The {nameOf(entry.id)} was the mystery. It escaped!</span>;
    case 'found': return <span className="text-emerald-300">Found it: the {nameOf(entry.id)}!</span>;
    case 'out-of-moves': return <span>Out of moves!</span>;
    case 'named': return <span>You named the {nameOf(entry.id)}.</span>;
  }
}

type Sheet = { kind: 'suspect'; id: number } | { kind: 'notes' } | null;

export function AnimalGame() {
  const { session, loadError, seed, rules, pool, place, continent, markSuspect, name, nextRound } = useAnimalSession();
  const { journal, records, record } = useJournal();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [boardStatus, setBoardStatus] = useState('');
  const [soundOn, setSoundOnState] = useState(false);
  useEffect(() => setSoundOnState(isSoundOn()), []);
  useEffect(() => wakeOnFirstGesture(), []);
  const toggleSound = useCallback(() => { setSoundOn(!soundOn); setSoundOnState(!soundOn); }, [soundOn]);

  useEffect(() => {
    const onAnnounce = (text: string) => setBoardStatus(text);
    EventBus.on('clue-board-announce', onAnnounce);
    return () => { EventBus.off('clue-board-announce', onAnnounce); };
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
  const roundNo = session?.roundNo;
  useEffect(() => setSheet(null), [roundNo]);

  // Record each finished round once in the journal: a find, or a right name when moves ran out.
  const recorded = useRef<number | null>(null);
  const end = session?.end;
  useEffect(() => {
    if (!session || !end || recorded.current === session.roundNo) return;
    recorded.current = session.roundNo;
    const { round } = session;
    if (end.outcome !== 'found' && !round.named?.correct) return;
    const species = speciesById.get(round.mysteryId);
    if (!species) return;
    const point = place ? sightingPoint(place, species.id) : null;
    const sighting = place && point ? { placeKey: place.key, placeName: place.name, lon: point[0], lat: point[1] } : undefined;
    record(species, round.movesUsed, { score: session.score, streak: session.bestStreak }, sighting);
  }, [session, end, speciesById, place, record]);

  // Sounds for what the log gains: an answer, a find, an escape.
  const heard = useRef({ roundNo: 0, logLength: 0 });
  useEffect(() => {
    if (!session) return;
    const { roundNo: current, round: { log } } = session;
    const from = heard.current.roundNo === current ? heard.current.logLength : 0;
    heard.current = { roundNo: current, logLength: log.length };
    for (const entry of log.slice(from)) {
      if (entry.kind === 'answer') sfx.answer(entry.answer === 'yes');
      if (entry.kind === 'found') sfx.solve();
      if (entry.kind === 'escaped') sfx.wrong();
    }
  }, [session]);

  const round = session?.round;
  const latest = round?.log.at(-1);
  const placeName = continent ? CONTINENT_NAMES[continent] : null;
  const picked = session && sheet?.kind === 'suspect' ? session.book.byId.get(sheet.id) : undefined;
  const mystery = session && round ? session.book.byId.get(round.mysteryId) : undefined;
  const trail = session?.trail;
  const inTrail = trail ? Math.min(rules.trailRounds, trail.rounds + (session?.end ? 0 : 1)) : 0;

  return (
    <>
      <Head><title>{placeName ? `${placeName} · Critter Connect` : 'Critter Connect'}</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-y-1 overflow-hidden overscroll-none bg-[#06121a] text-white [grid-template-areas:'top'_'suspects'_'board'_'rail'] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[auto_auto_minmax(0,1fr)] md:[grid-template-areas:'board_top'_'board_suspects'_'board_rail'] lg:grid-cols-[minmax(0,1fr)_460px]">
        <header className="flex min-w-0 items-center gap-1 py-1.5 pl-1 pr-2 [grid-area:top]">
          <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Back to the globe"><Globe2 className="h-5 w-5" /></Link>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-base font-bold leading-tight">{placeName ?? 'Critter Connect'}</h1>
            <p className="m-0 truncate text-[11px] leading-tight text-cyan-100/70">
              {trail ? <>Animal {inTrail}/{rules.trailRounds}{(session?.trailNo ?? 1) > 1 ? ` · trail ${session?.trailNo}` : ''}</> : 'Loading animals…'}
            </p>
          </div>
          <dl className="m-0 ml-auto flex shrink-0 items-center gap-2.5">
            {trail && (
              <div className="flex gap-0.5" title="Hearts">
                <dt className="sr-only">Hearts</dt>
                <dd className="m-0 flex gap-0.5" aria-label={`${trail.hearts} of ${rules.hearts}`}>
                  {Array.from({ length: rules.hearts }, (_, i) => <Heart key={i} className={`h-3.5 w-3.5 ${i < trail.hearts ? 'fill-rose-400 text-rose-400' : 'text-white/25'}`} aria-hidden="true" />)}
                </dd>
              </div>
            )}
            <div className="flex flex-col items-center leading-none" title="Moves left">
              <dt className="sr-only">Moves left</dt>
              <dd className="m-0 text-base font-bold tabular-nums">{round?.movesLeft ?? 0}</dd>
              <span className="text-[9px] text-white/55" aria-hidden="true">moves</span>
            </div>
            <div className="flex items-center gap-1" title="Score">
              <dt className="sr-only">Score</dt>
              <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <dd className="m-0 text-sm font-bold tabular-nums">{session?.score ?? 0}</dd>
            </div>
          </dl>
          <button type="button" onClick={toggleSound} className="grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label={soundOn ? 'Sound on. Turn it off' : 'Sound off. Turn it on'} aria-pressed={soundOn}>
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setJournalOpen(true)} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Field journal"><BookOpen className="h-5 w-5" /></button>
          <button type="button" onClick={() => setHelpOpen(true)} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="How to play"><CircleHelp className="h-5 w-5" /></button>
        </header>

        {session && round ? <SuspectRow round={round} speciesById={speciesById} onPick={id => setSheet({ kind: 'suspect', id })} /> : <div className="[grid-area:suspects]" />}

        <section
          role="application"
          aria-label="Game board"
          aria-describedby="board-keys"
          tabIndex={0}
          onKeyDown={onBoardKey}
          className="group relative h-[min(calc(100vw-8px),calc(100dvh-330px))] w-full outline-none [grid-area:board] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-200/70 md:h-full"
        >
          <PhaserGame className="absolute inset-0" />
          <p id="board-keys" className="pointer-events-none absolute inset-x-2 bottom-1 m-0 hidden rounded-md bg-black/75 px-2 py-1 text-center text-[11px] text-white/90 group-focus-visible:block">
            Arrows move the cursor. Shift + arrows swap its gem that way.
          </p>
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
        </section>

        <div className="relative flex min-h-0 flex-col gap-1.5 px-2 pb-[max(8px,env(safe-area-inset-bottom))] [grid-area:rail] md:px-3">
          {loadError && <p className="m-0 rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100" role="alert">{loadError}</p>}
          {!session && !loadError && <p className="m-0 p-2 text-xs text-white/60">Loading animals…</p>}
          {session && round && (
            <>
              <OrderTiles round={round} />
              <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] py-1 pl-2.5 pr-1 text-[13px] leading-snug" aria-live="polite">
                <p className="m-0 line-clamp-2 min-w-0 flex-1">
                  {latest ? <LogText entry={latest} nameOf={nameOf} count={round.suspects.length} /> : 'Fill a clue to ask about the mystery. Tap an animal to rule it out.'}
                </p>
                <button type="button" onClick={() => setSheet({ kind: 'notes' })} className="h-10 shrink-0 rounded-lg border border-violet-300/40 bg-violet-400/10 px-3 text-[12px] font-semibold text-violet-100 active:bg-white/10" aria-label={`Witness notes: ${round.notes.length}`}>
                  📓 {round.notes.length}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {session && round && picked && <SuspectSheet animal={picked} species={speciesById.get(picked.id)} round={round} onMark={ruledOut => markSuspect(picked.id, ruledOut)} onClose={() => setSheet(null)} />}
      {round && sheet?.kind === 'notes' && <NotesSheet round={round} onClose={() => setSheet(null)} />}
      {round?.status === 'out-of-moves' && <OutOfMovesSheet round={round} nameOf={nameOf} onName={name} />}
      {session && end && mystery && <RoundEndSheet key={session.roundNo} session={session} animal={mystery} species={speciesById.get(mystery.id)} nameOf={nameOf} onNext={nextRound} />}
      {helpOpen && <AnimalHowToPlay rules={rules} seed={seed} onClose={closeHelp} />}
      {journalOpen && <JournalSheet pool={pool} journal={journal} records={records} onClose={() => setJournalOpen(false)} />}
    </>
  );
}
