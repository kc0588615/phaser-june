import React from 'react';
import type { ResourceWallet } from '@/types/expedition';
import { WALLET_DEFS } from '@/expedition/domain';

interface Props {
  wallet: ResourceWallet;
}

const WALLET_EMOJIS = {
  gold: '🎒',
  power: '🎯',
  thought: '💡',
  dust: '🧪',
} as const;

export const GemWallet: React.FC<Props> = ({ wallet }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px 6px',
      background: 'rgba(15,23,42,0.85)',
      borderRadius: '6px',
      border: '1px solid #334155',
      fontFamily: 'sans-serif',
      flexWrap: 'wrap',
    }}>
      {WALLET_DEFS.map(({ key, label, color }) => (
        <div
          key={key}
          title={`${label}: ${wallet[key]}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 5px',
            borderRadius: '999px',
            background: 'rgba(30,41,59,0.72)',
            border: '1px solid rgba(148,163,184,0.18)',
          }}
        >
          <div style={{
            fontSize: '11px',
            lineHeight: 1,
          }}>
            {WALLET_EMOJIS[key]}
          </div>
          <div style={{
            minWidth: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color,
          }}>
            {wallet[key]}
          </div>
        </div>
      ))}
    </div>
  );
};
