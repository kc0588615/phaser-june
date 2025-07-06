import React from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

interface SpeciesHeaderCardProps {
  speciesName: string;
  currentSpeciesIndex: number;
  totalSpecies: number;
  revealedClueCount: number;
  discoveredClues: Array<{
    name: string;
    color: string;
    icon: string;
  }>;
  onShowLegend: () => void;
}

export const SpeciesHeaderCard: React.FC<SpeciesHeaderCardProps> = ({
  speciesName,
  currentSpeciesIndex,
  totalSpecies,
  revealedClueCount,
  discoveredClues,
  onShowLegend,
}) => {
  const maxClues = 8; // Total number of gem categories

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
      {/* Species Info Row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-cyan-300 font-semibold text-lg">
            {speciesName || 'Select a location to discover species'}
          </h3>
          {totalSpecies > 0 && (
            <p className="text-slate-400 text-sm">
              Species {currentSpeciesIndex} of {totalSpecies} • {revealedClueCount}/{maxClues} clues
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowLegend}
          className="text-slate-400 hover:text-cyan-300"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Discovered Clues Row */}
      {discoveredClues.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {discoveredClues.map((clue, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-md"
              style={{ borderLeft: `3px solid ${clue.color}` }}
            >
              <span className="text-sm">{clue.icon}</span>
              <span className="text-xs text-slate-300">{clue.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};