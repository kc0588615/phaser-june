import React from 'react';
import type { SouvenirDef } from '@/types/expedition';

interface Props {
  souvenirs: SouvenirDef[];
}

export const SouvenirPouch: React.FC<Props> = ({ souvenirs }) => {
  // Group by id and count
  const grouped = new Map<string, { def: SouvenirDef; count: number }>();
  for (const s of souvenirs) {
    const entry = grouped.get(s.id);
    if (entry) entry.count++;
    else grouped.set(s.id, { def: s, count: 1 });
  }

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px 6px',
      background: 'var(--ds-glass-bg)',
      backdropFilter: 'blur(12px)',
      borderRadius: '6px',
      border: '1px solid var(--ds-border-subtle)',
      boxShadow: 'var(--ds-shadow-card)',
      fontFamily: 'inherit',
    }}>
      {Array.from(grouped.values()).map(({ def, count }) => (
        <div
          key={def.id}
          style={{
            textAlign: 'center',
            minWidth: '18px',
          }}
          title={def.name}
        >
          <div style={{ fontSize: '13px', lineHeight: '16px' }}>
            {def.emoji}
          </div>
          {count > 1 && (
            <div style={{ fontSize: '8px', color: 'var(--ds-text-secondary)', fontWeight: 700 }}>x{count}</div>
          )}
        </div>
      ))}
    </div>
  );
};
