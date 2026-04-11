import React from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatPill } from '@/components/ui/stat-pill';

interface Props {
  score: number;
}

export const BankedScore: React.FC<Props> = ({ score }) => {
  return (
    <GlassPanel pill className="px-ds-md py-ds-xs flex items-center">
      <StatPill label="Banked" value={score.toLocaleString()} />
    </GlassPanel>
  );
};
