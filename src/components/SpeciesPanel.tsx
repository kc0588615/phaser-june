import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EventBus, EVT_GAME_HUD_UPDATED, EVT_GAME_RESTART, type GameHudUpdatedEvent } from '../game/EventBus';
import type { CluePayload } from '../game/clueConfig';
import { SpeciesHeaderCard } from './SpeciesHeaderCard';
import { DenseClueGrid } from './DenseClueGrid';
import { ClueSheetWrapper } from './ClueSheetWrapper';

interface SpeciesPanelProps {
  style?: React.CSSProperties;
  toastsEnabled?: boolean;
}

export const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ style, toastsEnabled = true }) => {
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
  const [hud, setHud] = useState<GameHudUpdatedEvent>({
    score: 0,
    movesRemaining: 0,
    movesUsed: 0,
    maxMoves: 0,
    streak: 0,
    multiplier: 1.0,
    moveMultiplier: 1.0,
  });
  
  // Use a ref to track if we've already shown the completion toast
  const completionToastShownRef = React.useRef<boolean>(false);
  
  // Use ref to track current species ID to avoid stale closure
  const selectedSpeciesIdRef = React.useRef<number>(0);
  // Use ref to track current toastsEnabled value to avoid stale closure
  const toastsEnabledRef = React.useRef<boolean>(toastsEnabled);
  
  // Update ref when selectedSpeciesId changes
  React.useEffect(() => {
    selectedSpeciesIdRef.current = selectedSpeciesId;
  }, [selectedSpeciesId]);
  
  // Update ref when toastsEnabled changes
  React.useEffect(() => {
    toastsEnabledRef.current = toastsEnabled;
  }, [toastsEnabled]);

  const CLUE_TOAST_DURATION_MS = 5000;

  // Function to show clue toast and add to discovered row
  const showClueToast = (clue: CluePayload) => {
    const currentToastsEnabled = toastsEnabledRef.current;
    
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

    // Show the toast only if toastsEnabled (Map view visible)
    if (currentToastsEnabled) {
      const id = toast(clue.name, {
        description: clue.clue,
        icon: clue.icon,
        duration: CLUE_TOAST_DURATION_MS,
        style: {
          borderLeft: `4px solid ${clue.color}`,
        },
      });

      // Guarantee it disappears even if clicked/touched (overrides any pause behavior)
      window.setTimeout(() => {
        try {
          toast.dismiss(id);
        } catch {
          // already dismissed
        }
      }, CLUE_TOAST_DURATION_MS + 100); // small buffer to avoid racing the auto-close
    }
  };

  useEffect(() => {
    console.log('SpeciesPanel: Component mounted, setting up event listeners');
    
    // Listen for clue reveals from the game
    const handleClueRevealed = (clueData: CluePayload) => {
      setClues(prev => {
        // For progressive categories, avoid duplicates by clue text, not category
        // For other categories, avoid duplicates by category
        const progressiveCategories = [0, 2, 3, 5, 6, 7, 8]; // CLASSIFICATION, GEOGRAPHIC, MORPHOLOGY, BEHAVIOR, LIFE_CYCLE, CONSERVATION, KEY_FACTS
        const isDuplicate = progressiveCategories.includes(clueData.category) ?
          prev.some(c => c.category === clueData.category && c.clue === clueData.clue) :
          prev.some(c => c.category === clueData.category);
        
        if (isDuplicate) return prev;
        
        const newClues = [clueData, ...prev];
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

    const handleHudUpdate = (data: GameHudUpdatedEvent) => {
      setHud(data);
    };

    EventBus.on('clue-revealed', handleClueRevealed);
    EventBus.on('species-guess-submitted', handleSpeciesGuess);
    EventBus.on('new-game-started', handleNewGame);
    EventBus.on('game-reset', handleGameReset);
    EventBus.on('no-species-found', handleNoSpeciesFound);
    EventBus.on('all-clues-revealed', handleAllCluesRevealed);
    EventBus.on('all-species-completed', handleAllSpeciesCompleted);
    EventBus.on(EVT_GAME_HUD_UPDATED, handleHudUpdate);

    return () => {
      EventBus.off('clue-revealed', handleClueRevealed);
      EventBus.off('species-guess-submitted', handleSpeciesGuess);
      EventBus.off('new-game-started', handleNewGame);
      EventBus.off('game-reset', handleGameReset);
      EventBus.off('no-species-found', handleNoSpeciesFound);
      EventBus.off('all-clues-revealed', handleAllCluesRevealed);
      EventBus.off('all-species-completed', handleAllSpeciesCompleted);
      EventBus.off(EVT_GAME_HUD_UPDATED, handleHudUpdate);
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#0f172a',
    padding: '6px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    ...style,
  };

  const hasSelectedSpecies = selectedSpeciesId > 0 || (!!selectedSpeciesName && selectedSpeciesName !== 'No species found at this location');

  const onRestart = () => EventBus.emit(EVT_GAME_RESTART, {});

  return (
    <div style={containerStyle}>
      {/* Game HUD */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#e2e8f0',
        fontWeight: 500,
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>Moves: {hud.movesUsed}/{hud.maxMoves || '—'}</span>
          <span>Score: {hud.score}</span>
          <span>Streak: x{hud.multiplier.toFixed(2)}</span>
          {hud.moveMultiplier && hud.moveMultiplier > 1.01 && (
            <span>Move Bonus: x{hud.moveMultiplier.toFixed(2)}</span>
          )}
        </div>
        {hud.maxMoves > 0 && hud.movesUsed >= hud.maxMoves && (
          <button
            onClick={onRestart}
            style={{
              padding: '4px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Restart
          </button>
        )}
      </div>

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
