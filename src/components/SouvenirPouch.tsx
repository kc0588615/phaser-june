import React from 'react';
import type { SouvenirDef } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';

interface Props {
  souvenirs: SouvenirDef[];
}

export const SouvenirPouch: React.FC<Props> = ({ souvenirs }) => {
  const grouped = new Map<string, { def: SouvenirDef; count: number }>();
  for (const s of souvenirs) {
    const entry = grouped.get(s.id);
    if (entry) entry.count++;
    else grouped.set(s.id, { def: s, count: 1 });
  }

  return (
    <GlassPanel className="flex gap-ds-xs p-1.5">
      {Array.from(grouped.values()).map(({ def, count }) => (
        <div key={def.id} className="text-center min-w-[18px]" title={def.name}>
          <div className="text-[13px] leading-4">{def.emoji}</div>
          {count > 1 && (
            <div className="text-[8px] text-ds-text-secondary font-bold">x{count}</div>
          )}
        </div>
      ))}
    </GlassPanel>
  );
};
