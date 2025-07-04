import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EventBus } from '../game/EventBus';
import type { CluePayload } from '../game/clueConfig';
import { GemLegendDialog } from './GemLegendDialog';
import { SpeciesHeaderCard } from './SpeciesHeaderCard';
import { DenseClueGrid } from './DenseClueGrid';
import { ClueSheet } from './ClueSheet';

interface SpeciesPanelProps {
  style?: React.CSSProperties;
}

export const SpeciesPanel: React.FC<SpeciesPanelProps> = ({ style }) => {
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState<string>('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number>(0);
  const [totalSpecies, setTotalSpecies] = useState<number>(0);
  const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState<number>(0);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [allCluesRevealed, setAllCluesRevealed] = useState<boolean>(false);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState<boolean>(false);
  const [discoveredClues, setDiscoveredClues] = useState<Array<{
    name: string;
    color: string;
    icon: string;
  }>>([]);

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
    // Listen for clue reveals from the game
    const handleClueRevealed = (clueData: CluePayload) => {
      setClues(prev => {
        // Avoid duplicates
        if (prev.some(c => c.category === clueData.category)) return prev;
        const newClues = [...prev, clueData];
        showClueToast(clueData);
        return newClues;
      });
    };

    // Listen for new game starts
    const handleNewGame = (data: { speciesName: string; speciesId: number; totalSpecies: number; currentIndex: number }) => {
      setClues([]);
      setDiscoveredClues([]);
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
      setDiscoveredClues([]);
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
    const handleAllSpeciesCompleted = () => {
      setAllSpeciesCompleted(true);
      toast.success('Congratulations!', {
        description: `You have discovered all ${totalSpecies} species at this location.`,
        duration: 5000,
      });
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
  }, [totalSpecies]);

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
        speciesName={allSpeciesCompleted ? 'All Species Discovered!' : selectedSpeciesName}
        currentSpeciesIndex={currentSpeciesIndex}
        totalSpecies={totalSpecies}
        revealedClueCount={clues.length}
        discoveredClues={discoveredClues}
        onShowLegend={() => setLegendOpen(true)}
      />

      {/* Compact Field Notes List - Quick Reference */}
      <DenseClueGrid 
        clues={clues} 
        hasSelectedSpecies={hasSelectedSpecies}
      />

      {/* Sheet Button for Detailed View */}
      <div className="flex-shrink-0">
        <ClueSheet 
          clues={clues} 
          speciesName={selectedSpeciesName} 
          hasSelectedSpecies={hasSelectedSpecies}
        />
      </div>

      <GemLegendDialog open={legendOpen} onOpenChange={setLegendOpen} />
    </div>
  );
};