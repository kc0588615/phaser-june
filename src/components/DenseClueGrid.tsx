import React from 'react';
import type { CluePayload } from '../game/clueConfig';

interface DenseClueGridProps {
  clues: CluePayload[];
  hasSelectedSpecies: boolean;
}

export const DenseClueGrid: React.FC<DenseClueGridProps> = ({ clues, hasSelectedSpecies }) => {
  if (!hasSelectedSpecies) {
    return (
      <div className="flex-1 bg-slate-800 rounded-lg p-4 flex items-center justify-center text-slate-400">
        <p className="text-center">
          Click the 'Show Map' button so you can click on the globe to find a habitat area.
          <br />
          If you click and there's no overlapping habitat, then the nearest habitat area will flash light blue.
          <br />
          Click on this light blue area - it's a mystery species habitat!
          <br />
          Then match gems to reveal clues so you can guess the species!
        </p>
      </div>
    );
  }

  if (clues.length === 0) {
    return (
      <div className="flex-1 bg-slate-800 rounded-lg p-4 flex items-center justify-center text-slate-400">
        <p className="text-center italic">Match gems to reveal clues about this species...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-800 rounded-lg p-3 overflow-y-auto">
      <div className="grid gap-2">
        {clues.map((clue, index) => (
          <div
            key={index}
            className="bg-slate-700 rounded-md p-2 transition-all hover:bg-slate-600"
            style={{ borderLeft: `3px solid ${clue.color}` }}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg mt-0.5">{clue.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-cyan-300">{clue.name}</div>
                <div className="text-xs text-slate-300 break-words">{clue.clue}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};