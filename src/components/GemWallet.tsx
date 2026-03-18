import React from 'react';
import type { ResourceWallet } from '@/types/expedition';

const RESOURCE_DEFS: { key: keyof ResourceWallet; label: string; color: string; icon: string }[] = [
  { key: 'nature',    label: 'Nature',    color: '#34d399', icon: '🍃' },
  { key: 'water',     label: 'Water',     color: '#38bdf8', icon: '💧' },
  { key: 'knowledge', label: 'Knowledge', color: '#cbd5e1', icon: '📘' },
  { key: 'craft',     label: 'Craft',     color: '#fb923c', icon: '🔧' },
];

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
      {RESOURCE_DEFS.map(({ key, label, color, icon }) => (
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
            color: key === 'knowledge' ? '#0f172a' : '#fff',
          }}>
            {wallet[key]}
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>{icon} {label}</div>
        </div>
      ))}
    </div>
  );
};
