import Head from 'next/head';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { PhaserGame, type IRefPhaserGame } from '@/PhaserGame';
import type { LootGemType } from '@/expedition/domain';
import { CLUE_GAME_GEM_TYPES, GEM_CATEGORIES } from '@/clueGame/categories';
import { usefulCategories, type ClueFit } from '@/clueGame/deduction';
import type { CluePool } from '@/clueGame/pool';
import { createRound, liveCandidates, notesLeft } from '@/clueGame/round';
import { clueSessionReducer } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import { CandidateGrid, CategoryLegend, ClueFeed } from './ClueMatchPanels';

const NEXT_ROUND_DELAY_MS = 3000;
// Free-play board: every clue color, no move limit, no seed (so no expedition field signals).
const CLUE_BOARD: EventPayloads['map-location-selected'] = {
  moveBudget: 9999,
  boardConfig: { allowedGemTypes: [...CLUE_GAME_GEM_TYPES] },
};

function sessionSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : Math.floor(Math.random() * 0xffff_fffe) + 1;
}

export function ClueMatchGame() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [boardReady, setBoardReady] = useState(false);
  const [seed] = useState(sessionSeed);
  const rng = useRef(mulberry32(seed));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(clueSessionReducer, null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/clue-game/pool');
        if (!response.ok) throw new Error(`Pool request failed (${response.status})`);
        const pool = await response.json() as CluePool;
        if (new Set(pool.clues.map(clue => clue.speciesId)).size < 2) {
          if (!cancelled) setLoadError('Not enough animals have clues yet. Add clues for at least two species.');
          return;
        }
        if (!cancelled) dispatch({ type: 'load', pool, round: createRound(pool, rng.current, 1) });
      } catch (error) {
        console.error('[ClueMatch] Failed to load the clue pool:', error);
        if (!cancelled) setLoadError('Could not load the animal clues. Check the connection and reload.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (boardReady) EventBus.emit('map-location-selected', CLUE_BOARD);
  }, [boardReady]);

  useEffect(() => {
    const onMatched = ({ groups }: EventPayloads['gems-matched']) => dispatch({ type: 'matched', gems: groups.map(group => group.gemType) });
    EventBus.on('gems-matched', onMatched);
    return () => { EventBus.off('gems-matched', onMatched); };
  }, []);

  // Stable callback: reads the latest session through a ref.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const startNextRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== 'solved') return;
    dispatch({ type: 'start-round', round: createRound(current.pool, rng.current, current.round.round + 1, current.history) });
  }, []);

  useEffect(() => {
    if (session?.phase !== 'solved') return;
    const timer = window.setTimeout(startNextRound, NEXT_ROUND_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [session?.phase, startNextRound]);

  const speciesById = useMemo(() => new Map((session?.pool.species ?? []).map(species => [species.id, species])), [session?.pool]);
  const round = session?.round;
  const roundClueFits = useMemo(() => {
    const fitsById = new Map<number, ClueFit[]>();
    if (!session) return fitsById;
    const start = session.feed.findLastIndex(item => item.kind === 'round');
    for (const item of session.feed.slice(start + 1)) {
      if (item.kind !== 'clue') continue;
      for (const [id, fit] of Object.entries(item.fits)) fitsById.set(Number(id), [...(fitsById.get(Number(id)) ?? []), fit]);
    }
    return fitsById;
  }, [session]);

  const live = round ? liveCandidates(round) : [];
  const usefulGems = useMemo(() => {
    const gems = new Set<LootGemType>();
    if (!session || !round) return gems;
    const useful = usefulCategories(liveCandidates(round), session.traits, GEM_CATEGORIES.flatMap(category => category.clueCategories));
    for (const category of GEM_CATEGORIES) if (category.clueCategories.some(clueCategory => useful.has(clueCategory))) gems.add(category.gem);
    return gems;
  }, [session, round]);
  const notes = Object.fromEntries(GEM_CATEGORIES.map(category => [category.gem, round ? notesLeft(round, category.gem) : 0])) as Record<LootGemType, number>;
  const candidates = (round?.candidateIds ?? []).flatMap(id => speciesById.get(id) ?? []);

  return (
    <>
      <Head>
        <title>Clue Match</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="flex h-dvh flex-col bg-slate-950 text-white md:flex-row">
        <div className="relative min-h-[46%] flex-1">
          <PhaserGame
            ref={phaserRef}
            currentActiveScene={scene => {
              phaserRef.current = { game: phaserRef.current?.game ?? null, scene };
              if (scene.sys.settings.key === 'Game') setBoardReady(true);
            }}
          />
        </div>
        <aside className="flex min-h-0 flex-col gap-2 border-t border-white/10 bg-[rgba(7,17,20,.96)] p-3 md:h-full md:w-[440px] md:border-l md:border-t-0" aria-label="Clue Match HUD">
          <header className="flex items-end justify-between gap-2">
            <div>
              <h1 className="m-0 text-lg font-bold leading-tight">Clue Match</h1>
              <p className="m-0 text-[11px] text-white/60">Match gems to reveal clues. Guess the mystery animal any time: earlier guesses score more.</p>
            </div>
            <dl className="m-0 flex gap-3 text-right">
              {[['Score', session?.score ?? 0], ['Streak', session?.streak ?? 0], ['Solved', session?.solved ?? 0]].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/60">{label}</dt>
                  <dd className="m-0 text-base font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </header>

          {loadError && <p className="m-0 rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100">{loadError}</p>}
          {!session && !loadError && <p className="m-0 text-xs text-white/60">Loading animals…</p>}

          {session && round && (
            <>
              <section aria-label="Mystery animal">
                <div className="mb-1 flex items-center justify-between">
                  <p className="m-0 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
                    Animal {round.round} · {live.length} of {round.candidateIds.length} still possible
                  </p>
                  {session.phase === 'solved' && (
                    <button type="button" onClick={startNextRound} className="rounded-md bg-amber-300 px-2 py-0.5 text-[11px] font-bold text-black">
                      Next animal
                    </button>
                  )}
                </div>
                <CandidateGrid
                  candidates={candidates}
                  fitsById={roundClueFits}
                  ruledOut={round.ruledOut}
                  wrongGuesses={round.wrongGuesses}
                  answerId={session.phase === 'solved' ? round.mysteryId : null}
                  canGuess={session.phase === 'playing'}
                  onGuess={speciesId => dispatch({ type: 'guess', speciesId })}
                />
              </section>
              <section aria-label="Gem categories">
                <p className="m-0 mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">Gems → clues · ★ can still narrow it down</p>
                <CategoryLegend notesLeft={notes} useful={usefulGems} />
              </section>
              <section className="flex min-h-[160px] flex-1 flex-col" aria-label="Clues">
                <p className="m-0 mb-1 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-100/60">Field clues</p>
                <ClueFeed feed={session.feed} speciesById={speciesById} candidateIds={round.candidateIds} />
              </section>
              <p className="m-0 text-[9px] text-white/30">Seed {seed}</p>
            </>
          )}
        </aside>
      </main>
    </>
  );
}
