import React from 'react';
import type { ResourceWallet } from '@/types/expedition';
import { WALLET_DEFS } from '@/expedition/domain';
import { GlassPanel } from '@/components/ui/glass-panel';

interface Props {
  wallet: ResourceWallet;
}

const WALLET_EMOJIS = {
  gold: '🎒',
  power: '🎯',
  thought: '💡',
  dust: '🧪',
} as const;

export const GemWallet: React.FC<Props> = ({ wallet }) => {
  return (
    <GlassPanel className="flex gap-ds-xs p-1.5 flex-wrap">
      {WALLET_DEFS.map(({ key, label, color }) => (
        <div
          key={key}
          title={`${label}: ${wallet[key]}`}
          className="flex items-center gap-ds-xs px-1.5 py-0.5 rounded-full bg-ds-surface-elevated border border-ds-subtle"
        >
          <span className="text-ds-caption leading-none">{WALLET_EMOJIS[key]}</span>
          <span
            className="min-w-[14px] flex items-center justify-center text-ds-badge font-bold"
            style={{ color }}
          >
            {wallet[key]}
          </span>
        </div>
      ))}
    </GlassPanel>
  );
};
