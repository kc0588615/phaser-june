import React from 'react';
import type { ConsumableItem } from '@/types/expedition';

interface Props {
  items: ConsumableItem[];
  onUse: (itemInstanceId: string) => void;
}

export const ConsumableTray: React.FC<Props> = ({ items, onUse }) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        maxWidth: '280px',
        padding: '6px',
        background: 'rgba(15,23,42,0.88)',
        borderRadius: '8px',
        border: '1px solid #334155',
        fontFamily: 'sans-serif',
      }}
    >
      {items.map((item) => (
        <button
          key={item.instanceId}
          onClick={() => onUse(item.instanceId)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '86px',
            padding: '6px 8px',
            background: 'rgba(30,41,59,0.9)',
            color: '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
          title={item.description}
        >
          <span style={{ fontSize: '11px', fontWeight: 700 }}>{item.name}</span>
          <span style={{ fontSize: '9px', color: '#94a3b8' }}>{item.description}</span>
        </button>
      ))}
    </div>
  );
};
