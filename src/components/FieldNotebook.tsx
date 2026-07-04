import React, { useEffect, useMemo, useState } from 'react';
import type { RunState } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SpeciesGuessSelector } from '@/components/SpeciesGuessSelector';

interface Props {
  runState: RunState;
  speciesId: number;
  hiddenSpeciesName: string;
  onGuess: (isCorrect: boolean, guessedName: string) => void;
}

type CatalogSpecies = {
  id: number;
  common_name?: string | null;
  scientific_name?: string | null;
};

export function FieldNotebook({ runState, speciesId, hiddenSpeciesName, onGuess }: Props) {
  const comp = runState.comparativeDeduction;
  const processed = comp?.processedClues ?? [];
  const [catalogNames, setCatalogNames] = useState<string[]>([]);
  const [lastWrongGuess, setLastWrongGuess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/species/catalog')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled || !Array.isArray(data?.species)) return;
        const names: string[] = data.species
          .filter((species: CatalogSpecies) => species.id !== speciesId)
          .map((species: CatalogSpecies) => species.common_name || species.scientific_name)
          .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0 && name !== hiddenSpeciesName);
        setCatalogNames(Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)));
      })
      .catch(error => console.error('Failed to load species catalog for notebook:', error));
    return () => { cancelled = true; };
  }, [hiddenSpeciesName, speciesId]);

  const candidateNames = useMemo(() => {
    if (catalogNames.length > 0) return catalogNames;
    return comp?.albumProfiles
      .filter(profile => profile.speciesId !== speciesId)
      .map(profile => profile.commonName)
      ?? [];
  }, [catalogNames, comp?.albumProfiles, speciesId]);

  const latestClues = processed.slice(-5).reverse();

  return (
    <div className="absolute left-0 right-0 bottom-0 z-panel pointer-events-none">
      <GlassPanel className="pointer-events-auto rounded-t-lg rounded-b-none border-x-0 border-b-0 p-ds-md max-h-[46vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-ds-sm mb-ds-sm">
          <div>
            <div className="text-ds-caption font-bold uppercase tracking-wider text-ds-cyan">Field notebook</div>
            <div className="text-ds-badge text-ds-text-muted">Use clues, then identify the mystery species.</div>
          </div>
          <div className="text-ds-badge text-ds-text-secondary">{processed.length} clues</div>
        </div>

        <div className="grid gap-ds-sm lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {latestClues.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {latestClues.map(clue => (
                  <div key={clue.clueId} className="rounded-md bg-ds-surface-elevated border border-ds-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-ds-text-muted">{clue.category.replace(/_/g, ' ')}</div>
                    <div className="text-ds-caption text-ds-text-primary leading-snug">{clue.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-ds-surface-elevated border border-ds-subtle px-2.5 py-2 text-ds-caption text-ds-text-secondary">
                Match category gems to reveal field facts here.
              </div>
            )}
          </div>

          <div className="min-w-0">
            <SpeciesGuessSelector
              speciesId={speciesId}
              hiddenSpeciesName={hiddenSpeciesName}
              candidateNames={candidateNames}
              onGuessSubmitted={(isCorrect, guessedName) => {
                setLastWrongGuess(isCorrect ? null : guessedName);
                onGuess(isCorrect, guessedName);
              }}
            />
            {lastWrongGuess && (
              <div className="mt-2 text-ds-caption text-ds-amber">
                {lastWrongGuess} ruled out. Compare its group, habitat, and traits against the revealed facts.
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
