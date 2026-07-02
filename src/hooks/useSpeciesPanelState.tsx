import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useGameBridge } from '@/contexts/GameBridgeContext';
import { useExpedition } from '@/contexts/ExpeditionContext';
import type { CluePayload } from '@/game/clueConfig';

interface DiscoveredClue {
  name: string;
  color: string;
  icon: string;
}

const CLUE_TOAST_DURATION_MS = 5000;

export function useSpeciesPanelState(toastsEnabled: boolean) {
  const {
    hud, clues, latestClueBatch, speciesInfo,
    allCluesRevealed, allSpeciesCompleted, guessResult,
  } = useGameBridge();
  const { showSpeciesList } = useExpedition();

  const [discoveredClues, setDiscoveredClues] = useState<DiscoveredClue[]>([]);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = useState(false);
  const [discoveredSpeciesName, setDiscoveredSpeciesName] = useState('');

  const completionToastShownRef = useRef(false);
  const toastsEnabledRef = useRef(toastsEnabled);
  const prevLatestClueBatchRef = useRef<CluePayload[] | null>(null);
  const prevGuessResultRef = useRef(guessResult);
  const prevAllCluesRef = useRef(allCluesRevealed);
  const prevAllSpeciesRef = useRef(allSpeciesCompleted);

  useEffect(() => { toastsEnabledRef.current = toastsEnabled; }, [toastsEnabled]);

  // Toast + discoveredClues tracking for new clue batches.
  useEffect(() => {
    if (latestClueBatch.length === 0 || latestClueBatch === prevLatestClueBatchRef.current) return;
    prevLatestClueBatchRef.current = latestClueBatch;

    setDiscoveredClues(prev => {
      const next = [...prev];
      for (const clue of latestClueBatch) {
        if (!next.some(c => c.name === clue.name)) {
          next.push({ name: clue.name, color: clue.color, icon: clue.icon });
        }
      }
      return next;
    });

    if (toastsEnabledRef.current) {
      const firstClue = latestClueBatch[0];
      const id = toast(latestClueBatch.length === 1 ? firstClue.name : `${latestClueBatch.length} clues revealed`, {
        description: latestClueBatch.length === 1
          ? firstClue.clue
          : latestClueBatch.map(clue => clue.name).join(', '),
        icon: firstClue.icon,
        duration: CLUE_TOAST_DURATION_MS,
        style: { borderLeft: `4px solid ${firstClue.color}` },
      });
      window.setTimeout(() => { try { toast.dismiss(id); } catch { /* ok */ } }, CLUE_TOAST_DURATION_MS + 100);
    }
  }, [latestClueBatch]);

  // Reset on new game (speciesInfo change with index === 1)
  useEffect(() => {
    if (!speciesInfo) {
      // game-reset path
      setDiscoveredClues([]);
      setIsSpeciesDiscovered(false);
      setDiscoveredSpeciesName('');
      completionToastShownRef.current = false;
      return;
    }
    // new-game-started path
    setDiscoveredClues([]);
    setIsSpeciesDiscovered(false);
    setDiscoveredSpeciesName('');
    if (speciesInfo.index === 1) completionToastShownRef.current = false;
  }, [speciesInfo?.id, speciesInfo?.index]);

  // Handle species guess result
  useEffect(() => {
    if (!guessResult || guessResult === prevGuessResultRef.current) return;
    prevGuessResultRef.current = guessResult;

    if (guessResult.isCorrect && guessResult.speciesId === (speciesInfo?.id ?? 0)) {
      setIsSpeciesDiscovered(true);
      setDiscoveredSpeciesName(guessResult.actualName);

      toast.success('Correct!', {
        description: (
          <div>
            You discovered the {guessResult.actualName}!
            <button
              onClick={() => showSpeciesList(guessResult.speciesId)}
              className="block mt-2 text-blue-400 underline bg-transparent border-none p-0 cursor-pointer text-sm"
            >
              View in Species List
            </button>
          </div>
        ),
        duration: 5000,
      });

      try {
        const discovered = JSON.parse(localStorage.getItem('discoveredSpecies') || '[]');
        if (!discovered.find((s: any) => s.id === guessResult.speciesId)) {
          discovered.push({ id: guessResult.speciesId, idSource: 'species.id', name: guessResult.actualName, discoveredAt: new Date().toISOString() });
          localStorage.setItem('discoveredSpecies', JSON.stringify(discovered));
          window.dispatchEvent(new CustomEvent('species-discovered', { detail: { id: guessResult.speciesId, name: guessResult.actualName } }));
        }
      } catch (error) {
        console.error('Error updating discovered species:', error);
      }
    }
  }, [guessResult, speciesInfo?.id, showSpeciesList]);

  // All clues revealed toast
  useEffect(() => {
    if (allCluesRevealed && !prevAllCluesRef.current) {
      toast.success('All clues revealed!', { description: "Make your guess when you're ready.", duration: 3000 });
    }
    prevAllCluesRef.current = allCluesRevealed;
  }, [allCluesRevealed]);

  // All species completed toast
  useEffect(() => {
    if (allSpeciesCompleted && !prevAllSpeciesRef.current) {
      if (!completionToastShownRef.current) {
        completionToastShownRef.current = true;
        toast.success('Congratulations!', {
          description: `You have discovered all ${allSpeciesCompleted.totalSpecies} species at this location.`,
          duration: 5000,
        });
      }
    }
    prevAllSpeciesRef.current = allSpeciesCompleted;
  }, [allSpeciesCompleted]);

  const selectedSpeciesName = speciesInfo?.name ?? '';
  const selectedSpeciesId = speciesInfo?.id ?? 0;
  const hasSelectedSpecies = selectedSpeciesId > 0 || (!!selectedSpeciesName && selectedSpeciesName !== 'No species found at this location');

  return {
    clues,
    selectedSpeciesName,
    selectedSpeciesId,
    totalSpecies: speciesInfo?.total ?? 0,
    currentSpeciesIndex: speciesInfo?.index ?? 0,
    allSpeciesCompleted: !!allSpeciesCompleted,
    discoveredClues,
    isSpeciesDiscovered,
    discoveredSpeciesName,
    hiddenSpeciesName: speciesInfo?.hiddenName ?? '',
    hud,
    hasSelectedSpecies,
  };
}
