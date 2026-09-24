import { useEffect } from 'react';

/** Close a dialog with the Escape key. */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onEscape]);
}
