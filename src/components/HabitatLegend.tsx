import React, { useState } from 'react';
import { getHabitatColor } from '../config/habitatColors';

interface HabitatData {
  habitat_type: string;
  percentage: number;
  color?: string;
}

interface HabitatLegendProps {
  habitats: HabitatData[];
  radiusKm: number;
}

export default function HabitatLegend({ habitats, radiusKm }: HabitatLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const sortedHabitats = [...habitats].sort((a, b) => b.percentage - a.percentage);

  return (
    <div style={{
      width: '100%',
      paddingTop: '5px',
      marginTop: '5px',
      borderTop: '1px solid #555',
      color: 'white',
      fontFamily: 'sans-serif',
      fontSize: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isCollapsed ? 0 : '5px',
        cursor: 'pointer'
      }} onClick={() => setIsCollapsed(!isCollapsed)}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '12px',
          fontWeight: 'normal'
        }}>
          Details
        </h4>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '0 0 0 8px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div style={{ 
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '5px'
        }}>
          {sortedHabitats.length === 0 ? (
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              No habitats detected
            </div>
          ) : (
            sortedHabitats.map((habitat, index) => (
              <div
                key={`habitat-${habitat.habitat_type.replace(/[^a-zA-Z0-9]/g, '-')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '4px',
                  fontSize: '12px'
                }}
              >
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: habitat.color || getHabitatColor(habitat.habitat_type),
                    border: '1px solid #fff',
                    marginRight: '6px',
                    flexShrink: 0,
                    borderRadius: '2px'
                  }}
                />
                <span style={{ 
                  flex: 1, 
                  marginRight: '4px',
                  wordBreak: 'break-word',
                  lineHeight: '1.2'
                }}>
                  {habitat.habitat_type.split(' - ').map((part, i) => {
                    // For the first part (category), display as-is
                    if (i === 0) {
                      return (
                        <React.Fragment key={`habitat-category-${part.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '-')}`}>
                          {part}
                        </React.Fragment>
                      );
                    }
                    
                    // For the description part, split into multiple lines if needed
                    const words = part.split(' ');
                    if (words.length <= 2 && part.length <= 20) {
                      // Short descriptions stay on same line
                      return (
                        <React.Fragment key={`habitat-short-desc-${part.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '-')}`}>
                          {' - '}
                          {part}
                        </React.Fragment>
                      );
                    }
                    
                    // Long descriptions get split into multiple lines
                    const lines: string[] = [];
                    let currentLine = '';
                    
                    words.forEach((word, wordIndex) => {
                      const testLine = currentLine ? `${currentLine} ${word}` : word;
                      
                      // Start a new line if:
                      // - Adding this word would exceed 20 chars
                      // - Current line already has 2+ words
                      // - We're at the 3rd line
                      if (lines.length < 2 && currentLine && 
                          (testLine.length > 20 || currentLine.split(' ').length >= 2)) {
                        lines.push(currentLine);
                        currentLine = word;
                      } else {
                        currentLine = testLine;
                      }
                    });
                    
                    // Add the last line
                    if (currentLine) {
                      lines.push(currentLine);
                    }
                    
                    return (
                      <React.Fragment key={`habitat-long-desc-${part.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '-')}`}>
                        {' - '}
                        <br />
                        {lines.map((line, lineIndex) => (
                          <React.Fragment key={`habitat-line-${lineIndex}-${line.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '-')}`}>
                            {lineIndex > 0 && <br />}
                            {line}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </span>
                <span style={{ 
                  fontWeight: 'bold',
                  minWidth: '40px',
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