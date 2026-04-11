import React, { useState, useEffect } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import type { SpookTier } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';

const TIER_CONFIG: Record<SpookTier, { label: string; color: string }> = {
  stabilized: { label: 'Stabilized', color: 'var(--ds-accent-emerald)' },
  spooked:    { label: 'Alert',      color: 'var(--ds-accent-amber)' },
  escaped:    { label: 'Escaping',   color: 'var(--ds-accent-rose)' },
};

export const SpookMeter: React.FC = () => {
  const [data, setData] = useState<{ pct: number; tier: SpookTier } | null>(null);

  useEffect(() => {
    const handler = (d: EventPayloads['node-bonus-tick']) => {
      setData({ pct: d.pct, tier: d.tier });
    };
    EventBus.on('node-bonus-tick', handler);
    return () => { EventBus.off('node-bonus-tick', handler); };
  }, []);

  if (!data) return null;

  const cfg = TIER_CONFIG[data.tier];
  const widthPct = Math.max(0, Math.min(100, data.pct * 100));

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
