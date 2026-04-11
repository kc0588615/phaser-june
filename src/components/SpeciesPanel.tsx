import React from 'react';
import { EventBus, EVT_GAME_RESTART } from '../game/EventBus';
import { SpeciesHeaderCard } from './SpeciesHeaderCard';
import { DenseClueGrid } from './DenseClueGrid';
import { ClueSheetWrapper } from './ClueSheetWrapper';
import { useSpeciesPanelState } from '@/hooks/useSpeciesPanelState';


interface SpeciesPanelProps {
  style?: React.CSSProperties;
  toastsEnabled?: boolean;
}

export const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ style, toastsEnabled = true }) => {
  const {
    clues,
    selectedSpeciesName,
    selectedSpeciesId,
    totalSpecies,
    currentSpeciesIndex,
    allSpeciesCompleted,
    discoveredClues,
    isSpeciesDiscovered,
    discoveredSpeciesName,
    hiddenSpeciesName,
    hud,
    hasSelectedSpecies,
  } = useSpeciesPanelState(toastsEnabled);

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
            onClick={onRestart}
            className="px-3 py-1 bg-ds-cyan text-white border-none rounded text-sm font-medium cursor-pointer"
          >
            Restart
          </button>
        )}
      </div>

      {/* Species Header with Horizontal Clue Indicators */}
      <SpeciesHeaderCard
        speciesName={allSpeciesCompleted ? 'All Species Discovered!' : (isSpeciesDiscovered ? discoveredSpeciesName : selectedSpeciesName)}
        speciesId={selectedSpeciesId}
        currentSpeciesIndex={currentSpeciesIndex}
        totalSpecies={totalSpecies}
        revealedClueCount={clues.length}
        discoveredClues={discoveredClues}
      />

      {/* Compact Field Notes List - Quick Reference */}
      <DenseClueGrid
        clues={clues}
        hasSelectedSpecies={hasSelectedSpecies}
      />

      {/* Sheet Button for Detailed View */}
      <div className="flex-shrink-0">
        <ClueSheetWrapper
          clues={clues}
          speciesName={selectedSpeciesName}
          hasSelectedSpecies={hasSelectedSpecies}
          speciesId={selectedSpeciesId}
          hiddenSpeciesName={hiddenSpeciesName}
        />
      </div>
    </div>
  );
};
