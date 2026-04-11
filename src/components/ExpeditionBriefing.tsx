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

  const obstacleCounts: Partial<Record<ObstacleFamily, number>> = {};
  let totalObstacles = 0;
  for (const node of expedition.nodes) {
    if (node.obstacleFamily) {
      obstacleCounts[node.obstacleFamily] = (obstacleCounts[node.obstacleFamily] ?? 0) + 1;
      totalObstacles++;
    }
  }

  return (
    <div className="h-full min-h-0 flex-1 w-full overflow-y-auto p-ds-lg box-border flex flex-col gap-ds-md text-ds-text-primary">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ds-text-primary">
            {expedition.bioregion?.bioregion || 'Expedition Briefing'}
          </h2>
          {expedition.bioregion?.biome && (
            <div className="text-ds-body text-ds-text-secondary mt-0.5">{expedition.bioregion.biome}</div>
          )}
        </div>
        <div className="flex gap-ds-sm items-center">
          <Badge variant="outline" className="text-ds-amber border-[var(--ds-accent-amber)]">
            {'★'.repeat(Math.round(avgDifficulty))}{'☆'.repeat(5 - Math.round(avgDifficulty))}
          </Badge>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-transparent border border-ds-subtle rounded-md text-ds-text-secondary text-base leading-none px-ds-sm py-ds-xs cursor-pointer"
              aria-label="Back to map"
              title="Back to map"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Protected Areas + ICCA badges */}
      {(expedition.protectedAreas.length > 0 || (expedition.iccaTerritories && expedition.iccaTerritories.length > 0)) && (
        <div className="flex gap-1.5 flex-wrap">
          {expedition.protectedAreas.slice(0, 3).map((pa, i) => (
            <Badge key={`pa-${i}`} variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-[var(--ds-gem-scan)]">
              {pa.name || pa.designation || 'Protected Area'}
            </Badge>
          ))}
          {expedition.iccaTerritories?.slice(0, 1).map((icca, i) => (
            <Badge key={`icca-${i}`} variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-ds-amber">
              {icca.name || 'ICCA Territory'}
            </Badge>
          ))}
          {expedition.nearestRiverDistM != null && expedition.nearestRiverDistM < 10000 && (
            <Badge variant="secondary" className="text-ds-caption bg-ds-surface-elevated text-[var(--ds-gem-scan)]">
              River {(expedition.nearestRiverDistM / 1000).toFixed(1)} km
            </Badge>
          )}
        </div>
      )}

      {/* Obstacle Preview Bar */}
      {totalObstacles > 0 && (
        <div>
          <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1.5">Route Hazards</div>
          <div className="flex h-2 rounded overflow-hidden gap-0.5">
            {(Object.entries(obstacleCounts) as [ObstacleFamily, number][]).map(([family, count]) => (
              <div
                key={family}
                className="rounded"
                style={{ flex: count, background: OBSTACLE_FAMILY_COLORS[family] ?? 'var(--ds-text-muted)' }}
                title={`${OBSTACLE_FAMILY_LABELS[family]}: ${Math.round((count / totalObstacles) * 100)}%`}
              />
            ))}
          </div>
          <div className="flex gap-ds-sm mt-ds-xs flex-wrap">
            {(Object.entries(obstacleCounts) as [ObstacleFamily, number][]).map(([family, count]) => (
              <div key={family} className="flex items-center gap-ds-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: OBSTACLE_FAMILY_COLORS[family] }} />
                <span className="text-ds-badge text-ds-text-secondary">
                  {OBSTACLE_FAMILY_LABELS[family]} {Math.round((count / totalObstacles) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Preview */}
      <div>
        <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1.5">Route</div>
        <div className="flex items-center justify-center overflow-x-auto py-ds-xs">
          {expedition.nodes.map((node, i) => {
            const isEncounter = node.node_type === 'analysis' || node.obstacles.length === 0;
            const gemColor = node.counterGem ? GEM_COLOR_MAP[node.counterGem] : 'var(--ds-text-muted)';
            return (
              <React.Fragment key={i}>
                {i > 0 && <div className="w-4 h-0.5 bg-ds-surface-elevated shrink-0" />}
                <div
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-ds-surface flex flex-col items-center justify-center shrink-0"
                  style={{
                    border: `2px solid ${gemColor}`,
                    boxShadow: isEncounter ? 'none' : `0 0 6px ${gemColor}44`,
                  }}
                  title={`${NODE_TYPE_LABELS[node.node_type] || node.node_type} Lv.${node.difficulty}`}
                >
                  <div className="text-[9px] font-bold leading-none" style={{ color: gemColor }}>
                    {NODE_TYPE_LABELS[node.node_type]?.slice(0, 3) || '?'}
                  </div>
                  <div className="text-[8px] text-ds-text-muted leading-none">{node.difficulty}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Affinity Loadout */}
      {expedition.availableAffinities.length > 0 && (
        <div>
          <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1.5">Equip Affinity</div>
          <div role="radiogroup" aria-label="Affinity selection" className="flex gap-ds-sm overflow-x-auto py-0.5">
            {expedition.availableAffinities.map((affinity) => {
              const def = getAffinityDefinition(affinity);
              const selected = selectedAffinity === affinity;
              return (
                <button
                  key={affinity}
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${def.label} affinity: ${def.shortEffect}`}
                  onClick={() => onSelectAffinity(affinity)}
                  className={`
                    flex flex-col gap-ds-xs text-center items-center py-2.5 px-ds-md rounded-xl
                    min-w-[85px] sm:min-w-[100px] shrink-0 cursor-pointer transition-all duration-200 text-ds-text-primary
                    ${selected ? 'bg-ds-surface' : 'glass-bg'}
                  `}
                  style={{
                    border: selected ? `2px solid ${def.color}` : '1px solid var(--ds-border-subtle)',
                    boxShadow: selected ? `0 0 12px ${def.color}44` : 'none',
                  }}
                >
                  <span className="text-ds-body font-bold" style={{ color: def.color }}>{def.label}</span>
                  <span className="text-ds-badge text-ds-text-secondary">{def.familyLabel}</span>
                  <span className="text-ds-badge text-ds-text-muted">{def.shortEffect}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Bias */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-ds-sm">
        {ACTION_GEM_DEFS.map(({ gemType, label, color }) => {
          const actionGemType = gemType as keyof ExpeditionData['actionBias'];
          const weight = expedition.actionBias[actionGemType] ?? 0.125;
          const maxWeight = Math.max(...Object.values(expedition.actionBias), 0.125);
          const pct = Math.round((weight / maxWeight) * 100);
          return (
            <div key={gemType} className="text-center">
              <div className="h-1.5 rounded-sm bg-ds-bg">
                <div className="h-full rounded-sm transition-[width] duration-300" style={{ background: color, width: `${pct}%` }} />
              </div>
              <div className="text-ds-badge text-ds-text-secondary mt-1">
                {label} <span className="font-semibold" style={{ color }}>{Math.round(weight * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start button */}
      <div className="mt-auto pt-ds-xs shrink-0">
        <button
          onClick={onStart}
          className="w-full py-3.5 px-5 text-base font-bold text-ds-bg border-none rounded-full cursor-pointer text-center shadow-glow-cyan"
          style={{ background: 'var(--ds-gradient-cta)' }}
        >
          Start Expedition
        </button>
      </div>
    </div>
  );
};
