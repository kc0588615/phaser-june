import React, { useState, useEffect, useRef } from 'react';
import type { RunNode } from '@/types/expedition';
import { NODE_TYPE_LABELS } from '@/types/expedition';

interface Props {
  node: RunNode;
  nodeIndex: number;
  onComplete: () => void;
}

export const ActiveEncounterPanel: React.FC<Props> = ({ node, nodeIndex, onComplete }) => {
  const [clicked, setClicked] = useState(false);
  const completedRef = useRef(false);

  // Reset both state and ref when node changes
  useEffect(() => { setClicked(false); completedRef.current = false; }, [nodeIndex]);

  const handleClick = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setClicked(true);
    onComplete();
  };

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
          Obstacles: {node.obstacles.join(', ')}
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '8px' }}>
        {node.rationale}
      </div>

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
    </div>
  );
};
