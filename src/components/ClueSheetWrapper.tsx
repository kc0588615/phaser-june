import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CluePayload } from '../game/clueConfig';

interface ClueSheetWrapperProps {
  clues: CluePayload[];
  speciesName: string;
  hasSelectedSpecies: boolean;
}

export const ClueSheetWrapper: React.FC<ClueSheetWrapperProps> = ({ clues, speciesName, hasSelectedSpecies }) => {
  const [isOpen, setIsOpen] = React.useState(false);

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
        Field Notes ({clues.length})
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
                Field Notes
              </h2>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                {speciesName || 'No species selected'}
              </p>
            </div>
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