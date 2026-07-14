import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeductionProfile } from '@/lib/deductionEngine';

interface SpeciesGuessSelectorProps {
  candidates: DeductionProfile[];
  disabled?: boolean;
  onGuess: (speciesId: number) => Promise<boolean | null>;
}

export const SpeciesGuessSelector: React.FC<SpeciesGuessSelectorProps> = ({ candidates, disabled = false, onGuess }) => {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [guessedIds, setGuessedIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [correct, setCorrect] = useState(false);
  const selected = useMemo(() => candidates.find(candidate => candidate.speciesId === selectedId), [candidates, selectedId]);

  const submit = async () => {
    if (selectedId === null || submitting || correct) return;
    setSubmitting(true);
    try {
      const isCorrect = await onGuess(selectedId);
      if (isCorrect === null) return;
      setGuessedIds(previous => new Set(previous).add(selectedId));
      setCorrect(isCorrect);
      if (!isCorrect) setSelectedId(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen(value => !value)}
            disabled={disabled || submitting || correct}
            className="flex w-full items-center justify-between rounded-md border border-ds-subtle bg-black/20 px-3 py-2 text-left text-sm text-ds-text-primary disabled:opacity-50"
          >
            <span>{correct ? 'Identification confirmed' : selected?.commonName ?? 'Select a candidate'}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>
          {open && (
            <div role="listbox" aria-label="Case candidates" className="absolute bottom-full z-guess-dropdown mb-1 max-h-56 w-full overflow-y-auto rounded-md border border-ds-subtle bg-ds-bg shadow-xl">
              {candidates.map(candidate => {
                const guessed = guessedIds.has(candidate.speciesId);
                return (
                  <button
                    key={candidate.speciesId}
                    type="button"
                    role="option"
                    aria-selected={selectedId === candidate.speciesId}
                    disabled={guessed}
                    onClick={() => { setSelectedId(candidate.speciesId); setOpen(false); }}
                    className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 disabled:opacity-40', selectedId === candidate.speciesId && 'bg-white/10')}
                  >
                    {selectedId === candidate.speciesId ? <Check className="h-3.5 w-3.5 text-ds-cyan" /> : <span className="w-3.5" />}
                    <span><span className={guessed ? 'line-through' : ''}>{candidate.commonName}</span> <i className="text-ds-text-muted">{candidate.scientificName}</i></span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Button type="button" onClick={submit} disabled={selectedId === null || disabled || submitting || correct}>
          {submitting ? 'Checking…' : 'Submit guess'}
        </Button>
      </div>
      {guessedIds.size > 0 && !correct && <p role="status" className="text-xs text-ds-amber">Not a match. Compare the field evidence and try again.</p>}
    </div>
  );
};
