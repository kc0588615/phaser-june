// The game page's state (plan 041): loads the pool (and the continent, when played
// from the globe with ?place=), runs the session reducer, picks each round, and
// wires the board over the EventBus (setup, lock, matches).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { setDebugClueSource } from '@/game/debugBridge';
import { MATCH_GEMS, NOTE_GEM, kindOf } from '@/clueGame/gems';
import { debugSummary, matchSessionReducer } from '@/clueGame/matchSession';
import { MIN_PLACE_ANIMALS, type Place, type PlacesResponse } from '@/clueGame/places';
import type { CluePool } from '@/clueGame/pool';
import { DEFAULT_RULES, makeBook, newRound, pickRound, poolFor, type Animal, type Book, type RoundState } from '@/clueGame/questionMatch';
import { animalsFromPool } from '@/clueGame/questionMatchContent';
import { CONTINENT_NAMES, REGIONS, regionOfCountry, type ContinentKey } from '@/clueGame/regions';
import { getJson } from '@/lib/getJson';
import { hash32, mulberry32 } from '@/lib/seededRng';

/** `?seed=N` replays a session: same mysteries, same boards. */
function sessionSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 && fromUrl <= 0xffff_ffff ? fromUrl : Math.floor(Math.random() * 0xffff_fffe) + 1;
}

/** `?place=continent:africa` plays that continent. Older country links play the country's continent. */
export function continentOf(key: string | null): ContinentKey | null {
  if (!key) return null;
  const [kind, value = ''] = key.split(':');
  if (kind === 'continent' && value in CONTINENT_NAMES) return value as ContinentKey;
  if (kind === 'country') {
    const region = regionOfCountry(value);
    return region ? REGIONS[region].continent : null;
  }
  return null;
}

/** The globe's place for a continent, for sightings in the journal; null if the list can't load. */
async function loadPlace(continent: ContinentKey): Promise<Place | null> {
  try {
    const { places } = await getJson<PlacesResponse>('/api/places/');
    return places.find(place => place.key === `continent:${continent}`) ?? null;
  } catch (error) {
    console.error('[Explore] Failed to load the place list; sightings stay off this session:', error);
    return null;
  }
}

export function useMatchSession() {
  const [seed] = useState(sessionSeed);
  const rules = DEFAULT_RULES;
  const [continent] = useState<ContinentKey | null>(() => continentOf(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('place')));
  const [content, setContent] = useState<{ pool: CluePool; animals: Animal[]; poolIds: number[]; place: Place | null } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(matchSessionReducer, null);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const rng = useRef(mulberry32(seed));
  // Bumps each time the board scene (re)starts, so setup is re-sent after HMR too.
  const [sceneGeneration, setSceneGeneration] = useState(0);

  const dealRound = useCallback((book: Book, poolIds: number[], recent: number[]): RoundState =>
    newRound(book, rules, {
      ...pickRound(book, poolIds, rng.current, { size: rules.candidates, recent, lookAlikes: rules.lookAlikes, place: poolIds.length ? continent : null }),
      place: poolIds.length ? continent : null,
    }), [continent, rules]);

  useEffect(() => {
    if (sessionRef.current) return; // a dev hot reload re-runs effects; keep the session
    let cancelled = false;
    (async () => {
      try {
        const pool = await getJson<CluePool>('/api/clue-game/pool/');
        const animals = animalsFromPool(pool);
        const place = continent ? await loadPlace(continent) : null;
        if (cancelled) return;
        // A continent with too few animals (a hand-typed link) plays the whole world.
        const onContinent = continent ? poolFor(animals, continent) : [];
        const poolIds = onContinent.length >= MIN_PLACE_ANIMALS ? onContinent : [];
        const everyone = poolFor(animals, null);
        if (everyone.length < 2) {
          setLoadError('Not enough animals yet. Add content for at least two animals.');
          return;
        }
        const book = makeBook(animals);
        setContent({ pool, animals, poolIds, place: poolIds.length ? place : null });
        dispatch({ type: 'load', book, round: dealRound(book, poolIds.length ? poolIds : everyone, []) });
      } catch (error) {
        console.error('[Explore] Failed to load the animals:', error);
        if (!cancelled) setLoadError('Could not load the animals. Check the connection and reload.');
      }
    })();
    return () => { cancelled = true; };
  }, [continent, dealRound]);

  useEffect(() => {
    const onSceneReady = () => setSceneGeneration(generation => generation + 1);
    const onMatched = ({ groups, cascade }: EventPayloads['gems-matched']) => dispatch({
      type: 'matched',
      groups: groups.flatMap(group => { const kind = kindOf(group.gemType); return kind ? [{ kind, size: group.size, ...(group.blast ? { blast: true } : {}) }] : []; }),
      cascade,
    });
    EventBus.on('current-scene-ready', onSceneReady);
    EventBus.on('gems-matched', onMatched);
    return () => {
      EventBus.off('current-scene-ready', onSceneReady);
      EventBus.off('gems-matched', onMatched);
    };
  }, []);

  // A fresh board for every animal, from the session seed, so ?seed= replays it.
  const roundNo = session?.roundNo;
  useEffect(() => {
    if (sceneGeneration === 0 || !roundNo) return;
    EventBus.emit('clue-board-setup', {
      seed: hash32(`critter-board:${seed}:${roundNo}`), allowedGemTypes: MATCH_GEMS, rare: NOTE_GEM,
    });
  }, [sceneGeneration, roundNo, seed]);

  // The board takes moves only while the round is playing; out of moves, charges are spent in the panel instead.
  const status = session?.round.status;
  useEffect(() => {
    if (sceneGeneration === 0 || !status) return;
    EventBus.emit('clue-board-lock', { locked: status !== 'playing' });
  }, [sceneGeneration, status]);

  useEffect(() => setDebugClueSource(() => sessionRef.current ? debugSummary(sessionRef.current, seed) : null), [seed]);

  const ask = useCallback((tag: string) => dispatch({ type: 'ask', tag }), []);
  const buyFamilyTreeStep = useCallback(() => dispatch({ type: 'buy-step' }), []);
  const guess = useCallback((speciesId: number) => dispatch({ type: 'guess', speciesId }), []);
  const nextRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.end || !content) return;
    const ids = content.poolIds.length ? content.poolIds : poolFor(content.animals, null);
    dispatch({ type: 'start', round: dealRound(current.book, ids, current.history) });
  }, [content, dealRound]);

  return {
    session, loadError, seed, rules,
    pool: content?.pool ?? null,
    /** The globe place being played, if any (for its name and journal sightings). */
    place: content?.place ?? null,
    continent: content?.poolIds.length ? continent : null,
    ask, buyFamilyTreeStep, guess, nextRound,
  };
}
