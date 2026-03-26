import React from 'react';
import type { ResourceWallet } from '@/types/expedition';
import { WALLET_DEFS } from '@/expedition/domain';

interface Props {
  wallet: ResourceWallet;
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
      {WALLET_DEFS.map(({ key, label, color, shortLabel }) => (
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
            color: key === 'gold' || key === 'thought' ? '#0f172a' : '#fff',
          }}>
            {wallet[key]}
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>{shortLabel} {label}</div>
        </div>
      ))}
    </div>
  );
};
