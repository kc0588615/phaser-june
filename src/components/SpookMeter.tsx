import React, { useState, useEffect } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import type { SpookTier } from '@/types/expedition';

const TIER_CONFIG: Record<SpookTier, { label: string; color: string; bg: string }> = {
  stabilized: { label: 'Stabilized', color: 'var(--ds-accent-emerald)', bg: 'rgba(16,185,129,0.15)' },
  spooked:    { label: 'Alert',      color: 'var(--ds-accent-amber)',   bg: 'rgba(245,158,11,0.15)' },
  escaped:    { label: 'Escaping',   color: 'var(--ds-accent-rose)',    bg: 'rgba(244,63,94,0.15)' },
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
    <div className="glass-bg shadow-card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
      padding: '6px 16px',
      borderRadius: '9999px',
      border: `1px solid ${cfg.color}`,
      minWidth: '140px',
      transition: 'border-color 0.3s ease',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {cfg.label}
      </div>
      <div style={{
        width: '100%', height: '6px',
        borderRadius: '3px', background: 'var(--ds-background)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${widthPct}%`,
          background: cfg.color, borderRadius: '3px',
          transition: 'width 0.8s ease, background 0.3s ease',
        }} />
      </div>
    </div>
  );
};
