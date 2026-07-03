import { Clock, Loader2, Map, MapPin, Swords } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getRunNodeLabel } from '@/expedition/domain';
import type { RunSummary } from './types';

export function RunsTab({
  runs,
  runsLoading,
  runsLoaded,
  onFetchRuns,
}: {
  runs: RunSummary[];
  runsLoading: boolean;
  runsLoaded: boolean;
  onFetchRuns: () => void;
}) {
  return (
    <div className="h-full" onFocusCapture={onFetchRuns} onMouseEnter={onFetchRuns}>
      <ScrollArea className="h-full px-5">
        <div className="space-y-4 py-4 pb-24">
          <h2 className="text-lg font-semibold text-foreground">Expedition Runs</h2>
          {runsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground text-sm">Loading runs</span>
            </div>
          )}
          {runsLoaded && runs.length === 0 && (
            <div className="text-center py-16">
              <Map className="size-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg mb-2">No completed runs yet</p>
              <p className="text-muted-foreground/70 text-sm">Complete an expedition to see it here</p>
            </div>
          )}
          {runs.map(run => (
            <RunMemoryCard key={run.id} run={run} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function RunMemoryCard({ run }: { run: RunSummary }) {
  const completedNodes = run.nodes.filter(n => n.nodeStatus === 'completed').length;
  const featureClasses = [...new Set(run.gisFeaturesNearby.map(f => f.featureClass).filter(Boolean))].slice(0, 4);

  return (
    <div className="bg-card/80 border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="size-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{run.bioregion || run.realm || run.locationKey}</p>
            {run.biome && <p className="text-[11px] text-muted-foreground truncate">{run.biome}</p>}
          </div>
        </div>
        {run.finalScore != null && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Swords className="size-3.5 text-ds-amber" />
            <span className="text-sm font-semibold text-ds-amber">{run.finalScore}</span>
          </div>
        )}
      </div>

      {(run.routePolyline.length > 1 || run.discoveredSpecies) && (
        <div className="mb-3 grid grid-cols-[88px_1fr] gap-3">
          <RunRouteSparkline points={run.routePolyline} />
          <div className="min-w-0">
            {run.discoveredSpecies && (
              <p className="text-[11px] text-ds-emerald truncate">Found {run.discoveredSpecies.name}</p>
            )}
            {featureClasses.length > 0 && (
              <div className="mt-1 flex gap-1 flex-wrap">
                {featureClasses.map((featureClass) => (
                  <span key={featureClass} className="text-[9px] px-1.5 py-0.5 rounded bg-background/80 text-primary border border-border">
                    {featureClass.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1 flex-wrap mb-2">
        {run.nodes.filter(n => n.nodeType !== 'analysis').map((node, i) => {
          const waypointName = typeof node.waypoint?.name === 'string' ? node.waypoint.name : '';
          const nodeLabel = getRunNodeLabel(node);
          const chipTitle = waypointName
            ? `${nodeLabel} - ${waypointName}`
            : nodeLabel;

          return (
            <span
              key={i}
              title={chipTitle}
              className={cn(
                'inline-flex flex-col text-[9px] px-1.5 py-0.5 rounded border max-w-[112px]',
                node.nodeStatus === 'completed'
                  ? 'bg-ds-emerald/10 border-ds-emerald/30 text-ds-emerald'
                  : 'bg-card border-border text-muted-foreground'
              )}
            >
              <span className="truncate">
                {nodeLabel}
                {node.counterGem && <span className="ml-0.5 text-primary">[{node.counterGem}]</span>}
              </span>
              {waypointName && (
                <span className="truncate text-ds-emerald/80">{waypointName}</span>
              )}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{completedNodes}/{run.nodeCount} nodes</span>
        {run.affinities.length > 0 && (
          <span className="text-gem-focus">{(run.affinities as string[]).join(', ')}</span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {new Date(run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

function RunRouteSparkline({ points }: { points: Array<{ lon: number; lat: number }> }) {
  if (points.length <= 1) {
    return <div className="h-14 rounded bg-background/70 border border-border" />;
  }

  const xs = points.map(point => point.lon);
  const ys = points.map(point => point.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = 88;
  const height = 56;
  const pad = 8;
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const polyline = points.map((point) => {
    const x = pad + ((point.lon - minX) / dx) * (width - pad * 2);
    const y = height - pad - ((point.lat - minY) / dy) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const start = polyline[0].split(',');
  const end = polyline[polyline.length - 1].split(',');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-[88px] rounded bg-background/70 border border-border">
      <polyline points={polyline.join(' ')} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r="2" fill="#facc15" />
      <circle cx={end[0]} cy={end[1]} r="2" fill="#22c55e" />
    </svg>
  );
}
