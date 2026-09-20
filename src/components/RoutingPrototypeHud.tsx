import { Button } from '@/components/ui/button';
import type { PublicRoutingView } from '@/terrain/routing';
import type { TerrainSelection, TerrainSnapshotV1 } from '@/terrain/terrain';
import { selectedTerrainCell } from '@/terrain/terrain';

export function RoutingPrototypeHud({
  view, terrain, selection, busy, onExtend, onTravel,
}: {
  view: PublicRoutingView;
  terrain: TerrainSnapshotV1;
  selection: TerrainSelection | null;
  busy: boolean;
  onExtend: (cellId: string | null) => void;
  onTravel: (cellId: string) => void;
}) {
  const selected = selectedTerrainCell(terrain, selection);
  const canTravel = !!selected && view.reachableIds.includes(selected.id) && selected.id !== view.partyId;
  return (
    <aside className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-lg border border-white/15 bg-slate-950/85 p-3 text-sm text-slate-100 shadow-lg">
      <p className="font-medium">Routing prototype (isolated)</p>
      <p>Moves {view.movesUsed}/{view.maxMoves}. Trail 3+ {view.trailTouchCount}. Crossing {view.crossingOpen ? 'open' : 'closed'}.</p>
      <p>{view.arrived ? 'Survey arrived (once).' : 'Survey not reached.'}{view.pendingExtension ? ' Direct 3+ touched the pre-move trail. Choose a frontier cell or skip before the next shift.' : ''}</p>
      {view.pendingExtension && (
        <div className="flex flex-wrap gap-2">
          {view.frontierIds.map(id => (
            <Button key={id} size="sm" disabled={busy} onClick={() => onExtend(id)}>
              {id === view.crossingToId ? 'Open crossing' : `Extend ${id.slice(-9)}`}
            </Button>
          ))}
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onExtend(null)}>Skip</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy || !canTravel} onClick={() => selected && onTravel(selected.id)}>
          Travel to selection
        </Button>
        <span className="text-xs text-slate-300">{selected ? selected.label : 'Tap a cell'}</span>
      </div>
    </aside>
  );
}
