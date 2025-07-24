import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CluePayload } from '../game/clueConfig';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { EventBus } from '@/game/EventBus';

interface ClueSheetWrapperProps {
  clues: CluePayload[];
  speciesName: string;
  hasSelectedSpecies: boolean;
  speciesId?: number;
  hiddenSpeciesName?: string;
}

export const ClueSheetWrapper: React.FC<ClueSheetWrapperProps> = ({ clues, speciesName, hasSelectedSpecies, speciesId, hiddenSpeciesName }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = React.useState(false);
  const [discoveredName, setDiscoveredName] = React.useState('');

  // Listen for species guess results
  React.useEffect(() => {
    const handleGuessResult = (data: any) => {
      if (data.isCorrect && data.speciesId === speciesId) {
        setIsSpeciesDiscovered(true);
        setDiscoveredName(data.actualName);
      }
    };

    EventBus.on('species-guess-submitted', handleGuessResult);
    return () => {
      EventBus.off('species-guess-submitted', handleGuessResult);
    };
  }, [speciesId]);

  // Reset when new game starts
  React.useEffect(() => {
    if (speciesId > 0) {
      setIsSpeciesDiscovered(false);
      setDiscoveredName('');
    }
  }, [speciesId]);

  // Listen for new game events to reset state
  React.useEffect(() => {
    const handleNewGame = () => {
      setIsSpeciesDiscovered(false);
      setDiscoveredName('');
    };

    EventBus.on('new-game-started', handleNewGame);
    return () => {
      EventBus.off('new-game-started', handleNewGame);
    };
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full bg-slate-700 hover:bg-slate-600 border-slate-600"
        disabled={!hasSelectedSpecies}
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Guess Species ({clues.length} clues)
      </Button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          <div 
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              zIndex: 99999
            }}
            onClick={() => setIsOpen(false)}
          />
          <div 
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '32rem',
              backgroundColor: '#0f172a',
              borderLeft: '1px solid #334155',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #334155' }}>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#67e8f9', marginBottom: '8px' }}>
                Species Detective 🔍
              </h2>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                {isSpeciesDiscovered ? `✅ ${discoveredName}` : (speciesName || 'No species selected')}
              </p>
            </div>
            
            {/* Species Guess Selector */}
            {speciesName === 'Mystery Species' && speciesId && !isSpeciesDiscovered && (
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #334155' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#67e8f9', marginBottom: '12px' }}>
                  Guess the Species
                </h3>
                <SpeciesGuessSelector 
                  key={`guess-${speciesId}`}
                  speciesId={speciesId}
                  disabled={false}
                  hiddenSpeciesName={hiddenSpeciesName}
                />
              </div>
            )}
            
            <ScrollArea className="flex-1" style={{ padding: '24px' }}>
              {clues.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No clues discovered yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {clues.map((clue, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        padding: '16px',
                        borderLeft: `4px solid ${clue.color}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{clue.icon}</span>
                        <h3 style={{ fontWeight: '600', color: '#67e8f9' }}>{clue.name}</h3>
                      </div>
                      <p style={{ fontSize: '14px', color: '#cbd5e1' }}>{clue.clue}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>,
        document.body
      )}
    </>
  );
};