// Clue Match page state: loads the pool (and the place, when played from the
// globe with ?place=), runs the session reducer, and wires the board over the
// EventBus (setup, lock, matches, reshuffles).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { setDebugClueSource } from '@/game/debugBridge';
import { CLUE_GAME_GEM_TYPES } from '@/clueGame/categories';
import type { CluePool } from '@/clueGame/pool';
import { groupLabel, type Place, type PlacesResponse } from '@/clueGame/places';
import { createRound, playableSpeciesIds } from '@/clueGame/round';
import { debugSummary } from '@/clueGame/selectors';
import { clueSessionReducer } from '@/clueGame/session';
import { getJson } from '@/lib/getJson';
import { hash32, mulberry32 } from '@/lib/seededRng';

/** `?place=country:KEN`: mysteries come from that place's animals. */
function placeKeyFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('place');
}

/** `?seed=N` replays a session: same mysteries, same starting board. */
function sessionSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 && fromUrl <= 0xffff_ffff ? fromUrl : Math.floor(Math.random() * 0xffff_fffe) + 1;
}

/** Where mysteries come from once a place's own animals are all found. */
interface Region { name: string; speciesIds: number[] }

/**
 * The place from GET /api/places and its region: a country's continent, or
 * every wildlife area of the same realm. Null (play everywhere) if the place is
 * unknown or the request fails.
 */
async function loadPlace(key: string): Promise<{ place: Place; region: Region | null } | null> {
  try {
    const { places } = await getJson<PlacesResponse>('/api/places/');
    const place = places.find(candidate => candidate.key === key);
    if (!place) return null;
    const neighbors = place.kind === 'country' ? places.filter(other => other.kind === 'continent' && other.name === place.group)
      : place.kind === 'wildlife_area' ? places.filter(other => other.kind === 'wildlife_area' && other.group === place.group)
      : [];
    const speciesIds = [...new Set(neighbors.flatMap(other => other.speciesIds))];
    return { place, region: speciesIds.length > place.speciesIds.length ? { name: groupLabel(place), speciesIds } : null };
  } catch (error) {
    console.error('[ClueMatch] Failed to load the place; playing with every animal:', error);
    return null;
  }
}

export function useClueMatch() {
  const [seed] = useState(sessionSeed);
  const [placeKey] = useState(placeKeyFromUrl);
  const [place, setPlace] = useState<Place | null>(null);
  const region = useRef<Region | null>(null);
  const inRegion = useRef(false);
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
        const pool = await getJson<CluePool>('/api/clue-game/pool/');
        const found = placeKey ? await loadPlace(placeKey) : null;
        if (cancelled) return;
        if (playableSpeciesIds(pool).length < 2) {
          setLoadError('Not enough animals have clues yet. Add clues for at least two species.');
          return;
        }
        region.current = found?.region ?? null;
        setPlace(found?.place ?? null);
        dispatch({ type: 'load', pool, round: createRound(pool, rng.current, 1, { mysteryIds: found?.place.speciesIds }) });
      } catch (error) {
        console.error('[ClueMatch] Failed to load the clue pool:', error);
        if (!cancelled) setLoadError('Could not load the animal clues. Check the connection and reload.');
      }
    })();
    return () => { cancelled = true; };
  }, [placeKey]);

  useEffect(() => {
    const onSceneReady = () => setSceneGeneration(generation => generation + 1);
    const onMatched = ({ groups, cascade }: EventPayloads['gems-matched']) =>
      dispatch({ type: 'matched', groups: groups.map(group => ({ gem: group.gemType, size: group.size })), cascade });
    const onShuffled = () => dispatch({ type: 'shuffled' });
    EventBus.on('current-scene-ready', onSceneReady);
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-shuffled', onShuffled);
    return () => {
      EventBus.off('current-scene-ready', onSceneReady);
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

  const guess = useCallback((speciesId: number) => dispatch({ type: 'guess', speciesId }), []);

  const nextRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.phase !== 'solved') return;
    // After every animal of the place has been a mystery, keep exploring its region.
    const found = new Set(current.history);
    const toRegion = place && region.current && place.speciesIds.every(id => found.has(id)) ? region.current : null;
    const scope = toRegion && !inRegion.current ? toRegion.name : undefined;
    inRegion.current = Boolean(toRegion);
    dispatch({
      type: 'start-round',
      round: createRound(current.pool, rng.current, current.round.round + 1, { recent: current.history, mysteryIds: toRegion?.speciesIds ?? place?.speciesIds, scope }),
    });
  }, [place]);

  return { session, loadError, seed, place, guess, nextRound };
}
