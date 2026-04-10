import React from 'react';

interface Props {
  score: number;
}

export const BankedScore: React.FC<Props> = ({ score }) => {

  return (
    <div className="glass-bg" style={{
      padding: '4px 12px',
      borderRadius: '9999px',
      border: '1px solid var(--ds-border-subtle)',
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--ds-text-muted)', fontWeight: 500 }}>Banked</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-accent-cyan)' }}>{score.toLocaleString()}</span>
    </div>
  );
};
