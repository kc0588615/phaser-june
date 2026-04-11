import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { EventBus, EVT_GAME_HUD_UPDATED, type GameHudUpdatedEvent } from '@/game/EventBus';
import type { CluePayload } from '@/game/clueConfig';

interface DiscoveredClue {
  name: string;
  color: string;
  icon: string;
}

const CLUE_TOAST_DURATION_MS = 5000;

export function useSpeciesPanelState(toastsEnabled: boolean) {
  const [clues, setClues] = useState<CluePayload[]>([]);
  const [selectedSpeciesName, setSelectedSpeciesName] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(0);
  const [totalSpecies, setTotalSpecies] = useState(0);
  const [currentSpeciesIndex, setCurrentSpeciesIndex] = useState(0);
  const [allSpeciesCompleted, setAllSpeciesCompleted] = useState(false);
  const [discoveredClues, setDiscoveredClues] = useState<DiscoveredClue[]>([]);
  const [isSpeciesDiscovered, setIsSpeciesDiscovered] = useState(false);
  const [discoveredSpeciesName, setDiscoveredSpeciesName] = useState('');
  const [hiddenSpeciesName, setHiddenSpeciesName] = useState('');
  const [hud, setHud] = useState<GameHudUpdatedEvent>({
    score: 0, movesRemaining: 0, movesUsed: 0, maxMoves: 0, streak: 0, multiplier: 1.0, moveMultiplier: 1.0,
  });

  const completionToastShownRef = useRef(false);
  const selectedSpeciesIdRef = useRef(0);
  const toastsEnabledRef = useRef(toastsEnabled);

  useEffect(() => { selectedSpeciesIdRef.current = selectedSpeciesId; }, [selectedSpeciesId]);
  useEffect(() => { toastsEnabledRef.current = toastsEnabled; }, [toastsEnabled]);

  useEffect(() => {
    const showClueToast = (clue: CluePayload) => {
      setDiscoveredClues((prev) => {
        if (prev.some((c) => c.name === clue.name)) return prev;
        return [...prev, { name: clue.name, color: clue.color, icon: clue.icon }];
      });

      if (toastsEnabledRef.current) {
        const id = toast(clue.name, {
          description: clue.clue,
          icon: clue.icon,
          duration: CLUE_TOAST_DURATION_MS,
          style: { borderLeft: `4px solid ${clue.color}` },
        });
        window.setTimeout(() => { try { toast.dismiss(id); } catch { /* ok */ } }, CLUE_TOAST_DURATION_MS + 100);
      }
    };

    const handleClueRevealed = (clueData: CluePayload) => {
      setClues(prev => {
        const progressiveCategories = [0, 1, 2, 3, 5, 6, 7, 8];
        const isDuplicate = progressiveCategories.includes(clueData.category)
          ? prev.some(c => c.category === clueData.category && c.clue === clueData.clue)
          : prev.some(c => c.category === clueData.category);
        if (isDuplicate) return prev;
        showClueToast(clueData);
        return [clueData, ...prev];
      });
    };

    const handleNewGame = (data: { speciesName: string; speciesId: number; totalSpecies: number; currentIndex: number; hiddenSpeciesName?: string }) => {
      setClues([]);
      setDiscoveredClues([]);
      setSelectedSpeciesName(data.speciesName);
      setSelectedSpeciesId(data.speciesId);
      setTotalSpecies(data.totalSpecies);
      setCurrentSpeciesIndex(data.currentIndex);
      setAllSpeciesCompleted(false);
      setIsSpeciesDiscovered(false);
      setDiscoveredSpeciesName('');
      setHiddenSpeciesName(data.hiddenSpeciesName || '');
      if (data.currentIndex === 1) completionToastShownRef.current = false;
    };

    const handleGameReset = () => {
      setClues([]);
      setDiscoveredClues([]);
      setSelectedSpeciesName('');
      setSelectedSpeciesId(0);
      setTotalSpecies(0);
      setCurrentSpeciesIndex(0);
      setAllSpeciesCompleted(false);
      completionToastShownRef.current = false;
    };

    const handleNoSpeciesFound = () => {
      setSelectedSpeciesName('No species found at this location');
      setClues([]);
      setDiscoveredClues([]);
    };

    const handleAllCluesRevealed = () => {
      toast.success('All clues revealed!', { description: "Make your guess when you're ready.", duration: 3000 });
    };

    const handleAllSpeciesCompleted = (data: { totalSpecies: number }) => {
      setAllSpeciesCompleted(true);
      if (!completionToastShownRef.current) {
        completionToastShownRef.current = true;
        toast.success('Congratulations!', {
          description: `You have discovered all ${data.totalSpecies} species at this location.`,
          duration: 5000,
        });
      }
    };

    const handleSpeciesGuess = (data: { guessedName: string; speciesId: number; isCorrect: boolean; actualName: string }) => {
      if (data.isCorrect && data.speciesId === selectedSpeciesIdRef.current) {
        setIsSpeciesDiscovered(true);
        setDiscoveredSpeciesName(data.actualName);

        toast.success('Correct!', {
          description: (
            <div>
              You discovered the {data.actualName}!
              <button
                onClick={() => EventBus.emit('show-species-list', { speciesId: data.speciesId })}
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
          if (!discovered.find((s: any) => s.id === data.speciesId)) {
            discovered.push({ id: data.speciesId, name: data.actualName, discoveredAt: new Date().toISOString() });
            localStorage.setItem('discoveredSpecies', JSON.stringify(discovered));
            window.dispatchEvent(new CustomEvent('species-discovered', { detail: { id: data.speciesId, name: data.actualName } }));
          }
        } catch (error) {
          console.error('Error updating discovered species:', error);
        }
      }
    };

    const handleHudUpdate = (data: GameHudUpdatedEvent) => { setHud(data); };

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

  const hasSelectedSpecies = selectedSpeciesId > 0 || (!!selectedSpeciesName && selectedSpeciesName !== 'No species found at this location');

  return {
    clues,
    selectedSpeciesName,
    selectedSpeciesId,
    totalSpecies,
    currentSpeciesIndex,
    allSpeciesCompleted,
    discoveredClues,
    isSpeciesDiscovered,
    discoveredSpeciesName,
    hiddenSpeciesName,
    hud,
    hasSelectedSpecies,
  };
}
