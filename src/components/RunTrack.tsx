import React from 'react';
import type { RunNode } from '@/types/expedition';
import { NODE_TYPE_LABELS, GEM_COLOR_MAP } from '@/expedition/domain';

interface Props {
  nodes: RunNode[];
  currentNodeIndex: number;
}

export const RunTrack: React.FC<Props> = ({ nodes, currentNodeIndex }) => {
  return (
    <div style={{
      height: '48px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '0 12px',
      background: 'rgba(15,23,42,0.85)',
      borderBottom: '1px solid #334155',
      fontFamily: 'sans-serif',
    }}>
      {nodes.map((node, i) => {
        const isCurrent = i === currentNodeIndex;
        const isCompleted = i < currentNodeIndex;
        const isFuture = i > currentNodeIndex;

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
              border: isCurrent ? '2px solid #22d3ee' : isCompleted ? '1px solid #475569' : '1px solid #334155',
              background: isCurrent ? 'rgba(34,211,238,0.15)' : isCompleted ? 'rgba(71,85,105,0.3)' : 'transparent',
              color: isCurrent ? '#22d3ee' : isCompleted ? '#64748b' : '#94a3b8',
              transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              minWidth: '48px',
            }}>
              {isCompleted
                ? <><span style={{ marginRight: '3px' }}>✓</span>{NODE_TYPE_LABELS[node.node_type] || node.node_type}</>
                : NODE_TYPE_LABELS[node.node_type] || node.node_type}
              <div style={{ fontSize: '9px', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                {isCurrent && node.requiredGems?.length > 0
                  ? node.requiredGems.map((g, gi) => (
                      <span key={gi} style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: GEM_COLOR_MAP[g] ?? '#888',
                      }} />
                    ))
                  : node.difficulty}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div style={{
                width: '12px',
                height: '2px',
                background: isCompleted ? '#475569' : '#1e293b',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
