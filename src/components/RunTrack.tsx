import React from 'react';
import type { RunNode } from '@/types/expedition';
import { getRunNodeLabel } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { affinitySetBuffsGem } from '@/expedition/affinities';
import { GemSwatch } from '@/components/ui/gem-swatch';
import type { ThreatType } from '@/game/encounterState';

const THREAT_ICONS: Record<ThreatType, string> = {
  quarry: '🎯',
  blocker: '🧱',
  hazard: '⚠',
  loot_cache: '📦',
  time_pressure: '⏱',
};

interface Props {
  nodes: RunNode[];
  currentNodeIndex: number;
  activeAffinities: AffinityType[];
}

export const RunTrack: React.FC<Props> = ({ nodes, currentNodeIndex, activeAffinities }) => {
  return (
    <div role="progressbar" aria-label={`Expedition progress: node ${currentNodeIndex + 1} of ${nodes.length}`} aria-valuenow={currentNodeIndex + 1} aria-valuemin={1} aria-valuemax={nodes.length} className="h-12 w-full flex items-center justify-start sm:justify-center gap-1.5 px-ds-md glass-bg border-b border-ds-subtle overflow-x-auto scrollbar-hide">
      {nodes.map((node, i) => {
        const isCurrent = i === currentNodeIndex;
        const isCompleted = i < currentNodeIndex;
        const label = getRunNodeLabel(node);

        return (
          <div key={i} className="flex items-center gap-0.5" aria-label={`Node ${i + 1}: ${label}, difficulty ${node.difficulty}${isCurrent ? ' (current)' : isCompleted ? ' (complete)' : ''}`}>
            <div
              className={`
                px-2.5 py-ds-xs rounded-md text-ds-body text-center min-w-[48px] border transition-all duration-200
                ${isCurrent
                  ? 'border-2 border-ds-accent font-bold text-ds-cyan bg-[rgba(34,211,238,0.15)] scale-110'
                  : isCompleted
                    ? 'border-ds-subtle font-medium text-ds-text-muted bg-[rgba(71,85,105,0.3)]'
                    : 'border-ds-subtle font-medium text-ds-text-secondary bg-transparent'
                }
              `}
            >
              {isCompleted
                ? <><span className="mr-1">✓</span>{label}</>
                : label}
              <div className="text-[9px] opacity-70 flex items-center justify-center gap-0.5">
                {node.encounterConfig ? (
                  node.encounterConfig.threats.map((t, ti) => (
                    <span key={ti} title={t.threatType} className="text-[8px]">
                      {THREAT_ICONS[t.threatType] ?? '?'}
                    </span>
                  ))
                ) : isCurrent && node.counterGem ? (
                  <GemSwatch gem={node.counterGem} size={8} glow={affinitySetBuffsGem(activeAffinities, node.counterGem)} />
                ) : (
                  node.difficulty
                )}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div className={`w-3 h-0.5 ${isCompleted ? 'bg-ds-surface-elevated' : 'bg-ds-bg'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
