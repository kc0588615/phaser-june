import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import type { ClueData } from '../game/gemCategoryMapping';
import { GemLegend } from './GemLegend';

interface ClueDisplayProps {
  style?: React.CSSProperties;
}

export const ClueDisplay: React.FC<ClueDisplayProps> = ({ style }) => {
  const [clues, setClues] = useState<ClueData[]>([]);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>('');
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [isLoadingClue, setIsLoadingClue] = useState<boolean>(false);

  useEffect(() => {
    // Listen for clue reveals from the game
    const handleClueRevealed = (clueData: ClueData) => {
      setIsLoadingClue(true);
      // Simulate a brief loading state for clue processing
      setTimeout(() => {
        setClues(prev => [...prev, clueData]);
        setIsLoadingClue(false);
      }, 500);
    };

    // Listen for new game starts
    const handleNewGame = (data: { speciesName: string }) => {
      setClues([]);
      setSelectedSpeciesName(data.speciesName);
    };

    // Listen for game reset
    const handleGameReset = () => {
      setClues([]);
      setSelectedSpeciesName('');
    };

    EventBus.on('clue-revealed', handleClueRevealed);
    EventBus.on('new-game-started', handleNewGame);
    EventBus.on('game-reset', handleGameReset);

    return () => {
      EventBus.off('clue-revealed', handleClueRevealed);
      EventBus.off('new-game-started', handleNewGame);
      EventBus.off('game-reset', handleGameReset);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    ...style,
    overflowY: 'auto',
    height: '100%'
  };

  const clueItemStyle: React.CSSProperties = {
    marginBottom: '10px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    borderLeft: '3px solid #4a90e2'
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '4px',
    color: '#4a90e2'
  };

  const clueTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#e0e0e0'
  };

  const gemCategoryIcons: { [key: number]: string } = {
    0: '🧬', // Classification
    1: '🌳', // Habitat
    2: '🗺️', // Geographic
    3: '🐾', // Morphology (combines Color/Pattern and Size/Shape)
    4: '🌿', // Diet
    5: '💨', // Behavior
    6: '⏳', // Life Cycle
    7: '🛡️', // Conservation
    8: '❗', // Key Facts
  };

  const legendButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding: '5px 10px',
    backgroundColor: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    zIndex: 10
  };

  if (!selectedSpeciesName && clues.length === 0) {
    return (
      <div style={containerStyle}>
        <h2>Game Controls / Info</h2>
        <p>Selected location data will appear in the Phaser game board.</p>
        <p>Interact with the Cesium map to choose a location.</p>
        <button 
          style={legendButtonStyle}
          onClick={() => setShowLegend(!showLegend)}
        >
          {showLegend ? 'Hide Legend' : 'Show Legend'}
        </button>
        {showLegend && (
          <GemLegend style={{ marginTop: '20px' }} />
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2>Species Clues</h2>
      <button 
        style={legendButtonStyle}
        onClick={() => setShowLegend(!showLegend)}
      >
        {showLegend ? 'Hide Legend' : 'Show Legend'}
      </button>
      
      {selectedSpeciesName && (
        <p style={{ marginBottom: '15px', fontSize: '14px' }}>
          Match gems to reveal clues about the selected species
        </p>
      )}
      
      {showLegend && (
        <GemLegend style={{ marginBottom: '15px' }} />
      )}
      
      {clues.length === 0 && !isLoadingClue ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          No clues revealed yet. Start matching gems!
        </p>
      ) : (
        <div>
          {clues.map((clue, index) => (
            <div key={index} style={clueItemStyle}>
              <div style={headingStyle}>
                {gemCategoryIcons[clue.category] || ''} {clue.heading}
              </div>
              <div style={clueTextStyle}>{clue.clue}</div>
            </div>
          ))}
          {isLoadingClue && (
            <div style={{ 
              ...clueItemStyle, 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: 'rgba(74, 144, 226, 0.1)',
              borderLeft: '3px solid #4a90e2'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #4a90e2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
              }}></div>
              <span style={{ color: '#4a90e2', fontSize: '14px' }}>
                Processing clue...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};