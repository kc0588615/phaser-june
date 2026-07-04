import React from 'react';
import type { ConsumableItem } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';

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
    <GlassPanel className="flex flex-wrap gap-ds-xs max-w-[200px] sm:max-w-[260px] p-ds-xs rounded-md">
      {items.map((item) => (
        <button
          key={item.instanceId}
          onClick={() => onUse(item.instanceId)}
          className="flex items-center gap-1.5 min-w-0 py-[5px] px-[7px] bg-ds-surface-elevated text-ds-text-primary border border-ds-subtle rounded-md cursor-pointer text-left"
          style={{ flex: '1 1 108px' }}
          title={item.description}
          aria-label={`${item.name}: ${item.description}`}
        >
          <span className="text-[13px] leading-none">{ITEM_EMOJIS[item.id] ?? '🧰'}</span>
          <span className="text-ds-badge font-bold leading-tight">{item.name}</span>
        </button>
      ))}
    </GlassPanel>
  );
};
