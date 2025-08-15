import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EventBus } from '../game/EventBus';
import type { CluePayload } from '../game/clueConfig';
import { SpeciesHeaderCard } from './SpeciesHeaderCard';
import { DenseClueGrid } from './DenseClueGrid';
import { ClueSheetWrapper } from './ClueSheetWrapper';

interface SpeciesPanelProps {
  style?: React.CSSProperties;
}

export const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ style }) => {
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number>(0);
  const [totalSpecies, setTotalSpecies] = useState<number>(0);
  const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState<number>(0);
  const [allCluesRevealed, setAllCluesRevealed] = useState<boolean>(false);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<boolean>(false);
  const [discoveredClues, setDiscoveredClues] = useState<Array<{
    name: string;
    color: string;
    icon: string;
  }>>([]);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = useState<boolean>(false);
  const [discoveredSpeciesName, setDiscoveredSpeciesName] = useState<string>('');
  const [hiddenSpeciesName, setHiddenSpeciesName] = useState<string>('');
  
  // Use a ref to track if we've already shown the completion toast
  const completionToastShownRef = React.useRef<boolean>(false);
  
  // Use ref to track current species ID to avoid stale closure
  const selectedSpeciesIdRef = React.useRef<number>(0);
  
  // Update ref when selectedSpeciesId changes
  React.useEffect(() => {
    selectedSpeciesIdRef.current = selectedSpeciesId;
  }, [selectedSpeciesId]);

  // Function to show clue toast and add to discovered row
  const showClueToast = (clue: CluePayload) => {
    // Add to discovered clues row (avoid duplicates)
    setDiscoveredClues((prev) => {
      const exists = prev.some((c) => c.name === clue.name);
      if (exists) return prev;
      return [
        ...prev,
        {
          name: clue.name,
          color: clue.color,
          icon: clue.icon,
        },
      ];
    });

    // Show the toast
    toast(clue.name, {
      description: clue.clue,
      icon: clue.icon,
      duration: 5000,
      style: {
        borderLeft: `4px solid ${clue.color}`,
      },
    });
  };

  useEffect(() => {
    console.log('SpeciesPanel: Component mounted, setting up event listeners');
    
    // Listen for clue reveals from the game
    const handleClueRevealed = (clueData: CluePayload) => {
      setClues(prev => {
        // For classification (progressive clues), avoid duplicates by clue text, not category
        // For other categories, avoid duplicates by category
        const isDuplicate = clueData.category === 0 ? // GemCategory.CLASSIFICATION = 0
          prev.some(c => c.category === clueData.category && c.clue === clueData.clue) :
          prev.some(c => c.category === clueData.category);
        
        if (isDuplicate) return prev;
        
        const newClues = [...prev, clueData];
        showClueToast(clueData);
        return newClues;
      });
    };

    // Listen for new game starts
    const handleNewGame = (data: { speciesName: string; speciesId: number; totalSpecies: number; currentIndex: number; hiddenSpeciesName?: string }) => {
      console.log('SpeciesPanel: Received new-game-started event:', data);
      setClues([]);
      setDiscoveredClues([]);
      setSelectedSpeciesName(data.speciesName);
      setSelectedSpeciesId(data.speciesId);
      setTotalSpecies(data.totalSpecies);
      setCurrentSpeciesIndex(data.currentIndex);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(false);
      setIsSpeciesDiscovered(false);
      setDiscoveredSpeciesName('');
      setHiddenSpeciesName(data.hiddenSpeciesName || '');
      
      // Reset completion toast flag when starting a new location (currentIndex = 1)
      if (data.currentIndex === 1) {
        completionToastShownRef.current = false;
      }
    };

    // Listen for game reset
    const handleGameReset = () => {
      setClues([]);
      setDiscoveredClues([]);
      setSelectedSpeciesName('');
      setSelectedSpeciesId(0);
      setTotalSpecies(0);
      setCurrentSpeciesIndex(0);
      setAllCluesRevealed(false);
      setAllSpeciesCompleted(false);
      completionToastShownRef.current = false;
    };

    // Listen for no species found
    const handleNoSpeciesFound = () => {
      setSelectedSpeciesName('No species found at this location');
      setClues([]);
      setDiscoveredClues([]);
    };

    // Listen for all clues revealed
    const handleAllCluesRevealed = () => {
      setAllCluesRevealed(true);
      toast.success('All clues revealed!', {
        description: 'Advancing to next species...',
        duration: 3000,
      });
    };

    // Listen for all species completed
    const handleAllSpeciesCompleted = (data: { totalSpecies: number }) => {
      setAllSpeciesCompleted(true);
      
      // Only show toast if we haven't already shown it
      if (!completionToastShownRef.current) {
        completionToastShownRef.current = true;
        toast.success('Congratulations!', {
          description: `You have discovered all ${data.totalSpecies} species at this location.`,
          duration: 5000,
        });
      }
    };

    // Listen for species guess submission
    const handleSpeciesGuess = (data: { guessedName: string; speciesId: number; isCorrect: boolean; actualName: string }) => {
      console.log('Species guess received:', data, 'Current selectedSpeciesId from ref:', selectedSpeciesIdRef.current);
      
      if (data.isCorrect && data.speciesId === selectedSpeciesIdRef.current) {
        setIsSpeciesDiscovered(true);
        setDiscoveredSpeciesName(data.actualName);
        
        // Show success toast with link
        toast.success('Correct!', {
          description: (
            <div>
              You discovered the {data.actualName}!
              <button
                onClick={() => {
                  // Emit event to show species list and scroll to species
                  EventBus.emit('show-species-list', { speciesId: data.speciesId });
                }}
                style={{
                  display: 'block',
                  marginTop: '8px',
                  color: '#60a5fa',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                View in Species List
              </button>
            </div>
          ),
          duration: 5000,
        });
        
        // Store in localStorage for species list
        try {
          const discovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
          console.log('Current discovered species:', discovered);
          
          if (!discovered.find((s: any) => s.id === data.speciesId)) {
            discovered.push({
              id: data.speciesId,
              name: data.actualName,
              discoveredAt: new Date().toISOString()
            });
            localStorage.setItem('discoveredSpecies', JSON.stringify(discovered));
            console.log('Updated discovered species:', discovered);
            
            // Trigger a custom event for Species List to update
            window.dispatchEvent(new CustomEvent('species-discovered', { 
              detail: { id: data.speciesId, name: data.actualName } 
            }));
          }
        } catch (error) {
          console.error('Error updating discovered species:', error);
        }
      }
    };

    EventBus.on('clue-revealed', handleClueRevealed);
    EventBus.on('species-guess-submitted', handleSpeciesGuess);
    EventBus.on('new-game-started', handleNewGame);
    EventBus.on('game-reset', handleGameReset);
    EventBus.on('no-species-found', handleNoSpeciesFound);
    EventBus.on('all-clues-revealed', handleAllCluesRevealed);
    EventBus.on('all-species-completed', handleAllSpeciesCompleted);

    return () => {
      EventBus.off('clue-revealed', handleClueRevealed);
      EventBus.off('species-guess-submitted', handleSpeciesGuess);
      EventBus.off('new-game-started', handleNewGame);
      EventBus.off('game-reset', handleGameReset);
      EventBus.off('no-species-found', handleNoSpeciesFound);
      EventBus.off('all-clues-revealed', handleAllCluesRevealed);
      EventBus.off('all-species-completed', handleAllSpeciesCompleted);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    ...style,
    height: '100%',
    backgroundColor: '#0f172a',
    padding: '6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const hasSelectedSpecies = selectedSpeciesId > 0 || (!!selectedSpeciesName && selectedSpeciesName !== 'No species found at this location');

  return (
    <div style={containerStyle}>
      {/* Species Header with Horizontal Clue Indicators */}
      <SpeciesHeaderCard
        speciesName={allSpeciesCompleted ? 'All Species Discovered!' : (isSpeciesDiscovered ? discoveredSpeciesName : selectedSpeciesName)}
        speciesId={selectedSpeciesId}
        currentSpeciesIndex={currentSpeciesIndex}
        totalSpecies={totalSpecies}
        revealedClueCount={clues.length}
        discoveredClues={discoveredClues}
      />

      {/* Compact Field Notes List - Quick Reference */}
      <DenseClueGrid 
        clues={clues} 
        hasSelectedSpecies={hasSelectedSpecies}
      />

      {/* Sheet Button for Detailed View */}
      <div className="flex-shrink-0">
        <ClueSheetWrapper 
          clues={clues} 
          speciesName={selectedSpeciesName} 
          hasSelectedSpecies={hasSelectedSpecies}
          speciesId={selectedSpeciesId}
          hiddenSpeciesName={hiddenSpeciesName}
        />
      </div>

    </div>
  );
};