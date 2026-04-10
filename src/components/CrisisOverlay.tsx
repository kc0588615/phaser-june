import React, { useState, useEffect } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import type { ConsumableItem } from '@/types/expedition';

interface CrisisOption {
  id: string;
  label: string;
  cost?: Record<string, number>;
  effect: string;
}

interface CrisisState {
  crisisId: string;
  options: CrisisOption[];
}

interface Props {
  consumables: ConsumableItem[];
  onSpendTool: () => ConsumableItem | null;
}

export const CrisisOverlay: React.FC<Props> = ({ consumables, onSpendTool }) => {
  const [crisis, setCrisis] = useState<CrisisState | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const handler = (data: EventPayloads['crisis-choice-requested']) => {
      setCrisis({ crisisId: data.crisisId, options: data.options });
      setChosen(null);
    };
    EventBus.on('crisis-choice-requested', handler);
    return () => { EventBus.off('crisis-choice-requested', handler); };
  }, []);

  // Auto-dismiss after choice resolved
  useEffect(() => {
    const handler = () => { setCrisis(null); setChosen(null); };
    EventBus.on('node-complete', handler);
    return () => { EventBus.off('node-complete', handler); };
  }, []);

  if (!crisis) return null;

  const handleChoice = (optionId: string) => {
    if (optionId === 'spend_tool') {
      const spent = onSpendTool();
      if (!spent) return;
    }
    setChosen(optionId);
    const opt = crisis.options.find(o => o.id === optionId);
    EventBus.emit('crisis-choice-resolved', {
      crisisId: crisis.crisisId,
      chosenOptionId: optionId,
      modifier: opt?.effect ?? '',
    });
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,14,26,0.6)',
      backdropFilter: 'blur(8px)',
      fontFamily: 'inherit',
    }}>
      <div className="glass-bg shadow-card" style={{
        maxWidth: '320px', width: '90%',
        padding: '20px 16px',
        borderRadius: '16px',
        border: '1px solid var(--ds-accent-amber)',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚠️</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-accent-amber)' }}>Crisis Event</div>
          <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', marginTop: '4px' }}>
            Choose wisely — each path has consequences.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {crisis.options.map(opt => (
            (() => {
              const isToolOption = opt.id === 'spend_tool';
              const disabled = chosen !== null || (isToolOption && consumables.length === 0);
              const toolLabel = isToolOption && consumables[0]
                ? `Spend ${consumables[0].name} to bypass the crisis.`
                : opt.effect;
              return (
            <button
              key={opt.id}
              disabled={disabled}
              onClick={() => handleChoice(opt.id)}
              className="glass-bg"
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${chosen === opt.id ? 'var(--ds-accent-cyan)' : 'var(--ds-border-subtle)'}`,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled && chosen !== opt.id ? 0.4 : 1,
                textAlign: 'left',
                transition: 'all 0.2s ease',
                color: 'var(--ds-text-primary)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: '10px', color: 'var(--ds-text-muted)', marginTop: '2px' }}>{toolLabel}</div>
              {isToolOption && consumables.length === 0 && (
                <div style={{ fontSize: '9px', color: 'var(--ds-accent-rose)', marginTop: '3px' }}>
                  No consumables available.
                </div>
              )}
              {opt.cost && Object.keys(opt.cost).length > 0 && (
                <div style={{ fontSize: '9px', color: 'var(--ds-accent-rose)', marginTop: '3px' }}>
                  Cost: {Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(', ')}
                </div>
              )}
            </button>
              );
            })()
          ))}
        </div>

        {chosen && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--ds-accent-cyan)', fontWeight: 600 }}>
            Decision made — continuing...
          </div>
        )}
      </div>
    </div>
  );
};
