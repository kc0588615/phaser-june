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
        background: 'var(--ds-glass-bg)',
        backdropFilter: 'blur(12px)',
        borderRadius: '7px',
        border: '1px solid var(--ds-border-subtle)',
        boxShadow: 'var(--ds-shadow-card)',
        fontFamily: 'inherit',
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
            background: 'var(--ds-surface-elevated)',
            color: 'var(--ds-text-primary)',
            border: '1px solid var(--ds-border-subtle)',
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
