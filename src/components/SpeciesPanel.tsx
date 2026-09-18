import { useGameBridge } from '@/contexts/GameBridgeContext';
import React from 'react';
import { EventBus, EVT_GAME_RESTART } from '../game/EventBus';
import { SpeciesHeaderCard } from './SpeciesHeaderCard';


interface SpeciesPanelProps {
  style?: React.CSSProperties;
  toastsEnabled?: boolean;
}

export const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ style }) => {
  const { hud, speciesInfo, allSpeciesCompleted } = useGameBridge();

  const onRestart = () => EventBus.emit(EVT_GAME_RESTART, {});

  return (
    <div className="h-full bg-ds-bg p-1.5 flex flex-col gap-1.5" style={style}>
      {/* Game HUD */}
      <div className="flex justify-between items-center px-3 py-2 glass-bg rounded-lg border border-ds-subtle text-sm text-ds-text-primary font-medium">
        <div className="flex gap-4 items-center">
          <span>Moves: {hud.movesUsed}/{hud.maxMoves || '—'}</span>
          <span>Score: {hud.score}</span>
          <span>Streak: x{hud.multiplier.toFixed(2)}</span>
          {hud.moveMultiplier && hud.moveMultiplier > 1.01 && (
            <span>Move Bonus: x{hud.moveMultiplier.toFixed(2)}</span>
          )}
        </div>
        {hud.maxMoves > 0 && hud.movesUsed >= hud.maxMoves && (
          <button
            type="button"
            onClick={onRestart}
            className="px-3 py-1 bg-ds-cyan text-white border-none rounded text-sm font-medium cursor-pointer"
          >
            Restart
          </button>
        )}
      </div>

      <SpeciesHeaderCard
        speciesName={allSpeciesCompleted ? 'All Species Discovered!' : speciesInfo?.name ?? ''}
        speciesId={speciesInfo?.id ?? 0}
        currentSpeciesIndex={speciesInfo?.index ?? 0}
        totalSpecies={speciesInfo?.total ?? 0}
      />
      <p className="text-sm text-ds-text-secondary p-3">Match gems to score points. Start an expedition to investigate a mystery.</p>
    </div>
  );
};
