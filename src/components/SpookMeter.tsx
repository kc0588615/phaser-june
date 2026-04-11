import React from 'react';
import type { SpookTier } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useGameBridge } from '@/contexts/GameBridgeContext';

const TIER_CONFIG: Record<SpookTier, { label: string; color: string }> = {
  stabilized: { label: 'Stabilized', color: 'var(--ds-accent-emerald)' },
  spooked:    { label: 'Alert',      color: 'var(--ds-accent-amber)' },
  escaped:    { label: 'Escaping',   color: 'var(--ds-accent-rose)' },
};

export const SpookMeter: React.FC = () => {
  const { bonusPool } = useGameBridge();

  if (!bonusPool) return null;

  const cfg = TIER_CONFIG[bonusPool.tier];
  const widthPct = Math.max(0, Math.min(100, bonusPool.pct * 100));

  return (
    <GlassPanel
      pill
      borderColor={cfg.color}
      className="flex flex-col items-center gap-1 px-ds-lg py-1.5 min-w-[140px] transition-[border-color] duration-300"
    >
      <div
        className="text-ds-badge font-bold uppercase tracking-wider"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </div>
      <div className="w-full h-1.5 rounded-sm bg-ds-bg overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-700 ease-out"
          style={{ width: `${widthPct}%`, background: cfg.color }}
        />
      </div>
    </GlassPanel>
  );
};
