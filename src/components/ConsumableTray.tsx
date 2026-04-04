import React from 'react';
import type { ConsumableItem } from '@/types/expedition';

interface Props {
  items: ConsumableItem[];
  onUse: (itemInstanceId: string) => void;
}

const ITEM_EMOJIS: Record<string, string> = {
  burst_camera: '📸',
  field_scope: '🔭',
  bridge_kit: '🌉',
  hide_cloak: '🥷',
  supply_drop: '📦',
};

export const ConsumableTray: React.FC<Props> = ({ items, onUse }) => {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        maxWidth: '232px',
        padding: '4px',
        background: 'rgba(15,23,42,0.88)',
        borderRadius: '7px',
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
            alignItems: 'center',
            gap: '6px',
            minWidth: '0',
            padding: '5px 7px',
            background: 'rgba(30,41,59,0.9)',
            color: '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '6px',
            cursor: 'pointer',
            textAlign: 'left',
            flex: '1 1 108px',
          }}
          title={item.description}
          aria-label={`${item.name}: ${item.description}`}
        >
          <span style={{ fontSize: '13px', lineHeight: 1 }}>{ITEM_EMOJIS[item.id] ?? '🧰'}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.1 }}>{item.name}</span>
        </button>
      ))}
    </div>
  );
};
