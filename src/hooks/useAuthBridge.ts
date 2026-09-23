import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { EventBus } from '@/game/EventBus';

export function useAuthBridge() {
  const { isSignedIn } = useUser();
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || resolvedRef.current) return;
    let cancelled = false;

    fetch('/api/player/ensure-profile', { method: 'POST' })
      .then(async r => {
        if (!r.ok) throw new Error(`ensure-profile failed (${r.status})`);
        return r.json() as Promise<{ playerId?: unknown }>;
      })
      .then(async ({ playerId }) => {
        // resolvedRef stays unset on a bad or cancelled response so a later sign-in retries.
        if (cancelled || typeof playerId !== 'string') return;

        // Start game session server-side
        let sessionId: string | undefined;
        try {
          const sessRes = await fetch('/api/player/start-session', { method: 'POST' });
          if (!sessRes.ok) throw new Error(`start-session failed (${sessRes.status})`);
          const sessData = await sessRes.json();
          if (typeof sessData.sessionId === 'string') sessionId = sessData.sessionId;
        } catch (err) {
          console.error('Failed to start session:', err);
        }
        if (cancelled) return;
        resolvedRef.current = true;

        EventBus.emit('auth-user-ready', { playerId, sessionId });

        // Not gated on isNew: a cancelled first response would lose that flag, and the
        // endpoint skips rows the player already has, so re-sending is safe.
        const raw = localStorage.getItem('discoveredSpecies');
        const discoveries = raw ? JSON.parse(raw) : [];
        if (Array.isArray(discoveries) && discoveries.length > 0) {
          fetch('/api/discoveries/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discoveries }),
          }).catch(console.error);
        }
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, [isSignedIn]);
}
