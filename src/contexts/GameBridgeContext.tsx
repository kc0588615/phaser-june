import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads, GameHudUpdatedEvent } from '@/game/EventBus';

const INITIAL_HUD: GameHudUpdatedEvent = {
  score: 0, movesRemaining: 0, movesUsed: 0, maxMoves: 0, streak: 0, multiplier: 1.0, moveMultiplier: 1.0,
};

interface GameBridgeState {
  hud: GameHudUpdatedEvent;
  /** Synchronous ref — use for values needed in event handlers before React batches */
  hudRef: React.RefObject<{ score: number; movesUsed: number }>;
}

const GameBridgeContext = createContext<GameBridgeState | null>(null);

export function useGameBridge() {
  const ctx = useContext(GameBridgeContext);
  if (!ctx) throw new Error('useGameBridge must be used within GameBridgeProvider');
  return ctx;
}

export function GameBridgeProvider({ children }: { children: React.ReactNode }) {
  const [hud, setHud] = useState<GameHudUpdatedEvent>(INITIAL_HUD);

  const hudRef = useRef<{ score: number; movesUsed: number }>({ score: 0, movesUsed: 0 });

  useEffect(() => {
    const onHud = (d: EventPayloads['game-hud-updated']) => {
      hudRef.current = { score: d.score, movesUsed: d.movesUsed };
      setHud(d);
    };

    const onReset = () => {
      setHud(INITIAL_HUD);
      hudRef.current = { score: 0, movesUsed: 0 };
    };

    EventBus.on('game-hud-updated', onHud);
    EventBus.on('game-reset', onReset);

    return () => {
      EventBus.off('game-hud-updated', onHud);
      EventBus.off('game-reset', onReset);
    };
  }, []);

  const value = useMemo<GameBridgeState>(() => ({ hud, hudRef }), [hud]);

  return <GameBridgeContext.Provider value={value}>{children}</GameBridgeContext.Provider>;
}
