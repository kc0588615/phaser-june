import React from 'react';
import type { CluePayload } from '../game/clueConfig';

interface DenseClueGridProps {
  clues: CluePayload[];
  hasSelectedSpecies: boolean;
  emptyMessage?: string;
  variant?: 'dense' | 'card';
}

export const DenseClueGrid: React.FC<DenseClueGridProps> = ({
  clues,
  hasSelectedSpecies,
  emptyMessage = 'Match gems to reveal clues about this species...',
  variant = 'dense',
}) => {
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
        <p className="text-center italic">{emptyMessage}</p>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="grid gap-3">
        {clues.map((clue, index) => (
          <div
            key={`clue-card-${clue.name}-${clue.clue.slice(0, 20)}-${index}`}
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              borderLeft: `3px solid ${clue.color}`,
            }}
          >
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                marginBottom: '6px',
                color: clue.color,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{clue.icon}</span>
              <span>{clue.name}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.45 }}>
              {clue.clue}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-800 rounded-lg p-3 overflow-y-auto">
      <div className="grid gap-2">
        {clues.map((clue, index) => (
          <div
            key={`clue-${clue.name}-${clue.clue.slice(0, 20)}-${index}`}
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
