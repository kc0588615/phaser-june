// Clue Match page. Mobile-first: on a phone, a top bar, the square board, then
// the rail (gem legend, candidates, Guess, clue feed; only the feed scrolls).
// From the md breakpoint the board takes the left and the rail the right.
import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PhaserGame } from '@/PhaserGame';
import { liveCandidates } from '@/clueGame/round';
import { candidateViews, legendViews } from '@/clueGame/selectors';
import type { SolveSummary } from '@/clueGame/session';
import { sightingPoint } from '@/clueGame/places';
import { CandidateGrid } from './CandidateGrid';
import { ClueFeed } from './ClueFeed';
import { GemLegend } from './GemLegend';
import { GuessBar } from './GuessBar';
import { HOW_TO_PLAY_SEEN_KEY, HowToPlay } from './HowToPlay';
import { JournalSheet } from './JournalSheet';
import { RevealSheet } from './RevealSheet';
import { TopBar } from './TopBar';
import { useClueMatch } from './useClueMatch';
import { reportSolve } from './reportSolve';
import { useJournal } from './useJournal';

export function ClueMatchGame() {
  const { session, loadError, seed, place, onSceneReady, guess, nextRound } = useClueMatch();
  const { journal, records, record } = useJournal();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [newDiscovery, setNewDiscovery] = useState(false);
  const [newBest, setNewBest] = useState(false);

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

  const roundNumber = session?.round.round;
  useEffect(() => setSelectedId(null), [roundNumber]);

  // Record each solve once (each solve is a new object), noting a first discovery or a new best score.
  const journalRef = useRef(journal);
  useEffect(() => { journalRef.current = journal; }, [journal]);
  const recordsRef = useRef(records);
  useEffect(() => { recordsRef.current = records; }, [records]);
  const recordedSolve = useRef<SolveSummary | null>(null);
  const lastSolve = session?.lastSolve;
  useEffect(() => {
    if (!session || !lastSolve || recordedSolve.current === lastSolve) return;
    recordedSolve.current = lastSolve;
    const species = session.pool.species.find(candidate => candidate.id === lastSolve.speciesId);
    if (!species) return;
    setNewDiscovery(!journalRef.current[species.scientificName]);
    setNewBest(recordsRef.current.bestScore > 0 && session.score > recordsRef.current.bestScore);
    const point = place ? sightingPoint(place, species.id) : null;
    const sighting = place && point ? { placeKey: place.key, placeName: place.name, lon: point[0], lat: point[1] } : undefined;
    record(species, lastSolve.moves, { score: session.score, streak: session.bestStreak }, sighting);
    const { round } = session;
    reportSolve({
      seed, round: round.round, speciesId: species.id, moves: lastSolve.moves, wrongGuesses: round.wrongGuesses.length,
      cluesSeen: lastSolve.cluesSeen, relatives: round.relatives, points: lastSolve.points,
      revealedByGem: Object.fromEntries(Object.entries(round.revealedByGem).filter(([, count]) => count !== undefined)) as Record<string, number>,
      ...(place ? { placeKey: place.key } : {}),
    });
  }, [session, lastSolve, record, seed, place]);

  const candidates = useMemo(() => session ? candidateViews(session) : [], [session]);
  const legend = useMemo(() => session ? legendViews(session) : [], [session]);
  const speciesById = useMemo(() => new Map((session?.pool.species ?? []).map(species => [species.id, species])), [session?.pool]);
  const selected = selectedId !== null && candidates.some(view => view.species.id === selectedId && view.status === 'live')
    ? speciesById.get(selectedId) ?? null
    : null;
  const answer = session?.lastSolve ? speciesById.get(session.lastSolve.speciesId) : undefined;

  const confirmGuess = useCallback(() => {
    if (selected) guess(selected.id);
  }, [selected, guess]);

  return (
    <>
      <Head>
        <title>Clue Match</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#06121a" />
      </Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden overscroll-none bg-[#06121a] text-white [grid-template-areas:'top'_'board'_'rail'] md:grid-cols-[minmax(0,1fr)_400px] lg:grid-cols-[minmax(0,1fr)_460px] md:grid-rows-[auto_minmax(0,1fr)] md:[grid-template-areas:'board_top'_'board_rail']">
        <TopBar
          placeName={place?.name ?? null}
          round={session?.round.round ?? null}
          live={session ? liveCandidates(session.round).length : 0}
          total={session?.round.candidateIds.length ?? 0}
          score={session?.score ?? 0}
          streak={session?.streak ?? 0}
          solved={session?.solved ?? 0}
          onHelp={() => setHelpOpen(true)}
          onJournal={() => setJournalOpen(true)}
        />
        <section aria-label="Game board" className="relative h-[min(calc(100vw-8px),calc(100dvh-440px))] w-full [grid-area:board] max-md:short:h-[min(calc(100vw-8px),calc(100dvh-370px))] md:h-full">
          <PhaserGame className="absolute inset-0" currentActiveScene={onSceneReady} />
        </section>
        <div className="relative flex min-h-0 flex-col gap-2 px-2 pb-[max(8px,env(safe-area-inset-bottom))] [grid-area:rail] md:border-l md:border-white/10 md:px-3 md:pt-1">
          {loadError && <p className="m-0 rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100" role="alert">{loadError}</p>}
          {!session && !loadError && <p className="m-0 p-2 text-xs text-white/60">Loading animals…</p>}
          {session && (
            <>
              <GemLegend legend={legend} />
              <CandidateGrid candidates={candidates} selectedId={selectedId} onSelect={setSelectedId} />
              <GuessBar selected={selected} canGuess={session.phase === 'playing'} onGuess={confirmGuess} />
              <ClueFeed feed={session.feed} speciesById={speciesById} displayOrder={session.round.candidateIds} />
              {session.phase === 'solved' && session.lastSolve && answer && (
                <RevealSheet key={session.round.round} species={answer} solve={session.lastSolve} isNew={newDiscovery} newBest={newBest} onNext={nextRound} />
              )}
            </>
          )}
        </div>
      </main>
      {helpOpen && <HowToPlay seed={seed} onClose={closeHelp} />}
      {journalOpen && <JournalSheet pool={session?.pool ?? null} journal={journal} records={records} onClose={closeJournal} />}
    </>
  );
}
