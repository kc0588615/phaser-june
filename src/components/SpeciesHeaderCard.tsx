import React from 'react';

interface SpeciesHeaderCardProps {
  speciesName: string;
  speciesId: number;
  currentSpeciesIndex: number;
  totalSpecies: number;
  revealedClueCount: number;
  discoveredClues: Array<{
    name: string;
    color: string;
    icon: string;
  }>;
}

export const SpeciesHeaderCard: React.FC<SpeciesHeaderCardProps> = ({
  speciesName,
  speciesId,
  currentSpeciesIndex,
  totalSpecies,
  revealedClueCount,
  discoveredClues,
}) => {
  const maxClues = 8; // Total number of gem categories

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
      {/* Species Info Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-cyan-300 font-semibold text-lg">
            {speciesName === 'Mystery Species' 
              ? `🔍 Mystery Species #${speciesId}` 
              : (speciesName || 'Select a location to discover species')}
          </h3>
          {totalSpecies > 0 && (
            <p className="text-slate-400 text-sm">
              Species {currentSpeciesIndex} of {totalSpecies} • {revealedClueCount}/{maxClues} clues
            </p>
          )}
        </div>
      </div>

      {/* Discovered Clues Row */}
      {discoveredClues.length > 0 && (
        <div className="flex gap-1 items-center">
          {discoveredClues.map((clue, index) => {
            // Map gem colors to colored dot emojis
            const colorToDot: Record<string, string> = {
              'red': '🔴',
              'green': '🟢',
              'blue': '🔵',
              'orange': '🟠',
              'yellow': '🟡',
              'black': '⚫',
              'white': '⚪',
              'purple': '🟣'
            };
            
            return (
              <span
                key={`discovered-clue-${clue.name}-${clue.color}`}
                className="text-base"
                title={`${clue.name} (${clue.icon})`}
              >
                {colorToDot[clue.color] || '⚪'}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};