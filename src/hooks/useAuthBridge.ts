import { useUser } from '@clerk/nextjs';
import { useEffect, useRef } from 'react';
import { EventBus } from '@/game/EventBus';

export function useAuthBridge() {
  const { isSignedIn } = useUser();
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || resolvedRef.current) return;

    fetch('/api/player/ensure-profile', { method: 'POST' })
      .then(r => r.json())
      .then(async ({ playerId, isNew }) => {
        resolvedRef.current = true;

        // Start game session server-side
        let sessionId: string | undefined;
        try {
          const sessRes = await fetch('/api/player/start-session', { method: 'POST' });
          const sessData = await sessRes.json();
          sessionId = sessData.sessionId;
        } catch (err) {
          console.error('Failed to start session:', err);
        }

        EventBus.emit('auth-user-ready', { playerId, sessionId });

        if (isNew) {
          const raw = localStorage.getItem('discoveredSpecies');
          const discoveries = raw ? JSON.parse(raw) : [];
          if (discoveries.length > 0) {
            fetch('/api/discoveries/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: playerId, discoveries }),
            }).catch(console.error);
          }
        }
      })
      .catch(console.error);
  }, [isSignedIn]);
}
