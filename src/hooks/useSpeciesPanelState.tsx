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
    hud, clues, latestClue, speciesInfo,
    allCluesRevealed, allSpeciesCompleted, guessResult,
  } = useGameBridge();
  const { showSpeciesList } = useExpedition();

  const [discoveredClues, setDiscoveredClues] = useState<DiscoveredClue[]>([]);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = useState(false);
  const [discoveredSpeciesName, setDiscoveredSpeciesName] = useState('');

  const completionToastShownRef = useRef(false);
  const toastsEnabledRef = useRef(toastsEnabled);
  const prevLatestClueRef = useRef<CluePayload | null>(null);
  const prevGuessResultRef = useRef(guessResult);
  const prevAllCluesRef = useRef(allCluesRevealed);
  const prevAllSpeciesRef = useRef(allSpeciesCompleted);

  useEffect(() => { toastsEnabledRef.current = toastsEnabled; }, [toastsEnabled]);

  // Toast + discoveredClues tracking for new clues
  useEffect(() => {
    if (!latestClue || latestClue === prevLatestClueRef.current) return;
    prevLatestClueRef.current = latestClue;

    setDiscoveredClues(prev => {
      if (prev.some(c => c.name === latestClue.name)) return prev;
      return [...prev, { name: latestClue.name, color: latestClue.color, icon: latestClue.icon }];
    });

    if (toastsEnabledRef.current) {
      const id = toast(latestClue.name, {
        description: latestClue.clue,
        icon: latestClue.icon,
        duration: CLUE_TOAST_DURATION_MS,
        style: { borderLeft: `4px solid ${latestClue.color}` },
      });
      window.setTimeout(() => { try { toast.dismiss(id); } catch { /* ok */ } }, CLUE_TOAST_DURATION_MS + 100);
    }
  }, [latestClue]);

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
          discovered.push({ id: guessResult.speciesId, name: guessResult.actualName, discoveredAt: new Date().toISOString() });
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
