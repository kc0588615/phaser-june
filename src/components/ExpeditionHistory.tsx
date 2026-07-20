import { Clock, Loader2, Map, MapPin, Swords } from 'lucide-react';
import { ExpeditionRouteMap } from '@/components/ExpeditionRouteMap';
import { getRunNodeLabel } from '@/expedition/domain';
import { cn } from '@/lib/utils';
import type { RunSummary } from '@/types/runSummary';

export function ExpeditionHistory({ runs, loading }: { runs: RunSummary[]; loading: boolean }) {
  return (
    <section className="rounded-lg border border-ds-subtle bg-ds-surface/60 p-ds-lg">
      <div className="mb-ds-md flex items-center justify-between gap-ds-sm">
        <div>
          <h2 className="m-0 text-ds-body font-semibold text-ds-text-primary">Field history</h2>
          <p className="m-0 mt-1 text-ds-caption text-ds-text-muted">Completed routes and collected species.</p>
        </div>
        <Map size={18} className="text-ds-cyan" aria-hidden="true" />
      </div>

      {loading && runs.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-ds-body text-ds-text-muted">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Loading field history
        </div>
      ) : runs.length === 0 ? (
        <p className="mb-0 mt-ds-xs text-ds-body text-ds-text-muted">No completed expedition yet.</p>
      ) : (
        <div className="flex flex-col gap-ds-sm">
          {runs.slice(0, 12).map(run => <ExpeditionMemoryCard key={run.id} run={run} />)}
        </div>
      )}
    </section>
  );
}

function ExpeditionMemoryCard({ run }: { run: RunSummary }) {
  const completedNodes = run.nodes.filter(node => node.nodeStatus === 'completed');
  const waypoints = run.nodes.flatMap(node => node.waypoint ? [node.waypoint] : []);
  const visitedSlot = Math.max(
    0,
    ...completedNodes.flatMap(node => Number.isInteger(node.waypoint?.slot) ? [node.waypoint!.slot!] : []),
    ...run.routePolyline.flatMap(point => Number.isInteger(point.waypointSlot) ? [point.waypointSlot!] : []),
  );
  const featureClasses = [...new Set(run.gisFeaturesNearby.map(feature => feature.featureClass).filter(Boolean))].slice(0, 3);

  return (
    <article className="rounded-lg border border-ds-subtle bg-ds-bg/70 p-ds-md">
      <div className="flex items-start justify-between gap-ds-sm">
        <div className="flex min-w-0 items-start gap-2">
          <MapPin size={15} className="mt-0.5 shrink-0 text-ds-cyan" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="m-0 truncate text-ds-body font-semibold text-ds-text-primary">
              {run.bioregion || run.realm || run.locationKey}
            </h3>
            {run.biome && <p className="m-0 mt-0.5 truncate text-ds-caption text-ds-text-muted">{run.biome}</p>}
          </div>
        </div>
        {run.finalScore != null && (
          <span className="flex shrink-0 items-center gap-1 text-ds-caption font-semibold text-ds-amber">
            <Swords size={13} aria-hidden="true" />
            {run.finalScore}
          </span>
        )}
      </div>

      <div className="mt-ds-sm grid grid-cols-[112px_1fr] gap-3">
        <div className="overflow-hidden rounded-md border border-ds-subtle">
          <ExpeditionRouteMap
            routePolyline={run.routePolyline}
            waypoints={waypoints}
            visitedWaypointSlot={visitedSlot}
            captured
            showLabels={false}
            ariaLabel={`Route for ${run.bioregion || run.realm || 'completed expedition'}`}
          />
        </div>
        <div className="min-w-0">
          {run.discoveredSpecies && (
            <p className="m-0 truncate text-ds-caption font-semibold text-ds-emerald">Found {run.discoveredSpecies.name}</p>
          )}
          {featureClasses.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {featureClasses.map(featureClass => (
                <span key={featureClass} className="rounded border border-ds-subtle bg-ds-surface px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-ds-text-secondary">
                  {featureClass.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-ds-sm flex flex-wrap gap-1">
        {run.nodes.filter(node => node.nodeType !== 'analysis').slice(0, 6).map((node, index) => (
          <span
            key={`${node.nodeOrder}-${index}`}
            title={node.waypoint?.name || getRunNodeLabel(node)}
            className={cn(
              'max-w-[108px] truncate rounded border px-1.5 py-0.5 text-[8px]',
              node.nodeStatus === 'completed'
                ? 'border-ds-emerald/30 bg-ds-emerald/10 text-ds-emerald'
                : 'border-ds-subtle bg-ds-surface text-ds-text-muted',
            )}
          >
            {node.waypoint?.name || getRunNodeLabel(node)}
          </span>
        ))}
      </div>

      <div className="mt-ds-sm flex items-center justify-between text-[9px] text-ds-text-muted">
        <span>{completedNodes.length}/{run.nodeCount} nodes</span>
        {run.affinities.length > 0 && <span className="max-w-[140px] truncate text-gem-focus">{run.affinities.join(', ')}</span>}
        <span className="flex items-center gap-1">
          <Clock size={11} aria-hidden="true" />
          {formatRunDate(run.startedAt)}
        </span>
      </div>
    </article>
  );
}

function formatRunDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Saved'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
