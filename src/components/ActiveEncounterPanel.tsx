import React, { useState, useEffect, useRef } from 'react';
import type { RunNode, EncounterEffect, SouvenirDef } from '@/types/expedition';
import { NODE_TYPE_LABELS, GEM_COLOR_MAP, getGemDefinition } from '@/expedition/domain';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { formatNodeObstacleLabel } from '@/game/nodeObstacles';

interface Props {
  node: RunNode;
  nodeIndex: number;
  onComplete: () => void;
}

export const ActiveEncounterPanel: React.FC<Props> = ({ node, nodeIndex, onComplete }) => {
  const [clicked, setClicked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState<{ label: string; emoji?: string } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasObjective = node.objectiveTarget > 0;

  // Reset when node changes
  useEffect(() => {
    setClicked(false);
    setProgress(0);
    setFlash(null);
  }, [nodeIndex]);

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

  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      zIndex: 50,
      background: 'rgba(15,23,42,0.9)',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 14px',
      maxWidth: '240px',
      fontFamily: 'sans-serif',
      color: '#e2e8f0',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#67e8f9', marginBottom: '4px' }}>
        Node {nodeIndex + 1}: {NODE_TYPE_LABELS[node.node_type] || node.node_type.replace(/_/g, ' ')}
        <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px' }}>Lv.{node.difficulty}</span>
      </div>

      {node.obstacles.length > 0 && (
        <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '2px' }}>
          Obstacles: {node.obstacles.map(formatNodeObstacleLabel).join(', ')}
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
        {node.rationale}
      </div>

      {/* Gem objective: show required gem swatches + progress bar */}
      {hasObjective && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Match:</span>
            {node.requiredGems.map((g, i) => (
              <div key={i} style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: GEM_COLOR_MAP[g] ?? '#888',
                border: '1px solid rgba(255,255,255,0.3)',
              }} />
            ))}
            <span style={{ fontSize: '11px', color: '#cbd5e1', marginLeft: '4px' }}>
              {progress}/{node.objectiveTarget}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
            {node.requiredGems.map((gemType) => getGemDefinition(gemType).label).join(' + ')}
          </div>
          <div style={{
            height: '6px',
            background: '#1e293b',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg, #0ea5e9, #22d3ee)',
              borderRadius: '3px',
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
            padding: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: clicked ? '#475569' : '#1d4ed8',
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
          marginTop: '6px',
          padding: '6px 10px',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(34,211,238,0.15))',
          border: '1px solid #22d3ee',
          borderRadius: '6px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
          transition: 'opacity 0.5s ease',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#67e8f9' }}>
            {flash.label}
          </div>
          {flash.emoji && (
            <div style={{ fontSize: '18px', marginTop: '2px' }}>{flash.emoji}</div>
          )}
        </div>
      )}
    </div>
  );
};
