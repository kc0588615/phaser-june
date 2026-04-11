import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { createPortal } from 'react-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CluePayload } from '../game/clueConfig';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { useGameBridge } from '@/contexts/GameBridgeContext';

interface ClueSheetWrapperProps {
  clues: CluePayload[];
  speciesName: string;
  hasSelectedSpecies: boolean;
  speciesId?: number;
  hiddenSpeciesName?: string;
}

export const ClueSheetWrapper: React.FC<ClueSheetWrapperProps> = ({ clues, speciesName, hasSelectedSpecies, speciesId, hiddenSpeciesName }) => {
  const { guessResult, speciesInfo } = useGameBridge();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = React.useState(false);
  const [discoveredName, setDiscoveredName] = React.useState('');

  // React to guess results from context
  React.useEffect(() => {
    if (guessResult?.isCorrect && guessResult.speciesId === speciesId) {
      setIsSpeciesDiscovered(true);
      setDiscoveredName(guessResult.actualName);
    }
  }, [guessResult, speciesId]);

  // Reset on new species
  React.useEffect(() => {
    if (speciesId && speciesId > 0) { setIsSpeciesDiscovered(false); setDiscoveredName(''); }
  }, [speciesId]);

  // Reset on new game (detected via speciesInfo change)
  const prevSpeciesInfoRef = useRef(speciesInfo);
  React.useEffect(() => {
    if (speciesInfo && speciesInfo !== prevSpeciesInfoRef.current) {
      setIsSpeciesDiscovered(false);
      setDiscoveredName('');
    }
    prevSpeciesInfoRef.current = speciesInfo;
  }, [speciesInfo]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeSheet = useCallback(() => setIsOpen(false), []);

  /* Escape key + focus trap */
  useEffect(() => {
    if (!isOpen) return;
    const el = sheetRef.current;
    if (el) {
      const first = el.querySelector<HTMLElement>('button, input, [tabindex]');
      first?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeSheet(); return; }
      if (e.key !== 'Tab' || !el) return;
      const focusable = el.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeSheet]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full glass-bg hover:bg-ds-surface-elevated border-ds-subtle"
        disabled={!hasSelectedSpecies}
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-4 w-4 mr-2" />
        Guess Species ({clues.length} clues)
      </Button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 bg-black/80 z-sheet-backdrop" onClick={closeSheet} aria-hidden="true" />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Species detective clue sheet" className="fixed inset-y-0 right-0 w-full max-w-lg glass-bg border-l border-ds-subtle z-sheet flex flex-col">
            <div className="p-ds-xl border-b border-ds-subtle">
              <button
                onClick={closeSheet}
                aria-label="Close clue sheet"
                className="absolute right-ds-lg top-ds-lg p-ds-sm bg-transparent border-none text-ds-text-secondary cursor-pointer"
              >
                ✕
              </button>
              <h2 className="text-ds-heading-lg font-semibold text-ds-cyan mb-ds-sm">
                Species Detective 🔍
              </h2>
              <p className="text-ds-body text-ds-text-secondary">
                {isSpeciesDiscovered ? `✅ ${discoveredName}` : (speciesName || 'No species selected')}
              </p>
            </div>

            {speciesName === 'Mystery Species' && speciesId && !isSpeciesDiscovered && (
              <div className="px-ds-xl py-ds-lg border-b border-ds-subtle">
                <h3 className="text-ds-heading-sm font-semibold text-ds-cyan mb-ds-md">Guess the Species</h3>
                <SpeciesGuessSelector key={`guess-${speciesId}`} speciesId={speciesId} disabled={false} hiddenSpeciesName={hiddenSpeciesName} />
              </div>
            )}

            <ScrollArea className="flex-1 px-ds-xl py-ds-xl">
              {clues.length === 0 ? (
                <p className="text-ds-text-secondary italic">No clues discovered yet.</p>
              ) : (
                <div className="flex flex-col gap-ds-md">
                  {clues.map((clue) => (
                    <div
                      key={`clue-${clue.name}-${clue.clue.slice(0, 20)}`}
                      className="bg-ds-surface-elevated rounded-lg p-ds-lg"
                      style={{ borderLeft: `4px solid ${clue.color}` }}
                    >
                      <div className="flex items-center gap-ds-sm mb-ds-sm">
                        <span className="text-xl">{clue.icon}</span>
                        <h3 className="font-semibold text-ds-cyan">{clue.name}</h3>
                      </div>
                      <p className="text-ds-body text-ds-text-primary">{clue.clue}</p>
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
