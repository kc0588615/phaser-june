import React from 'react';
import type { RunNode } from '@/types/expedition';
import { NODE_TYPE_LABELS, GEM_COLOR_MAP } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { affinitySetBuffsGem } from '@/expedition/affinities';

interface Props {
  nodes: RunNode[];
  currentNodeIndex: number;
  activeAffinities: AffinityType[];
}

export const RunTrack: React.FC<Props> = ({ nodes, currentNodeIndex, activeAffinities }) => {
  return (
    <div style={{
      height: '48px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '0 12px',
      background: 'var(--ds-glass-bg)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--ds-border-subtle)',
      fontFamily: 'inherit',
    }}>
      {nodes.map((node, i) => {
        const isCurrent = i === currentNodeIndex;
        const isCompleted = i < currentNodeIndex;

        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: isCurrent ? 700 : 500,
              border: isCurrent ? '2px solid var(--ds-accent-cyan)' : isCompleted ? '1px solid var(--ds-border-subtle)' : '1px solid var(--ds-border-subtle)',
              background: isCurrent ? 'rgba(34,211,238,0.15)' : isCompleted ? 'rgba(71,85,105,0.3)' : 'transparent',
              color: isCurrent ? 'var(--ds-accent-cyan)' : isCompleted ? 'var(--ds-text-muted)' : 'var(--ds-text-secondary)',
              transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              minWidth: '48px',
            }}>
              {isCompleted
                ? <><span style={{ marginRight: '3px' }}>✓</span>{NODE_TYPE_LABELS[node.node_type] || node.node_type}</>
                : NODE_TYPE_LABELS[node.node_type] || node.node_type}
              <div style={{ fontSize: '9px', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {isCurrent && node.counterGem
                  ? (
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: GEM_COLOR_MAP[node.counterGem] ?? '#888',
                        boxShadow: affinitySetBuffsGem(activeAffinities, node.counterGem) ? `0 0 8px ${GEM_COLOR_MAP[node.counterGem] ?? '#22d3ee'}` : 'none',
                        border: affinitySetBuffsGem(activeAffinities, node.counterGem) ? '1px solid rgba(255,255,255,0.7)' : 'none',
                      }} />
                    )
                  : node.difficulty}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{
                width: '12px',
                height: '2px',
                background: isCompleted ? 'var(--ds-border-subtle)' : 'var(--ds-background)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
