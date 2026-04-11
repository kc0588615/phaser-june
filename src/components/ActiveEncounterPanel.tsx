import React, { useState, useEffect } from 'react';
import type { RunNode, SpookTier } from '@/types/expedition';
import { NODE_TYPE_LABELS, getGemDefinition } from '@/expedition/domain';
import { GemSwatch } from '@/components/ui/gem-swatch';
import type { AffinityType } from '@/expedition/affinities';
import { affinitySetBuffsGem, getAffinityDefinition } from '@/expedition/affinities';
import { formatNodeObstacleLabel, OBSTACLE_FAMILY_LABELS } from '@/game/nodeObstacles';
import { useGameBridge } from '@/contexts/GameBridgeContext';

interface Props {
  node: RunNode;
  nodeIndex: number;
  activeAffinities: AffinityType[];
  onComplete: () => void;
}

const TIER_COLORS: Record<SpookTier, string> = {
  stabilized: 'var(--ds-accent-emerald)',
  spooked: 'var(--ds-accent-amber)',
  escaped: 'var(--ds-accent-rose)',
};
const TIER_LABELS: Record<SpookTier, string> = {
  stabilized: 'Stabilized',
  spooked: 'Spooked!',
  escaped: 'Escaping...',
};

export const ActiveEncounterPanel: React.FC<Props> = ({ node, nodeIndex, activeAffinities, onComplete }) => {
  const { bonusPool, encounterFlash, objectiveProgress } = useGameBridge();

  const [clicked, setClicked] = useState(false);
  const hasObjective = node.objectiveTarget > 0;
  const progress = objectiveProgress?.progress ?? 0;

  useEffect(() => { setClicked(false); }, [nodeIndex]);

  const handleClick = () => { setClicked(true); onComplete(); };

  const pct = hasObjective ? Math.min(100, (progress / node.objectiveTarget) * 100) : 0;
  const isEncounter = node.node_type === 'standoff';

  return (
    <section
      aria-label={`Active node: ${NODE_TYPE_LABELS[node.node_type] || node.node_type}`}
      className={`
        absolute top-1.5 right-1.5 z-hud glass-bg rounded-md max-w-[180px] sm:max-w-[220px] p-2 sm:p-2.5
        text-ds-text-primary border
        ${isEncounter ? 'border-[var(--ds-accent-amber)] shadow-glow-amber' : 'border-ds-subtle shadow-ds-card'}
      `}
    >
      {/* Encounter banner */}
      {isEncounter && (
        <div className="flex items-center gap-1.5 mb-1.5 p-1.5 bg-ds-amber/10 rounded-md">
          <span className="text-2xl brightness-0 opacity-40">🦎</span>
          <div>
            <div className="text-ds-badge font-bold text-ds-amber uppercase tracking-wider">Creature Spotted</div>
            <div className="text-[9px] text-ds-text-muted">Gather data before it flees!</div>
          </div>
        </div>
      )}

      <div className="text-ds-caption font-bold text-ds-cyan mb-1 leading-tight">
        Node {nodeIndex + 1}: {NODE_TYPE_LABELS[node.node_type] || node.node_type.replace(/_/g, ' ')}
        <span className="font-normal text-ds-badge text-ds-text-secondary ml-1.5">Lv.{node.difficulty}</span>
      </div>

      {node.obstacles.length > 0 && (
        <div className="text-[9px] text-ds-amber mb-0.5 leading-tight">
          Obstacles: {node.obstacles.map(formatNodeObstacleLabel).join(', ')}
        </div>
      )}

      {node.obstacleFamily && (
        <div className="text-[9px] text-ds-cyan mb-1.5 leading-tight">
          Counter: {OBSTACLE_FAMILY_LABELS[node.obstacleFamily]}
        </div>
      )}

      <div className="text-ds-badge text-ds-text-secondary italic mb-1.5 leading-snug">
        {node.rationale}
      </div>

      {/* Spook / tracking meter */}
      {bonusPool && (
        <div className="mb-1.5">
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="text-ds-text-secondary">Tracking</span>
            <span className="font-semibold" style={{ color: TIER_COLORS[bonusPool.tier] }}>
              {TIER_LABELS[bonusPool.tier]}
            </span>
          </div>
          <div className="h-[3px] bg-ds-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${bonusPool.pct * 100}%`, background: TIER_COLORS[bonusPool.tier] }}
            />
          </div>
        </div>
      )}

      {/* Gem objective */}
      {hasObjective && (
        <div className="mb-1.5">
          <div className="flex items-center gap-ds-xs mb-1">
            <span className="text-ds-badge text-ds-text-secondary">Match:</span>
            {node.counterGem && (
              <GemSwatch gem={node.counterGem} size={10} glow={affinitySetBuffsGem(activeAffinities, node.counterGem)} />
            )}
            <span className="text-ds-badge text-ds-text-primary ml-1">{progress}/{node.objectiveTarget}</span>
          </div>
          <div className="text-[9px] text-ds-text-secondary mb-1">
            {node.counterGem ? getGemDefinition(node.counterGem).label : 'No active tool'}
          </div>
          {node.counterGem && affinitySetBuffsGem(activeAffinities, node.counterGem) && (
            <div className="text-[8px] text-[var(--ds-gem-focus)] mb-1 leading-snug">
              Buffed by {activeAffinities.map((a) => getAffinityDefinition(a).label).join(', ')}
            </div>
          )}
          <div className="h-[5px] bg-ds-bg rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{
                width: `${pct}%`,
                background: pct >= 100 ? 'var(--ds-accent-emerald)' : 'var(--ds-gradient-progress)',
              }}
            />
          </div>
        </div>
      )}

      {/* Manual complete button */}
      {!hasObjective && (
        <button
          onClick={handleClick}
          disabled={clicked}
          aria-label={clicked ? 'Advancing to next node' : 'Complete current node'}
          className={`
            w-full py-1.5 text-ds-caption font-semibold rounded border-none text-white
            ${clicked ? 'bg-ds-surface-elevated cursor-not-allowed opacity-60' : 'bg-blue-700 cursor-pointer'}
          `}
        >
          {clicked ? 'Advancing...' : 'Complete Node'}
        </button>
      )}

      {/* Encounter flash */}
      {encounterFlash && (
        <div className="mt-1.5 py-1.5 px-2 bg-gradient-to-br from-[rgba(14,165,233,0.3)] to-[rgba(34,211,238,0.15)] border border-ds-accent rounded-md text-center">
          <div className="text-ds-badge font-bold text-ds-cyan leading-tight">{encounterFlash.label}</div>
          {encounterFlash.emoji && <div className="text-sm mt-0.5">{encounterFlash.emoji}</div>}
        </div>
      )}
    </section>
  );
};
