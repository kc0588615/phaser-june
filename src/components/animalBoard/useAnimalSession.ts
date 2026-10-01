// The animal board page's state (plan 044): loads the pool (and the continent from
// ?place=), deals each round from the session seed, runs the session reducer, and
// wires the board over the EventBus (setup with tiles and faces, marks, clears,
// settled moves, lock).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ANIMAL_RULES, BOARD_GEMS, PEBBLE_GEM, WITNESS_GEM, newAnimalRound, newTrail, pickSuspectSet, tileCells,
  type AnimalRound,
} from '@/clueGame/animalBoard';
import { animalDebugSummary, animalSessionReducer } from '@/clueGame/animalSession';
import { clueFace } from '@/clueGame/clueFaces';
import { MIN_PLACE_ANIMALS, type Place, type PlacesResponse } from '@/clueGame/places';
import type { CluePool, PoolSpecies } from '@/clueGame/pool';
import { makeBook, poolFor, type Animal, type Book } from '@/clueGame/questionMatch';
import { animalsFromPool } from '@/clueGame/questionMatchContent';
import type { ContinentKey } from '@/clueGame/regions';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';
import { GRID_COLS, GRID_ROWS, type GemType } from '@/game/constants';
import { EventBus, type BoardPin, type EventPayloads } from '@/game/EventBus';
import { setDebugClueSource } from '@/game/debugBridge';
import { getJson } from '@/lib/getJson';
import { hash32, mulberry32 } from '@/lib/seededRng';
import { continentOf } from '@/components/clueGame/useMatchSession';

/** `?seed=N` replays a session: same trails, same boards. */
function sessionSeed(): number {
  if (typeof window === 'undefined') return 1;
  const fromUrl = Number(new URLSearchParams(window.location.search).get('seed'));
  return Number.isInteger(fromUrl) && fromUrl > 0 && fromUrl <= 0xffff_ffff ? fromUrl : Math.floor(Math.random() * 0xffff_fffe) + 1;
}

async function loadPlace(continent: ContinentKey): Promise<Place | null> {
  try {
    const { places } = await getJson<PlacesResponse>('/api/places/');
    return places.find(place => place.key === `continent:${continent}`) ?? null;
  } catch (error) {
    console.error('[AnimalBoard] Failed to load the place list; sightings stay off this session:', error);
    return null;
  }
}

interface Content {
  pool: CluePool;
  animals: Animal[];
  book: Book;
  place: Place | null;
  continent: ContinentKey | null;
  /** Each seed animal's suspect set (seeds that can't make one are left out). */
  sets: Map<number, number[]>;
}

interface Dealt { round: AnimalRound; boardSeed: number }

