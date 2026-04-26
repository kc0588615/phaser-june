import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads, GameHudUpdatedEvent } from '@/game/EventBus';
import type { CluePayload } from '@/game/clueConfig';
import type { SpookTier } from '@/types/expedition';
import { unlockSpeciesCardFromClue } from '@/lib/speciesCardUnlocks';

export interface BonusPoolState {
  currentPool: number;
  startPool: number;
  pct: number;
  tier: SpookTier;
}

export interface SpeciesInfo {
  name: string;
  id: number;
  total: number;
  index: number;
  hiddenName: string;
}

export interface CrisisState {
  crisisId: string;
  options: Array<{ id: string; label: string; cost?: Record<string, number>; effect: string }>;
}

const INITIAL_HUD: GameHudUpdatedEvent = {
  score: 0, movesRemaining: 0, movesUsed: 0, maxMoves: 0, streak: 0, multiplier: 1.0, moveMultiplier: 1.0,
};

interface GameBridgeState {
  hud: GameHudUpdatedEvent;
  /** Synchronous ref — use for values needed in event handlers before React batches */
  hudRef: React.RefObject<{ score: number; movesUsed: number }>;
  clues: CluePayload[];
  /** Most recently added (non-duplicate) clue, for toast side-effects */
  latestClue: CluePayload | null;
  bonusPool: BonusPoolState | null;
  objectiveProgress: EventPayloads['node-objective-updated'] | null;
  /** Synchronous ref for objective progress — mutable so ExpeditionContext can reset between nodes */
  objectiveProgressRef: React.MutableRefObject<number>;
  encounterFlash: { label: string; emoji?: string } | null;
  speciesInfo: SpeciesInfo | null;
  allCluesRevealed: boolean;
  allSpeciesCompleted: { totalSpecies: number } | null;
  guessResult: EventPayloads['species-guess-submitted'] | null;
  crisisState: CrisisState | null;
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
  const [bonusPool, setBonusPool] = useState<BonusPoolState | null>(null);
  const [objectiveProgress, setObjectiveProgress] = useState<EventPayloads['node-objective-updated'] | null>(null);
  const [encounterFlash, setEncounterFlash] = useState<{ label: string; emoji?: string } | null>(null);
  const [speciesInfo, setSpeciesInfo] = useState<SpeciesInfo | null>(null);
  const [allCluesRevealed, setAllCluesRevealed] = useState(false);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<{ totalSpecies: number } | null>(null);
  const [guessResult, setGuessResult] = useState<EventPayloads['species-guess-submitted'] | null>(null);
  const [crisisState, setCrisisState] = useState<CrisisState | null>(null);

  const hudRef = useRef<{ score: number; movesUsed: number }>({ score: 0, movesUsed: 0 });
  const objectiveProgressRef = useRef<number>(0);
  const clueSetRef = useRef(new Set<string>());

  useEffect(() => {
    let flashTimer: ReturnType<typeof setTimeout> | null = null;

    const onHud = (d: EventPayloads['game-hud-updated']) => {
      hudRef.current = { score: d.score, movesUsed: d.movesUsed };
      setHud(d);
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
      setLatestClue(clue);
    };

    const onBonusTick = (d: EventPayloads['node-bonus-tick']) => {
      setBonusPool({ currentPool: d.currentPool, startPool: d.startPool, pct: d.pct, tier: d.tier });
    };

    const onObjective = (d: EventPayloads['node-objective-updated']) => {
      objectiveProgressRef.current = d.progress;
      setObjectiveProgress(d);
    };

    const onEncounter = (d: EventPayloads['encounter-triggered']) => {
      setEncounterFlash({ label: d.effect.label, emoji: d.souvenirDrop?.emoji });
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setEncounterFlash(null), 2000);
    };

    const onNewGame = (d: EventPayloads['new-game-started']) => {
      setSpeciesInfo({ name: d.speciesName, id: d.speciesId, total: d.totalSpecies, index: d.currentIndex, hiddenName: d.hiddenSpeciesName || '' });
      setClues([]);
      setLatestClue(null);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(null);
      setGuessResult(null);
      clueSetRef.current.clear();
    };

    const onNoSpecies = () => {
      setSpeciesInfo({ name: 'No species found at this location', id: 0, total: 0, index: 0, hiddenName: '' });
      setClues([]);
      setLatestClue(null);
      clueSetRef.current.clear();
    };

    const onAllClues = () => setAllCluesRevealed(true);
    const onAllSpecies = (d: EventPayloads['all-species-completed']) => setAllSpeciesCompleted(d);
    const onGuess = (d: EventPayloads['species-guess-submitted']) => setGuessResult(d);
    const onCrisis = (d: EventPayloads['crisis-choice-requested']) => setCrisisState({ crisisId: d.crisisId, options: d.options });
    const onNodeComplete = () => setCrisisState(null);

    const onReset = () => {
      setHud(INITIAL_HUD);
      setClues([]);
      setLatestClue(null);
      setBonusPool(null);
      setObjectiveProgress(null);
      setEncounterFlash(null);
      setSpeciesInfo(null);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(null);
      setGuessResult(null);
      setCrisisState(null);
      hudRef.current = { score: 0, movesUsed: 0 };
      objectiveProgressRef.current = 0;
      clueSetRef.current.clear();
    };

    EventBus.on('game-hud-updated', onHud);
    EventBus.on('clue-revealed', onClue);
    EventBus.on('node-bonus-tick', onBonusTick);
    EventBus.on('node-objective-updated', onObjective);
    EventBus.on('encounter-triggered', onEncounter);
    EventBus.on('new-game-started', onNewGame);
    EventBus.on('no-species-found', onNoSpecies);
    EventBus.on('all-clues-revealed', onAllClues);
    EventBus.on('all-species-completed', onAllSpecies);
    EventBus.on('species-guess-submitted', onGuess);
    EventBus.on('crisis-choice-requested', onCrisis);
    EventBus.on('node-complete', onNodeComplete);
    EventBus.on('game-reset', onReset);

    return () => {
      EventBus.off('game-hud-updated', onHud);
      EventBus.off('clue-revealed', onClue);
      EventBus.off('node-bonus-tick', onBonusTick);
      EventBus.off('node-objective-updated', onObjective);
      EventBus.off('encounter-triggered', onEncounter);
      EventBus.off('new-game-started', onNewGame);
      EventBus.off('no-species-found', onNoSpecies);
      EventBus.off('all-clues-revealed', onAllClues);
      EventBus.off('all-species-completed', onAllSpecies);
      EventBus.off('species-guess-submitted', onGuess);
      EventBus.off('crisis-choice-requested', onCrisis);
      EventBus.off('node-complete', onNodeComplete);
      EventBus.off('game-reset', onReset);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, []);

  const value = useMemo<GameBridgeState>(() => ({
    hud, hudRef, clues, latestClue, bonusPool, objectiveProgress, objectiveProgressRef,
    encounterFlash, speciesInfo, allCluesRevealed, allSpeciesCompleted, guessResult, crisisState,
  }), [hud, clues, latestClue, bonusPool, objectiveProgress, encounterFlash, speciesInfo, allCluesRevealed, allSpeciesCompleted, guessResult, crisisState]);

  return <GameBridgeContext.Provider value={value}>{children}</GameBridgeContext.Provider>;
}
