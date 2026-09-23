import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { RoutingPrototypeHud } from '@/components/RoutingPrototypeHud';
import { createClientUuid } from '@/lib/clientUuid';
import type { PublicRoutingView } from '@/terrain/routing';
import type { TerrainSelection, TerrainSnapshotV1 } from '@/terrain/terrain';
import type { BoardCheckpointV1 } from '@/game/boardTypes';
import type { IRefPhaserGame } from '@/PhaserGame';

const PhaserGame = dynamic(() => import('@/PhaserGame').then(mod => mod.PhaserGame), { ssr: false });

interface PrototypePayload {
  sessionId: string;
  boardSeed: number;
  terrain: TerrainSnapshotV1;
  checkpoint: BoardCheckpointV1 | null;
  view: PublicRoutingView;
}

const STORAGE_KEY = 'routing-prototype-session';

export function RoutingPrototypeApp() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [payload, setPayload] = useState<PrototypePayload | null>(null);
  const [selection, setSelection] = useState<TerrainSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameReady, setGameReady] = useState(false);
  const boardStarted = useRef(false);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const applyPayload = useCallback((next: PrototypePayload, emitBoard: boolean) => {
    setPayload(next);
    EventBus.emit('routing-state-updated', next.view);
    if (!emitBoard) return;
    EventBus.emit('map-location-selected', {
      nodeIndex: 0, moveBudget: 6, boardSeed: next.boardSeed, obstacles: [],
      terrain: next.terrain,
      ...(next.checkpoint ? { boardCheckpoint: next.checkpoint } : {}),
    });
  }, []);

  const command = useCallback(async (body: Record<string, unknown>) => {
    const current = payloadRef.current;
    if (!current) return null;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/routing-prototype/${current.sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await response.json() as PrototypePayload & { error?: string; reason?: string };
      if (response.status === 404) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        throw new Error('Prototype session expired. Reload the page.');
      }
      if (!response.ok) throw new Error(data.reason ?? data.error ?? `HTTP ${response.status}`);
      applyPayload({ ...current, ...data, sessionId: data.sessionId ?? current.sessionId }, false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY);
        const resumed = saved ? await fetch(`/api/routing-prototype/${saved}`) : null;
        if (saved && resumed && !resumed.ok) window.sessionStorage.removeItem(STORAGE_KEY);
        const created = resumed?.ok ? resumed : await fetch('/api/routing-prototype', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ createRequestId: createClientUuid(), boardSeed: 91 }),
        });
        const data = await created.json() as PrototypePayload & { error?: string };
        if (!created.ok) throw new Error(data.error ?? `HTTP ${created.status}`);
        if (cancelled) return;
        window.sessionStorage.setItem(STORAGE_KEY, data.sessionId);
        setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!gameReady || !payload || boardStarted.current) return;
    boardStarted.current = true;
    applyPayload(payload, true);
  }, [gameReady, payload, applyPayload]);

  useEffect(() => {
    const onMove = async (event: EventPayloads['evidence-move-resolved']) => {
      const current = payloadRef.current;
      if (!current || event.nodeIndex !== 0) return;
      const result = await command({
        kind: 'move', requestId: createClientUuid(), revision: current.view.revision, submission: event,
      });
      if (!result || !result.view.pendingExtension) {
        EventBus.emit('evidence-progress-committed', { nodeIndex: 0, moveNumber: event.moveNumber });
      }
    };
    const onSelect = (next: TerrainSelection) => setSelection(next);
    EventBus.on('evidence-move-resolved', onMove);
    EventBus.on('terrain-cell-selected', onSelect);
    return () => {
      EventBus.off('evidence-move-resolved', onMove);
      EventBus.off('terrain-cell-selected', onSelect);
    };
  }, [command]);

  const extend = async (cellId: string | null) => {
    const current = payloadRef.current;
    if (!current) return;
    const result = await command({ kind: 'extend', requestId: createClientUuid(), revision: current.view.revision, cellId });
    if (result) EventBus.emit('evidence-progress-committed', { nodeIndex: 0, moveNumber: result.view.movesUsed });
  };

  return (
    <>
      <Head>
        <title>Routing prototype</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="relative h-dvh bg-slate-950">
        <div className="h-full min-h-[390px] w-full">
          <PhaserGame
            ref={phaserRef}
            currentActiveScene={scene => {
              phaserRef.current = { game: phaserRef.current?.game ?? null, scene };
              if (scene.sys.settings.key === 'Game') setGameReady(true);
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 md:top-0 md:bottom-auto">
          {payload && (
            <RoutingPrototypeHud
              view={payload.view}
              terrain={payload.terrain}
              selection={selection}
              busy={busy}
              onExtend={extend}
              onTravel={cellId => command({ kind: 'travel', requestId: createClientUuid(), revision: payload.view.revision, cellId })}
            />
          )}
          {error && <p className="pointer-events-auto rounded bg-red-900/80 px-3 py-2 text-sm text-red-100">{error}</p>}
        </div>
      </main>
    </>
  );
}
