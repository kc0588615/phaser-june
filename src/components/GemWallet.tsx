import React from 'react';
import type { RunState } from '@/types/expedition';
import { GEM_DEFS } from '@/types/expedition';

interface Props {
  wallet: RunState['gemWallet'];
}

export const GemWallet: React.FC<Props> = ({ wallet }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '4px 10px',
      background: 'rgba(15,23,42,0.85)',
      borderRadius: '6px',
      border: '1px solid #334155',
      fontFamily: 'sans-serif',
    }}>
      {GEM_DEFS.map(({ key, label, color }) => (
        <div key={key} style={{ textAlign: 'center' }}>
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: color,
            margin: '0 auto 2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: key === 'knowledge_gem' ? '#0f172a' : '#fff',
          }}>
            {wallet[key]}
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>{label}</div>
        </div>
      ))}
    </div>
  );
};
