import { useEffect, useMemo, useRef, useState } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import type { ClueCategoryKey, RunState } from '@/types/expedition';
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
  runState: RunState;
}

export function GemSignalStrip({ runState }: GemSignalStripProps) {
  const comp = runState.comparativeDeduction;
  const signalRunId = useMemo(() => {
    const mysteryId = comp?.mysteryProfile.speciesId ?? 'pending';
    const routeStart = runState.expedition?.routePolyline?.[0];
    return `${mysteryId}:${routeStart?.lon ?? 'x'}:${routeStart?.lat ?? 'x'}`;
  }, [comp?.mysteryProfile.speciesId, runState.expedition?.routePolyline]);

  return <GemSignalStripContent key={signalRunId} runState={runState} />;
}

function GemSignalStripContent({ runState }: GemSignalStripProps) {
  const matchedGemCategories = runState.matchedGemCategories;
  const comp = runState.comparativeDeduction;
  const matchedSet = useMemo(() => new Set(matchedGemCategories), [matchedGemCategories]);
  const [pulseCategory, setPulseCategory] = useState<ClueCategoryKey | null>(null);
  const [tickerState, setTickerState] = useState<{ items: string[]; index: number }>({ items: [], index: 0 });
  const knownTickerIdsRef = useRef<Set<string> | null>(null);
  if (knownTickerIdsRef.current === null) {
    knownTickerIdsRef.current = new Set();
  }
  const currentUnlockEntries = useMemo(() => {
    const entries: Array<{ id: string; label: string }> = [];
    for (const clue of comp?.processedClues ?? []) {
      entries.push({ id: `clue:${clue.clueId}`, label: clue.label });
    }
    for (const entry of comp?.habitatSurvey ?? []) {
      if (entry.revealed) {
        entries.push({
          id: `survey:${entry.habitatType}:${entry.percentage}`,
          label: `${entry.habitatType} ${entry.percentage}%`,
        });
      }
    }
    return entries;
  }, [comp?.habitatSurvey, comp?.processedClues]);

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

  useEffect(() => {
    const knownTickerIds = knownTickerIdsRef.current;
    if (!knownTickerIds) return;
    const newEntries = currentUnlockEntries.filter(entry => !knownTickerIds.has(entry.id));
    if (newEntries.length === 0) return;
    for (const entry of newEntries) {
      knownTickerIds.add(entry.id);
    }
    const newLabels = newEntries.map(entry => entry.label);
    setTickerState(prev => ({
      items: [...prev.items, ...newLabels],
      index: prev.items.length,
    }));
  }, [currentUnlockEntries]);

  useEffect(() => {
    if (tickerState.items.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setTickerState(prev => (
        prev.items.length <= 1
          ? prev
          : { ...prev, index: (prev.index + 1) % prev.items.length }
      ));
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [tickerState.items.length]);

  const tickerText = tickerState.items[tickerState.index] ?? null;

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
      <div className="glass-bg pointer-events-auto h-10 border-x-0 border-t-0 border-b border-ds-subtle px-ds-md flex items-center justify-between gap-ds-sm shadow-card">
        {tickerText ? (
          <span className="min-w-0 flex-1 truncate text-ds-caption text-ds-text-primary">
            {tickerText}
          </span>
        ) : (
          <span className="text-ds-caption font-bold uppercase tracking-wider text-ds-cyan whitespace-nowrap">
            Field signal
          </span>
        )}
        <ul className="m-0 flex flex-1 list-none items-center justify-end gap-2 p-0" aria-label="Matched clue category signals">
          {LOOT_GEM_TYPES.map((gemType) => {
            const walletKey = GEM_TO_WALLET_KEY[gemType];
            const matched = matchedSet.has(walletKey);
            const color = GEM_COLOR_MAP[gemType];
            const pulsing = pulseCategory === walletKey;
            return (
              <li
                key={gemType}
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
        </ul>
      </div>
    </div>
  );
}
