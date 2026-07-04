import { useEffect, useMemo, useState } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import type { ClueCategoryKey } from '@/types/expedition';
import { deductionCatToWalletKey } from '@/types/expedition';
import { GEM_COLOR_MAP, LOOT_GEM_TYPES, type LootGemType } from '@/expedition/domain';

const GEM_TO_WALLET_KEY: Record<LootGemType, ClueCategoryKey> = {
  black: 'life_cycle',
  blue: 'geographic',
  green: 'habitat',
  orange: 'morphology',
  red: 'classification',
  white: 'conservation',
  yellow: 'behavior',
  purple: 'key_facts',
};

const CATEGORY_LABELS: Record<ClueCategoryKey, string> = {
  classification: 'Classification',
  habitat: 'Habitat Survey',
  geographic: 'Geography & Habitat',
  morphology: 'Morphology',
  behavior: 'Behavior',
  life_cycle: 'Life Cycle',
  conservation: 'Conservation',
  key_facts: 'Key Facts',
};

interface GemSignalStripProps {
  matchedGemCategories: ClueCategoryKey[];
}

export function GemSignalStrip({ matchedGemCategories }: GemSignalStripProps) {
  const matchedSet = useMemo(() => new Set(matchedGemCategories), [matchedGemCategories]);
  const [pulseCategory, setPulseCategory] = useState<ClueCategoryKey | null>(null);

  useEffect(() => {
    const handleClueTriggered = (payload: EventPayloads['deduction-clue-triggered']) => {
      const walletKey = deductionCatToWalletKey(payload.category);
      setPulseCategory(walletKey);
      window.setTimeout(() => {
        setPulseCategory(current => current === walletKey ? null : current);
      }, 420);
    };

    EventBus.on('deduction-clue-triggered', handleClueTriggered);
    return () => {
      EventBus.off('deduction-clue-triggered', handleClueTriggered);
    };
  }, []);

  return (
    <div className="absolute left-0 right-0 top-0 z-panel pointer-events-none">
      <style>{`
        @keyframes gem-signal-pulse {
          0% { transform: scale(1); }
          45% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .gem-signal-dot-pulse { animation: gem-signal-pulse 420ms ease-out; }
      `}</style>
      <div className="pointer-events-auto h-10 border-x-0 border-t-0 border-b border-ds-subtle bg-ds-surface-elevated/95 backdrop-blur-md px-ds-md flex items-center justify-between gap-ds-sm shadow-card">
        <span className="text-ds-caption font-bold uppercase tracking-wider text-ds-cyan whitespace-nowrap">
          Field signal
        </span>
        <div className="flex flex-1 items-center justify-end gap-2" role="list" aria-label="Matched clue category signals">
          {LOOT_GEM_TYPES.map((gemType) => {
            const walletKey = GEM_TO_WALLET_KEY[gemType];
            const matched = matchedSet.has(walletKey);
            const color = GEM_COLOR_MAP[gemType];
            const pulsing = pulseCategory === walletKey;
            return (
              <span
                key={gemType}
                role="listitem"
                title={CATEGORY_LABELS[walletKey]}
                aria-label={`${CATEGORY_LABELS[walletKey]} ${matched ? 'matched' : 'unmatched'}`}
                className={`block size-3 rounded-full ${pulsing ? 'gem-signal-dot-pulse' : ''}`}
                style={{
                  background: matched ? color : 'transparent',
                  border: `1.5px solid ${color}`,
                  opacity: matched ? 1 : 0.55,
                  boxShadow: matched ? `0 0 10px ${color}` : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
