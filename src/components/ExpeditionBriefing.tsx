import React from 'react';
import type { ExpeditionData } from '@/types/expedition';
import { ACTION_GEM_DEFS, NODE_TYPE_LABELS, GEM_COLOR_MAP } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { getAffinityDefinition } from '@/expedition/affinities';
import { OBSTACLE_FAMILY_LABELS } from '@/game/nodeObstacles';
import type { ObstacleFamily } from '@/game/nodeObstacles';
import { Badge } from '@/components/ui/badge';

interface Props {
  expedition: ExpeditionData;
  onStart: () => void;
  onSelectAffinity: (affinityId: AffinityType | null) => void;
  onClose?: () => void;
}

const OBSTACLE_FAMILY_COLORS: Record<ObstacleFamily, string> = {
  visibility: 'var(--ds-gem-scan)',
  alert: 'var(--ds-gem-camouflage)',
  terrain: 'var(--ds-gem-traverse)',
  sighting: 'var(--ds-gem-observe)',
  panic: 'var(--ds-accent-rose)',
};

export const ExpeditionBriefing: React.FC<Props> = ({ expedition, onStart, onSelectAffinity, onClose }) => {
  const avgDifficulty = expedition.nodes.length > 0
    ? expedition.nodes.reduce((sum, n) => sum + n.difficulty, 0) / expedition.nodes.length
    : 0;
  const selectedAffinity = expedition.activeAffinities[0] ?? null;

  // Compute obstacle family breakdown across all nodes
  const obstacleCounts: Partial<Record<ObstacleFamily, number>> = {};
  let totalObstacles = 0;
  for (const node of expedition.nodes) {
    if (node.obstacleFamily) {
      obstacleCounts[node.obstacleFamily] = (obstacleCounts[node.obstacleFamily] ?? 0) + 1;
      totalObstacles++;
    }
  }

  return (
    <div style={{
      height: '100%',
      minHeight: 0,
      flex: '1 1 auto',
      width: '100%',
      overflowY: 'auto',
      padding: '16px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      color: 'var(--ds-text-primary)',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ds-text-primary)' }}>
            {expedition.bioregion?.bioregion || 'Expedition Briefing'}
          </h2>
          {expedition.bioregion?.biome && (
            <div style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', marginTop: '2px' }}>
              {expedition.bioregion.biome}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge variant="outline" style={{ color: 'var(--ds-accent-amber)', borderColor: 'var(--ds-accent-amber)' }}>
            {'★'.repeat(Math.round(avgDifficulty))}{'☆'.repeat(5 - Math.round(avgDifficulty))}
          </Badge>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: '6px',
                color: 'var(--ds-text-secondary)',
                fontSize: '16px',
                lineHeight: 1,
                padding: '4px 8px',
                cursor: 'pointer',
              }}
              title="Back to map"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Protected Areas + ICCA as badges */}
      {(expedition.protectedAreas.length > 0 || (expedition.iccaTerritories && expedition.iccaTerritories.length > 0)) && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {expedition.protectedAreas.slice(0, 3).map((pa, i) => (
            <Badge key={`pa-${i}`} variant="secondary" style={{ fontSize: '11px', background: 'var(--ds-surface-elevated)', color: 'var(--ds-gem-scan)' }}>
              {pa.name || pa.designation || 'Protected Area'}
            </Badge>
          ))}
          {expedition.iccaTerritories?.slice(0, 1).map((icca, i) => (
            <Badge key={`icca-${i}`} variant="secondary" style={{ fontSize: '11px', background: 'var(--ds-surface-elevated)', color: 'var(--ds-accent-amber)' }}>
              {icca.name || 'ICCA Territory'}
            </Badge>
          ))}
          {expedition.nearestRiverDistM != null && expedition.nearestRiverDistM < 10000 && (
            <Badge variant="secondary" style={{ fontSize: '11px', background: 'var(--ds-surface-elevated)', color: 'var(--ds-gem-scan)' }}>
              River {(expedition.nearestRiverDistM / 1000).toFixed(1)} km
            </Badge>
          )}
        </div>
      )}

      {/* Obstacle Preview Bar */}
      {totalObstacles > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Route Hazards
          </div>
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
            {(Object.entries(obstacleCounts) as [ObstacleFamily, number][]).map(([family, count]) => (
              <div
                key={family}
                style={{
                  flex: count,
                  background: OBSTACLE_FAMILY_COLORS[family] ?? 'var(--ds-text-muted)',
                  borderRadius: '4px',
                }}
                title={`${OBSTACLE_FAMILY_LABELS[family]}: ${Math.round((count / totalObstacles) * 100)}%`}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            {(Object.entries(obstacleCounts) as [ObstacleFamily, number][]).map(([family, count]) => (
              <div key={family} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: OBSTACLE_FAMILY_COLORS[family] }} />
                <span style={{ fontSize: '10px', color: 'var(--ds-text-secondary)' }}>
                  {OBSTACLE_FAMILY_LABELS[family]} {Math.round((count / totalObstacles) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected Node Circles — route preview */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Route
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', overflowX: 'auto', padding: '4px 0' }}>
          {expedition.nodes.map((node, i) => {
            const isEncounter = node.node_type === 'analysis' || node.obstacles.length === 0;
            const gemColor = node.counterGem ? GEM_COLOR_MAP[node.counterGem] : 'var(--ds-text-muted)';
            return (
              <React.Fragment key={i}>
                {i > 0 && (
                  <div style={{ width: '16px', height: '2px', background: 'var(--ds-border-subtle)', flexShrink: 0 }} />
                )}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: `2px solid ${gemColor}`,
                    background: 'var(--ds-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: isEncounter ? 'none' : `0 0 6px ${gemColor}44`,
                  }}
                  title={`${NODE_TYPE_LABELS[node.node_type] || node.node_type} Lv.${node.difficulty}`}
                >
                  <div style={{ fontSize: '9px', fontWeight: 700, color: gemColor, lineHeight: 1 }}>
                    {NODE_TYPE_LABELS[node.node_type]?.slice(0, 3) || '?'}
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--ds-text-muted)', lineHeight: 1 }}>
                    {node.difficulty}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Affinity Loadout Selector */}
      {expedition.availableAffinities.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Equip Affinity
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
            {expedition.availableAffinities.map((affinity) => {
              const def = getAffinityDefinition(affinity);
              const selected = selectedAffinity === affinity;
              return (
                <button
                  key={affinity}
                  onClick={() => onSelectAffinity(affinity)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'center',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    minWidth: '100px',
                    flexShrink: 0,
                    border: selected ? `2px solid ${def.color}` : '1px solid var(--ds-border-subtle)',
                    background: selected ? 'var(--ds-surface)' : 'var(--ds-glass-bg)',
                    color: 'var(--ds-text-primary)',
                    cursor: 'pointer',
                    boxShadow: selected ? `0 0 12px ${def.color}44` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, color: def.color }}>{def.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--ds-text-secondary)' }}>{def.familyLabel}</span>
                  <span style={{ fontSize: '10px', color: 'var(--ds-text-muted)' }}>{def.shortEffect}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bias — compact bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
        {ACTION_GEM_DEFS.map(({ gemType, label, color }) => {
          const actionGemType = gemType as keyof ExpeditionData['actionBias'];
          const weight = expedition.actionBias[actionGemType] ?? 0.125;
          const maxWeight = Math.max(...Object.values(expedition.actionBias), 0.125);
          const pct = Math.round((weight / maxWeight) * 100);
          return (
            <div key={gemType} style={{ textAlign: 'center' }}>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--ds-background)' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: color,
                  width: `${pct}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--ds-text-secondary)', marginTop: '3px' }}>
                {label} <span style={{ color, fontWeight: 600 }}>{Math.round(weight * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start button pinned to bottom */}
      <div style={{ marginTop: 'auto', padding: '4px 0 0', flexShrink: 0 }}>
        <button
          onClick={onStart}
          style={{
            width: '100%',
            padding: '14px 20px',
            fontSize: '16px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--ds-accent-cyan), #06b6d4)',
            color: 'var(--ds-background)',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: 'var(--ds-glow-cyan)',
          }}
        >
          Start Expedition
        </button>
      </div>
    </div>
  );
};