export function useAnimalSession() {
  const [seed] = useState(sessionSeed);
  const [requested] = useState<ContinentKey | null>(() => continentOf(typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('place')));
  const [content, setContent] = useState<Content | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, dispatch] = useReducer(animalSessionReducer, null);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  const rng = useRef(mulberry32(seed));
  const [sceneGeneration, setSceneGeneration] = useState(0);

  /** A round: a random seed animal's set, a mystery uniformly among it (not a recent one), a board from the set alone. */
  const deal = useCallback((data: Content, roundNo: number, recent: readonly number[]): Dealt => {
    const seeds = [...data.sets.keys()];
    let suspects = data.sets.get(seeds[0])!;
    let mysteryId = suspects[0];
    for (let tries = 0; tries < 30; tries++) {
      suspects = data.sets.get(seeds[Math.floor(rng.current() * seeds.length)])!;
      mysteryId = suspects[Math.floor(rng.current() * suspects.length)];
      if (!recent.slice(-8).includes(mysteryId)) break;
    }
    const boardSeed = hash32(`044:${seed}:${roundNo}:${suspects.join(',')}`);
    return { round: newAnimalRound(data.book, ANIMAL_RULES, { suspects, mysteryId, place: data.continent }), boardSeed };
  }, [seed]);

  useEffect(() => {
    if (sessionRef.current) return; // a dev hot reload re-runs effects; keep the session
    let cancelled = false;
    (async () => {
      try {
        const pool = await getJson<CluePool>('/api/clue-game/pool/');
        const animals = animalsFromPool(pool);
        const place = requested ? await loadPlace(requested) : null;
        if (cancelled) return;
        const onContinent = requested ? poolFor(animals, requested) : [];
        const continent = onContinent.length >= MIN_PLACE_ANIMALS ? requested : null;
        const ids = continent ? onContinent : poolFor(animals, null);
        const book = makeBook(animals);
        const sets = new Map<number, number[]>();
        for (const id of ids) {
          const set = pickSuspectSet(book, ids, id, ANIMAL_RULES, continent);
          if (set) sets.set(id, set);
        }
        if (sets.size === 0) {
          setLoadError('Not enough animals that can be told apart yet.');
          return;
        }
        const data: Content = { pool, animals, book, place: continent ? place : null, continent, sets };
        setContent(data);
        const first = deal(data, 1, []);
        dispatch({ type: 'load', book, ...first, trail: newTrail(ANIMAL_RULES) });
      } catch (error) {
        console.error('[AnimalBoard] Failed to load the animals:', error);
        if (!cancelled) setLoadError('Could not load the animals. Check the connection and reload.');
      }
    })();
    return () => { cancelled = true; };
  }, [requested, deal]);

  useEffect(() => {
    const onSceneReady = () => setSceneGeneration(generation => generation + 1);
    const onMatched = ({ groups, cascade, released = [] }: EventPayloads['gems-matched']) => {
      const collected: Partial<Record<GemType, number>> = {};
      let witness = 0;
      for (const group of groups) {
        if (group.gemType === WITNESS_GEM) witness += group.size;
        else collected[group.gemType] = (collected[group.gemType] ?? 0) + group.size;
      }
      dispatch({ type: 'matched', collected, witness, released, cascade });
    };
    const onSettled = () => dispatch({ type: 'settled' });
    EventBus.on('current-scene-ready', onSceneReady);
    EventBus.on('gems-matched', onMatched);
    EventBus.on('clue-board-settled', onSettled);
    return () => {
      EventBus.off('current-scene-ready', onSceneReady);
      EventBus.off('gems-matched', onMatched);
      EventBus.off('clue-board-settled', onSettled);
    };
  }, []);

  // A fresh board for every round: the tiles, this round's faces, and no marks.
  const roundNo = session?.roundNo;
  const speciesById = useRef(new Map<number, PoolSpecies>());
  useEffect(() => { speciesById.current = new Map((content?.pool.species ?? []).map(species => [species.id, species])); }, [content]);
  useEffect(() => {
    const current = sessionRef.current;
    if (sceneGeneration === 0 || !roundNo || !current) return;
    const { round, boardSeed } = current;
    const cells = tileCells(GRID_COLS, GRID_ROWS, round.suspects.length, mulberry32(boardSeed))!;
    const pins: BoardPin[] = round.suspects.map((id, i) => {
      const species = speciesById.current.get(id);
      return {
        cell: cells[i], id, name: current.book.byId.get(id)?.name ?? 'animal',
        photo: species?.photo ? photoAt(species.photo.url, 120) : null, label: species ? speciesBadge(species) : '?',
      };
    });
    const faces: Partial<Record<GemType, string>> = { [PEBBLE_GEM]: '' };
    for (const order of round.orders) faces[order.gem] = clueFace(order.tag);
    EventBus.emit('clue-board-setup', { seed: boardSeed, allowedGemTypes: [...BOARD_GEMS], rare: { type: WITNESS_GEM, chance: round.rules.witnessChance }, pins, faces });
    EventBus.emit('clue-board-marks', { marked: [] });
  }, [sceneGeneration, roundNo]);

  // The board releases what the rules have marked.
  const marked = session?.round.marked;
  useEffect(() => {
    if (sceneGeneration === 0 || !marked) return;
    EventBus.emit('clue-board-marks', { marked });
  }, [sceneGeneration, marked]);

  // The board takes moves only while the round is playing.
  const status = session?.round.status;
  useEffect(() => {
    if (sceneGeneration === 0 || !status) return;
    EventBus.emit('clue-board-lock', { locked: status !== 'playing' });
  }, [sceneGeneration, status]);

  useEffect(() => setDebugClueSource(() => sessionRef.current ? animalDebugSummary(sessionRef.current, seed) : null), [seed]);

  const markSuspect = useCallback((id: number, ruledOut: boolean) => dispatch({ type: 'mark', id, ruledOut }), []);
  const name = useCallback((id: number | null) => dispatch({ type: 'name', id }), []);
  const nextRound = useCallback(() => {
    const current = sessionRef.current;
    if (!current?.end || !content) return;
    const dealt = deal(content, current.roundNo + 1, current.history);
    if (current.trail.over) dispatch({ type: 'new-trail', ...dealt, trail: newTrail(ANIMAL_RULES) });
    else dispatch({ type: 'next', ...dealt });
  }, [content, deal]);

  return {
    session, loadError, seed, rules: ANIMAL_RULES,
    pool: content?.pool ?? null,
    place: content?.place ?? null,
    continent: content?.continent ?? null,
    markSuspect, name, nextRound,
  };
}
