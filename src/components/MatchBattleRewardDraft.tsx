import React from 'react';
import type { RewardOption, UpgradeDef } from '@/game/matchBattle/types';
import { Button } from '@/components/ui/button';

interface Props {
  options: RewardOption[];
  credits: number;
  rerollCost: number;
  fieldNotes: number;
  upgrades: UpgradeDef[];
  gearSlotsFull: boolean;
  onSelect: (option: RewardOption) => void;
  onReroll: () => void;
  onUpgrade: (upgrade: UpgradeDef) => void;
}

export function MatchBattleRewardDraft({ options, credits, rerollCost, fieldNotes, upgrades, gearSlotsFull, onSelect, onReroll, onUpgrade }: Props) {
  return (
    <div className="absolute inset-0 z-deduction glass-bg backdrop-blur-xl flex items-center justify-center p-4">
      <section className="w-full max-w-3xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-2xl font-black text-ds-text-primary">Choose Reward</h2>
            <p className="m-0 mt-1 text-ds-body text-ds-text-secondary">Add pieces, tune probability, or take Field Gear.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onReroll} disabled={credits < rerollCost}>
            Reroll {rerollCost}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {options.map((option) => {
            const disabled = option.kind === 'armament' && gearSlotsFull;
            return (
              <button
                type="button"
                key={`${option.kind}-${option.label}`}
                onClick={() => onSelect(option)}
                disabled={disabled}
                className="min-h-[148px] text-left rounded-md border border-ds-subtle glass-bg p-3 cursor-pointer hover:border-ds-accent hover:shadow-glow-cyan transition disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ds-subtle disabled:hover:shadow-none"
              >
                <div className="text-[10px] uppercase tracking-wider text-ds-text-muted">{option.kind === 'armament' ? 'gear' : option.kind}</div>
                <div className="mt-1 text-lg font-black text-ds-cyan">{option.label}</div>
                <div className="mt-2 text-ds-body text-ds-text-secondary leading-snug">{option.description}</div>
                {disabled && <div className="mt-2 text-[10px] text-ds-amber">Gear slots full.</div>}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-md border border-ds-subtle glass-bg p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-black text-ds-text-primary">Field Notes Upgrades</h3>
            <span className="text-xs font-bold text-ds-cyan">{fieldNotes} Notes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {upgrades.map((upgrade) => (
              <button
                type="button"
                key={upgrade.id}
                disabled={fieldNotes < upgrade.cost}
                onClick={() => onUpgrade(upgrade)}
                className="min-h-[92px] rounded-md border border-ds-subtle bg-ds-bg/50 p-2 text-left transition hover:border-ds-cyan disabled:cursor-not-allowed disabled:opacity-45"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-ds-text-primary">{upgrade.name}</span>
                  <span className="text-[10px] font-bold text-ds-amber">{upgrade.cost}</span>
                </div>
                <p className="m-0 mt-1 text-[11px] leading-snug text-ds-text-secondary">{upgrade.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
