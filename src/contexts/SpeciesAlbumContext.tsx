'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Species } from '@/types/database';

export type AlbumTab = 'album' | 'cases' | 'runs' | 'taxonomy';
export type CardSide = 'front' | 'back';

interface SpeciesAlbumState {
  activeTab: AlbumTab;
  focusedSpecies: Species | null;
  focusedIndex: number;
  cardSide: CardSide;
  focusedRunId: string | null;
  showHeroView: boolean;
}

interface SpeciesAlbumActions {
  setActiveTab: (tab: AlbumTab) => void;
  openCard: (species: Species, index: number) => void;
  closeCard: () => void;
  flipCard: () => void;
  setFocusedRun: (runId: string | null) => void;
  setFocusedIndex: (index: number) => void;
}

type SpeciesAlbumContextValue = SpeciesAlbumState & SpeciesAlbumActions;

const SpeciesAlbumContext = createContext<SpeciesAlbumContextValue | null>(null);

export function SpeciesAlbumProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpeciesAlbumState>({
    activeTab: 'album',
    focusedSpecies: null,
    focusedIndex: 0,
    cardSide: 'front',
    focusedRunId: null,
    showHeroView: false,
  });

  const setActiveTab = useCallback((tab: AlbumTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const openCard = useCallback((species: Species, index: number) => {
    setState(prev => ({
      ...prev,
      focusedSpecies: species,
      focusedIndex: index,
      cardSide: 'front',
      showHeroView: true,
    }));
  }, []);

  const closeCard = useCallback(() => {
    setState(prev => ({ ...prev, focusedSpecies: null, showHeroView: false }));
  }, []);

  const flipCard = useCallback(() => {
    setState(prev => ({ ...prev, cardSide: prev.cardSide === 'front' ? 'back' : 'front' }));
  }, []);

  const setFocusedRun = useCallback((runId: string | null) => {
    setState(prev => ({ ...prev, focusedRunId: runId }));
  }, []);

  const setFocusedIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, focusedIndex: index }));
  }, []);

  return (
    <SpeciesAlbumContext.Provider
      value={{ ...state, setActiveTab, openCard, closeCard, flipCard, setFocusedRun, setFocusedIndex }}
    >
      {children}
    </SpeciesAlbumContext.Provider>
  );
}

export function useSpeciesAlbum() {
  const ctx = useContext(SpeciesAlbumContext);
  if (!ctx) throw new Error('useSpeciesAlbum must be used within SpeciesAlbumProvider');
  return ctx;
}
