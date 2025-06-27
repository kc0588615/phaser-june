import React, { useState } from 'react';

interface HabitatData {
  habitat_type: string;
  percentage: number;
  color?: string;
}

interface HabitatLegendProps {
  habitats: HabitatData[];
  radiusKm: number;
}

const defaultColors = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', 
  '#9C27B0', '#00BCD4', '#8BC34A', '#FFC107',
  '#795548', '#607D8B', '#3F51B5', '#009688'
];

export default function HabitatLegend({ habitats, radiusKm }: HabitatLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedHabitats = [...habitats].sort((a, b) => b.percentage - a.percentage);

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(40, 40, 40, 0.85)',
      padding: isCollapsed ? '8px 12px' : '10px 15px',
      borderRadius: '5px',
      color: 'white',
      fontFamily: 'sans-serif',
      zIndex: 1000,
      border: '1px solid #444',
      maxWidth: '280px',
      fontSize: '14px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isCollapsed ? 0 : '10px',
        cursor: 'pointer'
      }} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Habitats (within {radiusKm}km)
        </h4>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '0 0 0 10px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div style={{ marginTop: '8px' }}>
          {sortedHabitats.length === 0 ? (
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              No habitats detected
            </div>
          ) : (
            sortedHabitats.map((habitat, index) => (
              <div
                key={`${habitat.habitat_type}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '6px',
                  fontSize: '12px'
                }}
              >
                <span
                  style={{
                    width: '15px',
                    height: '15px',
                    backgroundColor: habitat.color || defaultColors[index % defaultColors.length],
                    border: '1px solid #fff',
                    marginRight: '8px',
                    flexShrink: 0,
                    borderRadius: '2px'
                  }}
                />
                <span style={{ flex: 1, marginRight: '8px' }}>
                  {habitat.habitat_type}
                </span>
                <span style={{ 
                  fontWeight: 'bold',
                  minWidth: '45px',
                  textAlign: 'right'
                }}>
                  {habitat.percentage.toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}