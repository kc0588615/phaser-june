// Clue Match page state: loads the pool, runs the session reducer, and wires
// the board over the EventBus (setup, lock, matches, reshuffles).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { setDebugClueSource } from '@/game/debugBridge';
import { CLUE_GAME_GEM_TYPES } from '@/clueGame/categories';
import type { CluePool } from '@/clueGame/pool';
import { createRound, playableSpeciesIds } from '@/clueGame/round';
import { debugSummary } from '@/clueGame/selectors';
import { clueSessionReducer } from '@/clueGame/session';
import { hash32, mulberry32 } from '@/lib/seededRng';

/** `?seed=N` replays a session: same mysteries, same starting board. */
function sessionSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 && fromUrl <= 0xffff_ffff ? fromUrl : Math.floor(Math.random() * 0xffff_fffe) + 1;
}

export function useClueMatch() {
  const [seed] = useState(sessionSeed);
  const rng = useRef(mulberry32(seed));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(clueSessionReducer, null);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  // Bumps each time the board scene (re)starts, so setup is re-sent after HMR too.
  const [sceneGeneration, setSceneGeneration] = useState(0);

  useEffect(() => {
    if (sessionRef.current) return; // a dev hot reload re-runs effects; keep the session
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/clue-game/pool/');
        if (!response.ok) throw new Error(`Pool request failed (${response.status})`);
        const pool = await response.json() as CluePool;
        if (cancelled) return;
        if (playableSpeciesIds(pool).length < 2) {
          setLoadError('Not enough animals have clues yet. Add clues for at least two species.');
          return;
        }
        dispatch({ type: 'load', pool, round: createRound(pool, rng.current, 1) });
      } catch (error) {
        console.error('[ClueMatch] Failed to load the clue pool:', error);
        if (!cancelled) setLoadError('Could not load the animal clues. Check the connection and reload.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onMatched = ({ groups, cascade }: EventPayloads['gems-matched']) =>
      dispatch({ type: 'matched', gems: groups.map(group => group.gemType), cascade });
    const onShuffled = () => dispatch({ type: 'shuffled' });
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-shuffled', onShuffled);
    return () => {
      EventBus.off('gems-matched', onMatched);
      EventBus.off('clue-board-shuffled', onShuffled);
    };
  }, []);

  const loaded = session !== null;
  useEffect(() => {
    if (sceneGeneration === 0 || !loaded) return;
    EventBus.emit('clue-board-setup', { seed: hash32(`clue-board:${seed}`), allowedGemTypes: [...CLUE_GAME_GEM_TYPES] });
  }, [sceneGeneration, loaded, seed]);

  const phase = session?.phase;
  useEffect(() => {
    if (sceneGeneration === 0 || !phase) return;
    EventBus.emit('clue-board-lock', { locked: phase !== 'playing' });
  }, [sceneGeneration, phase]);

  useEffect(() => setDebugClueSource(() => sessionRef.current ? debugSummary(sessionRef.current, seed) : null), [seed]);

  const onSceneReady = useCallback((scene: Phaser.Scene) => {
    if (scene.sys.settings.key === 'ClueBoard') setSceneGeneration(generation => generation + 1);
  }, []);

  const guess = useCallback((speciesId: number) => dispatch({ type: 'guess', speciesId }), []);

  const nextRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== 'solved') return;
    dispatch({ type: 'start-round', round: createRound(current.pool, rng.current, current.round.round + 1, current.history) });
  }, []);

  return { session, loadError, seed, onSceneReady, guess, nextRound };
}
