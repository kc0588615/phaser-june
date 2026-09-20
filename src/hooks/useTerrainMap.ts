import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Map } from 'maplibre-gl';
import { EventBus } from '@/game/EventBus';
import { TerrainMapController, type TerrainMapMode } from '@/terrain/mapTerrain';
import { selectedTerrainCell, type TerrainSelection, type TerrainSnapshotV1 } from '@/terrain/terrain';

export function useTerrainMap(mapRef: RefObject<Map | null>, ready: boolean, terrain: TerrainSnapshotV1 | undefined, fullscreen: boolean, siteMarkers: readonly unknown[]) {
  const controller = useRef<TerrainMapController | null>(null);
  const [view, setView] = useState<{ snapshotId?: string; mode: TerrainMapMode; selection: TerrainSelection | null }>({
    snapshotId: terrain?.id, mode: terrain ? 'local' : 'region', selection: null,
  });
  // Reset on every site transition, including revisits, without remounting the map.
  if (view.snapshotId !== terrain?.id) {
    setView({ snapshotId: terrain?.id, mode: terrain ? 'local' : 'region', selection: null });
  }
  const { mode, selection } = view;

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const instance = new TerrainMapController(mapRef.current, next => EventBus.emit('terrain-cell-selected', next));
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [mapRef, ready]);

  useEffect(() => {
    controller.current?.update(terrain, mode, fullscreen);
  }, [ready, terrain, mode, fullscreen, siteMarkers]);

  useEffect(() => {
    const select = (next: TerrainSelection) => {
      if (!selectedTerrainCell(terrain, next)) return;
      controller.current?.select(next);
      setView(previous => ({ ...previous, selection: next }));
    };
    EventBus.on('terrain-cell-selected', select);
    return () => { EventBus.off('terrain-cell-selected', select); };
  }, [terrain]);

  return {
    mode,
    setMode: (next: TerrainMapMode) => { if (terrain) setView(previous => ({ ...previous, mode: next })); },
    selectedCell: selectedTerrainCell(terrain, selection),
  };
}
