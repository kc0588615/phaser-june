import React from 'react';
import type { ExpeditionData } from '@/types/expedition';
import { ACTION_GEM_DEFS, NODE_TYPE_LABELS } from '@/expedition/domain';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  expedition: ExpeditionData;
  onStart: () => void;
}

export const ExpeditionBriefing: React.FC<Props> = ({ expedition, onStart }) => {
  const avgDifficulty = expedition.nodes.length > 0
    ? expedition.nodes.reduce((sum, n) => sum + n.difficulty, 0) / expedition.nodes.length
    : 0;

  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflow: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      color: '#e2e8f0',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', color: '#67e8f9' }}>Expedition Briefing</h2>
        <Badge variant="outline" style={{ color: '#fbbf24', borderColor: '#fbbf24' }}>
          Difficulty: {avgDifficulty.toFixed(1)} / 5
        </Badge>
      </div>

      {/* Location */}
      {expedition.bioregion && (
        <Card style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>
          <CardContent style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{expedition.bioregion.bioregion || 'Unknown Bioregion'}</div>
            {expedition.bioregion.biome && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{expedition.bioregion.biome}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Protected Areas */}
      {expedition.protectedAreas.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {expedition.protectedAreas.slice(0, 3).map((pa, i) => (
            <Badge key={i} variant="secondary" style={{ fontSize: '11px', background: '#1e3a5f', color: '#93c5fd' }}>
              {pa.name || pa.designation || 'Protected Area'}
            </Badge>
          ))}
        </div>
      )}

      {/* ICCA Territories */}
      {expedition.iccaTerritories && expedition.iccaTerritories.length > 0 && (
        <Card style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid #f97316' }}>
          <CardContent style={{ padding: '8px 12px' }}>
            <div style={{ fontSize: '11px', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ICCA Territory</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{expedition.iccaTerritories[0].name || 'Community Conserved Area'}</div>
            {expedition.iccaTerritories[0].comm_name && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{expedition.iccaTerritories[0].comm_name}</div>
            )}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {(expedition.iccaTerritories[0].distance_m / 1000).toFixed(1)} km away
            </div>
          </CardContent>
        </Card>
      )}

      {/* River proximity */}
      {expedition.nearestRiverDistM != null && expedition.nearestRiverDistM < 10000 && (
        <Badge variant="outline" style={{ color: '#3b82f6', borderColor: '#3b82f6', alignSelf: 'flex-start' }}>
          River {(expedition.nearestRiverDistM / 1000).toFixed(1)} km
        </Badge>
      )}

      {/* Action Bias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
        {ACTION_GEM_DEFS.map(({ gemType, label, color }) => {
          const actionGemType = gemType as keyof ExpeditionData['actionBias'];
          const weight = expedition.actionBias[actionGemType] ?? 0.125;
          const maxWeight = Math.max(...Object.values(expedition.actionBias), 0.125);
          const pct = Math.round((weight / maxWeight) * 100);
          return (
            <div key={gemType} style={{ textAlign: 'center' }}>
              <div style={{ height: '6px', borderRadius: '3px', background: '#1e293b' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: color,
                  width: `${pct}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                {label} <span style={{ color, fontWeight: 600 }}>{Math.round(weight * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nodes preview */}
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
        {expedition.nodes.map((node, i) => (
          <div key={i} style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #475569',
            fontSize: '11px',
            textAlign: 'center',
            background: 'rgba(30,41,59,0.6)',
          }}>
            <div style={{ fontWeight: 600 }}>{NODE_TYPE_LABELS[node.node_type] || node.node_type}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Lv.{node.difficulty}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        style={{
          marginTop: 'auto',
          padding: '10px 20px',
          fontSize: '16px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        Start Expedition
      </button>
    </div>
  );
};
