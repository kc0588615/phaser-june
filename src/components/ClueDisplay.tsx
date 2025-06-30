import React, { useState, useEffect } from 'react';
import { EventBus } from '../game/EventBus';
import type { CluePayload } from '../game/clueConfig';
import { GemLegend } from './GemLegend';

interface ClueDisplayProps {
  style?: React.CSSProperties;
}

export const ClueDisplay: React.FC<ClueDisplayProps> = ({ style }) => {
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number>(0);
  const [totalSpecies, setTotalSpecies] = useState<number>(0);
  const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState<number>(0);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [isLoadingClue, setIsLoadingClue] = useState<boolean>(false);
  const [allCluesRevealed, setAllCluesRevealed] = useState<boolean>(false);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<boolean>(false);

  useEffect(() => {
    // Listen for clue reveals from the game
    const handleClueRevealed = (clueData: CluePayload) => {
      setIsLoadingClue(true);
      // Simulate a brief loading state for clue processing
      setTimeout(() => {
        setClues(prev => [...prev, clueData]);
        setIsLoadingClue(false);
      }, 500);
    };

    // Listen for new game starts
    const handleNewGame = (data: { speciesName: string; speciesId: number; totalSpecies: number; currentIndex: number }) => {
      setClues([]);
      setSelectedSpeciesName(data.speciesName);
      setSelectedSpeciesId(data.speciesId);
      setTotalSpecies(data.totalSpecies);
      setCurrentSpeciesIndex(data.currentIndex);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(false);
    };

    // Listen for game reset
    const handleGameReset = () => {
      setClues([]);
      setSelectedSpeciesName('');
      setSelectedSpeciesId(0);
      setTotalSpecies(0);
      setCurrentSpeciesIndex(0);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(false);
    };

    // Listen for no species found
    const handleNoSpeciesFound = () => {
      setSelectedSpeciesName('No species found at this location');
      setClues([]);
    };

    // Listen for all clues revealed
    const handleAllCluesRevealed = () => {
      setAllCluesRevealed(true);
    };

    // Listen for all species completed
    const handleAllSpeciesCompleted = () => {
      setAllSpeciesCompleted(true);
    };

    EventBus.on('clue-revealed', handleClueRevealed);
    EventBus.on('new-game-started', handleNewGame);
    EventBus.on('game-reset', handleGameReset);
    EventBus.on('no-species-found', handleNoSpeciesFound);
    EventBus.on('all-clues-revealed', handleAllCluesRevealed);
    EventBus.on('all-species-completed', handleAllSpeciesCompleted);

    return () => {
      EventBus.off('clue-revealed', handleClueRevealed);
      EventBus.off('new-game-started', handleNewGame);
      EventBus.off('game-reset', handleGameReset);
      EventBus.off('no-species-found', handleNoSpeciesFound);
      EventBus.off('all-clues-revealed', handleAllCluesRevealed);
      EventBus.off('all-species-completed', handleAllSpeciesCompleted);
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
        <h2>Species Discovery</h2>
        <p>Click on the Cesium map to select a location and discover species.</p>
        <p>Match gems to reveal clues about each species.</p>
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
      <button 
        style={legendButtonStyle}
        onClick={() => setShowLegend(!showLegend)}
      >
        {showLegend ? 'Hide Legend' : 'Show Legend'}
      </button>
      
      {allSpeciesCompleted ? (
        <>
          <h2 style={{ color: '#00ff00' }}>All Species Discovered!</h2>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            Congratulations! You have discovered all {totalSpecies} species at this location.
          </p>
        </>
      ) : (
        <>
          <h2 style={{ color: '#00ff00' }}>
            Current Species: {selectedSpeciesName}
          </h2>
          {selectedSpeciesId > 0 && (
            <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>
              ID: {selectedSpeciesId} | Species {currentSpeciesIndex} of {totalSpecies}
            </p>
          )}
          {allCluesRevealed && (
            <p style={{ fontSize: '14px', color: '#ffff00', marginBottom: '10px', fontStyle: 'italic' }}>
              All clues revealed! Advancing to next species...
            </p>
          )}
        </>
      )}
      
      {showLegend && (
        <GemLegend style={{ marginBottom: '15px' }} />
      )}
      
      {!allSpeciesCompleted && (
        <>
          {clues.length === 0 && !isLoadingClue ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>
              Match gems to reveal clues about this species...
            </p>
          ) : (
            <div>
              {clues.map((clue, index) => (
                <div key={index} style={{
                  ...clueItemStyle,
                  borderLeft: `3px solid ${clue.color}`
                }}>
                  <div style={headingStyle}>
                    {clue.icon} {clue.name}
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
        </>
      )}
    </div>
  );
};