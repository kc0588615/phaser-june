import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';

/**
 * Makes sure a signed-in player has a `profiles` row, so their Clue Match
 * solves are saved under their id (src/lib/authHelpers.ts). Runs once per sign-in.
 */
export function useEnsureProfile(): void {
  const { isSignedIn } = useUser();
  const done = useRef(false);
  useEffect(() => {
    if (!isSignedIn || done.current) return;
    done.current = true;
    fetch('/api/player/ensure-profile', { method: 'POST' })
      .then(response => { if (!response.ok) throw new Error(`ensure-profile failed (${response.status})`); })
      .catch(error => {
        done.current = false; // retry on the next sign-in change
        console.error('[Auth] Could not create the player profile:', error);
      });
  }, [isSignedIn]);
}
