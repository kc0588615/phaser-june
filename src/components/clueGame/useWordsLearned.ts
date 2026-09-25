// Glossary words the player has opened, shared by every GlossaryText and the
// journal. A small store over localStorage; storage can be unavailable.
import { useSyncExternalStore } from 'react';
import { WORDS_STORAGE_KEY, parseWords } from '@/clueGame/journal';

const NONE: string[] = [];
let words: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (words) return words;
  try {
    words = parseWords(window.localStorage.getItem(WORDS_STORAGE_KEY));
  } catch {
    words = [];
  }
  return words;
}

export function learnWord(term: string): void {
  const current = read();
  if (current.includes(term)) return;
  words = [...current, term];
  try {
    window.localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
  } catch {
    // Kept for this visit only.
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useWordsLearned(): string[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}
