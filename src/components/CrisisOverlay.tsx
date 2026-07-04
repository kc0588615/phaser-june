import React, { useState, useEffect, useRef } from 'react';
import { EventBus } from '@/game/EventBus';
import type { ConsumableItem } from '@/types/expedition';
import { ModalOverlay } from '@/components/ui/modal-overlay';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useGameBridge } from '@/contexts/GameBridgeContext';

interface Props {
  consumables: ConsumableItem[];
  onSpendTool: () => ConsumableItem | null;
}

export const CrisisOverlay: React.FC<Props> = ({ consumables, onSpendTool }) => {
  const { crisisState } = useGameBridge();
  const [chosen, setChosen] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Reset chosen when a new crisis arrives or crisis clears
  useEffect(() => { setChosen(null); }, [crisisState]);

  /* Trap focus inside the crisis panel */
  useEffect(() => {
    if (!crisisState) return;
    const el = panelRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>('button:not([disabled])');
      first?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const focusable = el.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [crisisState]);

  if (!crisisState) return null;

  const handleChoice = (optionId: string) => {
    if (optionId === 'spend_tool') {
      const spent = onSpendTool();
      if (!spent) return;
    }
    setChosen(optionId);
    const opt = crisisState.options.find(o => o.id === optionId);
    EventBus.emit('crisis-choice-resolved', {
      crisisId: crisisState.crisisId,
      chosenOptionId: optionId,
      modifier: opt?.effect ?? '',
    });
  };

  return (
    <ModalOverlay className="z-crisis backdrop-blur-md">
      <GlassPanel ref={panelRef} role="alertdialog" aria-modal="true" aria-label="Crisis event" borderColor="var(--ds-accent-amber)" className="max-w-[320px] w-[90%] p-5 flex flex-col gap-ds-md">
        <div className="text-center">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-ds-heading-sm font-bold text-ds-amber">Crisis Event</div>
          <div className="text-ds-caption text-ds-text-secondary mt-1">
            Choose wisely — each path has consequences.
          </div>
        </div>

        <div className="flex flex-col gap-ds-sm">
          {crisisState.options.map(opt => {
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
                className={`glass-bg rounded-lg border p-ds-md text-left transition-all duration-200 text-ds-text-primary
                  ${chosen === opt.id ? 'border-ds-accent' : 'border-ds-subtle'}
                  ${disabled && chosen !== opt.id ? 'opacity-40' : ''}
                  ${disabled ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="text-ds-body font-semibold">{opt.label}</div>
                <div className="text-ds-badge text-ds-text-muted mt-0.5">{toolLabel}</div>
                {isToolOption && consumables.length === 0 && (
                  <div className="text-[9px] text-ds-rose mt-1">No consumables available.</div>
                )}
                {opt.cost && Object.keys(opt.cost).length > 0 && (
                  <div className="text-[9px] text-ds-rose mt-1">
                    Cost: {Object.entries(opt.cost).map(([k, v]) => `${v} ${k}`).join(', ')}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {chosen && (
          <div className="text-center text-ds-caption text-ds-cyan font-semibold">
            Decision made — continuing...
          </div>
        )}
      </GlassPanel>
    </ModalOverlay>
  );
};
