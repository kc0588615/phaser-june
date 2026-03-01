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
      gap: '6px',
      padding: '4px 10px',
      background: 'rgba(15,23,42,0.85)',
      borderRadius: '6px',
      border: '1px solid #334155',
      fontFamily: 'sans-serif',
    }}>
      {Array.from(grouped.values()).map(({ def, count }) => (
        <div key={def.id} style={{ textAlign: 'center' }} title={def.name}>
          <div style={{ fontSize: '16px', lineHeight: '20px' }}>
            {def.emoji}
          </div>
          {count > 1 && (
            <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>x{count}</div>
          )}
        </div>
      ))}
    </div>
  );
};
