import React, { useState, useEffect, useRef } from 'react';
import type { RunNode, SpookTier } from '@/types/expedition';
import { NODE_TYPE_LABELS, GEM_COLOR_MAP, getGemDefinition } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { affinitySetBuffsGem, getAffinityDefinition } from '@/expedition/affinities';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { formatNodeObstacleLabel, OBSTACLE_FAMILY_LABELS } from '@/game/nodeObstacles';

interface Props {
  node: RunNode;
  nodeIndex: number;
  activeAffinities: AffinityType[];
  onComplete: () => void;
}

export const ActiveEncounterPanel: React.FC<Props> = ({ node, nodeIndex, activeAffinities, onComplete }) => {
  const [clicked, setClicked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState<{ label: string; emoji?: string } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bonusPool, setBonusPool] = useState<{ current: number; start: number; pct: number; tier: SpookTier } | null>(null);

  const hasObjective = node.objectiveTarget > 0;

  // Reset when node changes
  useEffect(() => {
    setClicked(false);
    setProgress(0);
    setFlash(null);
    setBonusPool(null);
  }, [nodeIndex]);

  // Listen for node bonus decay ticks
  useEffect(() => {
    const handler = (data: EventPayloads['node-bonus-tick']) => {
      setBonusPool({ current: data.currentPool, start: data.startPool, pct: data.pct, tier: data.tier });
    };
    EventBus.on('node-bonus-tick', handler);
    return () => { EventBus.off('node-bonus-tick', handler); };
  }, []);

  // Listen for encounter-triggered events
  useEffect(() => {
    const handler = (data: EventPayloads['encounter-triggered']) => {
      setFlash({ label: data.effect.label, emoji: data.souvenirDrop?.emoji });
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(null), 2000);
    };
    EventBus.on('encounter-triggered', handler);
    return () => {
      EventBus.off('encounter-triggered', handler);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Listen to objective progress from Game scene
  useEffect(() => {
    if (!hasObjective) return;

    const handler = (data: EventPayloads['node-objective-updated']) => {
      setProgress(data.progress);
    };

    EventBus.on('node-objective-updated', handler);
    return () => { EventBus.off('node-objective-updated', handler); };
  }, [hasObjective, nodeIndex]);

  const handleClick = () => {
    setClicked(true);
    onComplete();
  };

  const pct = hasObjective ? Math.min(100, (progress / node.objectiveTarget) * 100) : 0;

  const isEncounter = node.node_type === 'standoff';

  return (
    <div style={{
      position: 'absolute',
      top: '6px',
      right: '6px',
      zIndex: 50,
      background: 'var(--ds-glass-bg)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${isEncounter ? 'var(--ds-accent-amber)' : 'var(--ds-border-subtle)'}`,
      borderRadius: '7px',
      padding: '8px 10px',
      maxWidth: '200px',
      fontFamily: 'inherit',
      color: 'var(--ds-text-primary)',
      boxShadow: isEncounter ? 'var(--ds-glow-amber)' : 'var(--ds-shadow-card)',
    }}>
      {/* Encounter banner — creature silhouette */}
      {isEncounter && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '6px', padding: '4px 6px',
          background: 'rgba(245,158,11,0.1)', borderRadius: '6px',
        }}>
          <span style={{ fontSize: '24px', filter: 'brightness(0) opacity(0.4)' }}>🦎</span>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ds-accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Creature Spotted
            </div>
            <div style={{ fontSize: '9px', color: 'var(--ds-text-muted)' }}>
              Gather data before it flees!
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-accent-cyan)', marginBottom: '3px', lineHeight: 1.2 }}>
        Node {nodeIndex + 1}: {NODE_TYPE_LABELS[node.node_type] || node.node_type.replace(/_/g, ' ')}
        <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--ds-text-secondary)', marginLeft: '5px' }}>Lv.{node.difficulty}</span>
      </div>

      {node.obstacles.length > 0 && (
        <div style={{ fontSize: '9px', color: 'var(--ds-accent-amber)', marginBottom: '2px', lineHeight: 1.25 }}>
          Obstacles: {node.obstacles.map(formatNodeObstacleLabel).join(', ')}
        </div>
      )}

      {node.obstacleFamily && (
        <div style={{ fontSize: '9px', color: 'var(--ds-accent-cyan)', marginBottom: '5px', lineHeight: 1.25 }}>
          Counter: {OBSTACLE_FAMILY_LABELS[node.obstacleFamily]}
        </div>
      )}

      <div style={{ fontSize: '10px', lineHeight: 1.35, color: 'var(--ds-text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>
        {node.rationale}
      </div>

      {/* Spook / tracking meter */}
      {bonusPool && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '2px' }}>
            <span style={{ color: 'var(--ds-text-secondary)' }}>Tracking</span>
            <span style={{
              color: bonusPool.tier === 'stabilized' ? '#4ade80' : bonusPool.tier === 'spooked' ? '#fbbf24' : '#f87171',
              fontWeight: 600,
            }}>
              {bonusPool.tier === 'stabilized' ? 'Stabilized' : bonusPool.tier === 'spooked' ? 'Spooked!' : 'Escaping...'}
            </span>
          </div>
          <div style={{ height: '3px', background: 'var(--ds-background)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${bonusPool.pct * 100}%`,
              background: bonusPool.tier === 'stabilized' ? '#4ade80' : bonusPool.tier === 'spooked' ? '#fbbf24' : '#f87171',
              borderRadius: '999px',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      )}

      {/* Gem objective: show required gem swatches + progress bar */}
      {hasObjective && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
            <span style={{ fontSize: '10px', color: 'var(--ds-text-secondary)' }}>Match:</span>
            {node.counterGem && (
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: GEM_COLOR_MAP[node.counterGem] ?? '#888',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: affinitySetBuffsGem(activeAffinities, node.counterGem) ? `0 0 8px ${GEM_COLOR_MAP[node.counterGem] ?? '#22d3ee'}` : 'none',
              }} />
            )}
            <span style={{ fontSize: '10px', color: 'var(--ds-text-primary)', marginLeft: '3px' }}>
              {progress}/{node.objectiveTarget}
            </span>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--ds-text-secondary)', marginBottom: '3px' }}>
            {node.counterGem ? getGemDefinition(node.counterGem).label : 'No active tool'}
          </div>
          {node.counterGem && affinitySetBuffsGem(activeAffinities, node.counterGem) && (
            <div style={{ fontSize: '8px', color: '#c084fc', marginBottom: '3px', lineHeight: 1.3 }}>
              Buffed by {activeAffinities.map((affinity) => getAffinityDefinition(affinity).label).join(', ')}
            </div>
          )}
          <div style={{
            height: '5px',
            background: 'var(--ds-background)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #0ea5e9, #22d3ee)',
              borderRadius: '999px',
              transition: 'width 0.2s ease',
            }} />
          </div>
        </div>
      )}

      {/* Manual button only for analysis nodes (no gem objective) */}
      {!hasObjective && (
        <button
          onClick={handleClick}
          disabled={clicked}
          style={{
            width: '100%',
            padding: '5px',
            fontSize: '11px',
            fontWeight: 600,
            background: clicked ? 'var(--ds-surface-elevated)' : '#1d4ed8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: clicked ? 'not-allowed' : 'pointer',
            opacity: clicked ? 0.6 : 1,
          }}
        >
          {clicked ? 'Advancing...' : 'Complete Node'}
        </button>
      )}

      {/* Encounter flash overlay */}
      {flash && (
        <div style={{
          marginTop: '5px',
          padding: '5px 8px',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(34,211,238,0.15))',
          border: '1px solid var(--ds-accent-cyan)',
          borderRadius: '6px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
          transition: 'opacity 0.5s ease',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ds-accent-cyan)', lineHeight: 1.2 }}>
            {flash.label}
          </div>
          {flash.emoji && (
            <div style={{ fontSize: '14px', marginTop: '1px' }}>{flash.emoji}</div>
          )}
        </div>
      )}
    </div>
  );
};
