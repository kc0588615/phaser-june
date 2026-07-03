import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads, GameHudUpdatedEvent } from '@/game/EventBus';
import type { CluePayload } from '@/game/clueConfig';
import type { MatchBattleCombatState } from '@/game/matchBattle/types';
import { unlockSpeciesCardFromClue } from '@/lib/speciesCardUnlocks';

export interface SpeciesInfo {
  name: string;
  id: number;
  total: number;
  index: number;
  hiddenName: string;
}

const INITIAL_HUD: GameHudUpdatedEvent = {
  score: 0, movesUsed: 0, streak: 0, multiplier: 1.0, moveMultiplier: 1.0,
};

interface GameBridgeState {
  hud: GameHudUpdatedEvent;
  /** Synchronous ref — use for values needed in event handlers before React batches */
  hudRef: React.RefObject<{ score: number; movesUsed: number }>;
  clues: CluePayload[];
  /** Most recently added (non-duplicate) clue, for toast side-effects */
  latestClue: CluePayload | null;
  /** Non-duplicate clues emitted together in one move, for batched toast side-effects */
  latestClueBatch: CluePayload[];
  speciesInfo: SpeciesInfo | null;
  allCluesRevealed: boolean;
  allSpeciesCompleted: { totalSpecies: number } | null;
  guessResult: EventPayloads['species-guess-submitted'] | null;
  matchBattleCombat: MatchBattleCombatState | null;
}

const GameBridgeContext = createContext<GameBridgeState | null>(null);

export function useGameBridge() {
  const ctx = useContext(GameBridgeContext);
  if (!ctx) throw new Error('useGameBridge must be used within GameBridgeProvider');
  return ctx;
}

export function GameBridgeProvider({ children }: { children: React.ReactNode }) {
  const [hud, setHud] = useState<GameHudUpdatedEvent>(INITIAL_HUD);
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [latestClue, setLatestClue] = useState<CluePayload | null>(null);
  const [latestClueBatch, setLatestClueBatch] = useState<CluePayload[]>([]);
  const [speciesInfo, setSpeciesInfo] = useState<SpeciesInfo | null>(null);
  const [allCluesRevealed, setAllCluesRevealed] = useState(false);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<{ totalSpecies: number } | null>(null);
  const [guessResult, setGuessResult] = useState<EventPayloads['species-guess-submitted'] | null>(null);
  const [matchBattleCombat, setMatchBattleCombat] = useState<MatchBattleCombatState | null>(null);

  const hudRef = useRef<{ score: number; movesUsed: number }>({ score: 0, movesUsed: 0 });
  const clueSetRef = useRef(new Set<string>());
  const clueBatchRef = useRef<CluePayload[]>([]);
  const clueBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onHud = (d: EventPayloads['game-hud-updated']) => {
      hudRef.current = { score: d.score, movesUsed: d.movesUsed };
      setHud(d);
    };

    const flushClueBatch = () => {
      const batch = clueBatchRef.current;
      clueBatchRef.current = [];
      clueBatchTimerRef.current = null;
      if (batch.length === 0) return;
      setLatestClue(batch[batch.length - 1]);
      setLatestClueBatch(batch);
    };

    const onClue = (clue: CluePayload) => {
      const progressive = [0, 1, 2, 3, 5, 6, 7, 8];
      const key = progressive.includes(clue.category)
        ? `${clue.category}:${clue.clue}`
        : `cat:${clue.category}`;
      if (clueSetRef.current.has(key)) return;
      clueSetRef.current.add(key);
      unlockSpeciesCardFromClue(clue).catch((err) => {
        console.warn('[GameBridgeContext] Failed to persist card clue unlock:', err);
      });
      setClues(prev => [clue, ...prev]);
      clueBatchRef.current.push(clue);
      if (!clueBatchTimerRef.current) {
        clueBatchTimerRef.current = setTimeout(flushClueBatch, 0);
      }
    };

    const onNewGame = (d: EventPayloads['new-game-started']) => {
      setSpeciesInfo({ name: d.speciesName, id: d.speciesId, total: d.totalSpecies, index: d.currentIndex, hiddenName: d.hiddenSpeciesName || '' });
      setClues([]);
      setLatestClue(null);
      setLatestClueBatch([]);
      clueBatchRef.current = [];
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(null);
      setGuessResult(null);
      clueSetRef.current.clear();
    };

    const onNoSpecies = () => {
      setSpeciesInfo({ name: 'No species found at this location', id: 0, total: 0, index: 0, hiddenName: '' });
      setClues([]);
      setLatestClue(null);
      setLatestClueBatch([]);
      clueBatchRef.current = [];
      clueSetRef.current.clear();
    };

    const onAllClues = () => setAllCluesRevealed(true);
    const onAllSpecies = (d: EventPayloads['all-species-completed']) => setAllSpeciesCompleted(d);
    const onGuess = (d: EventPayloads['species-guess-submitted']) => setGuessResult(d);
    const onMatchBattleCombat = (d: MatchBattleCombatState) => setMatchBattleCombat(d);
    const onMatchBattleCombatEnded = () => setMatchBattleCombat(null);

    const onReset = () => {
      setHud(INITIAL_HUD);
      setClues([]);
      setLatestClue(null);
      setLatestClueBatch([]);
      clueBatchRef.current = [];
      setSpeciesInfo(null);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(null);
      setGuessResult(null);
      setMatchBattleCombat(null);
      hudRef.current = { score: 0, movesUsed: 0 };
      clueSetRef.current.clear();
    };

    EventBus.on('game-hud-updated', onHud);
    EventBus.on('clue-revealed', onClue);
    EventBus.on('new-game-started', onNewGame);
    EventBus.on('no-species-found', onNoSpecies);
    EventBus.on('all-clues-revealed', onAllClues);
    EventBus.on('all-species-completed', onAllSpecies);
    EventBus.on('species-guess-submitted', onGuess);
    EventBus.on('match-battle-combat-state-updated', onMatchBattleCombat);
    EventBus.on('match-battle-combat-ended', onMatchBattleCombatEnded);
    EventBus.on('game-reset', onReset);

    return () => {
      EventBus.off('game-hud-updated', onHud);
      EventBus.off('clue-revealed', onClue);
      EventBus.off('new-game-started', onNewGame);
      EventBus.off('no-species-found', onNoSpecies);
      EventBus.off('all-clues-revealed', onAllClues);
      EventBus.off('all-species-completed', onAllSpecies);
      EventBus.off('species-guess-submitted', onGuess);
      EventBus.off('match-battle-combat-state-updated', onMatchBattleCombat);
      EventBus.off('match-battle-combat-ended', onMatchBattleCombatEnded);
      EventBus.off('game-reset', onReset);
      if (clueBatchTimerRef.current) clearTimeout(clueBatchTimerRef.current);
    };
  }, []);

  const value = useMemo<GameBridgeState>(() => ({
    hud, hudRef, clues, latestClue, latestClueBatch,
    speciesInfo, allCluesRevealed, allSpeciesCompleted, guessResult, matchBattleCombat,
  }), [hud, clues, latestClue, latestClueBatch, speciesInfo, allCluesRevealed, allSpeciesCompleted, guessResult, matchBattleCombat]);

  return <GameBridgeContext.Provider value={value}>{children}</GameBridgeContext.Provider>;
}
