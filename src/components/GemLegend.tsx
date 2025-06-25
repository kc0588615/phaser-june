import React from 'react';

interface GemLegendProps {
  style?: React.CSSProperties;
}

export const GemLegend: React.FC<GemLegendProps> = ({ style }) => {
  const gemCategories = [
    { color: 'red', category: 'Classification', icon: '🧬', description: 'Taxonomic information' },
    { color: 'green', category: 'Habitat', icon: '🌳', description: 'Where it lives' },
    { color: 'blue', category: 'Geographic & Habitat', icon: '🗺️', description: 'Geographic range & habitat' },
    { color: 'orange', category: 'Morphology', icon: '🐾', description: 'Physical appearance & dimensions' },
    { color: 'white', category: 'Behavior & Diet', icon: '💨', description: 'How it acts & what it eats' },
    { color: 'black', category: 'Life Cycle', icon: '⏳', description: 'Reproduction & lifespan' },
    { color: 'yellow', category: 'Conservation', icon: '🛡️', description: 'Conservation status' },
    { color: 'purple', category: 'Key Facts', icon: '❗', description: 'Unique identifying traits' }
  ];

  const containerStyle: React.CSSProperties = {
    ...style,
    padding: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    maxHeight: '400px',
    overflowY: 'auto'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    textAlign: 'center'
  };

  const legendItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    padding: '4px'
  };

  const gemColorStyle = (color: string): React.CSSProperties => ({
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    marginRight: '8px',
    border: '1px solid #ccc',
    backgroundColor: color === 'black' ? '#2c2c2c' : color === 'purple' ? '#8B00FF' : color,
    flexShrink: 0
  });

  const iconStyle: React.CSSProperties = {
    marginRight: '6px',
    fontSize: '14px'
  };

  const textContainerStyle: React.CSSProperties = {
    flex: 1
  };

  const categoryStyle: React.CSSProperties = {
    fontWeight: 'bold',
    marginBottom: '2px'
  };

  const descriptionStyle: React.CSSProperties = {
    color: '#ccc',
    fontSize: '11px'
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Gem Categories</div>
      {gemCategories.map((item, index) => (
        <div key={index} style={legendItemStyle}>
          <div style={gemColorStyle(item.color)}></div>
          <span style={iconStyle}>{item.icon}</span>
          <div style={textContainerStyle}>
            <div style={categoryStyle}>{item.category}</div>
            <div style={descriptionStyle}>{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};