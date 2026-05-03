import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Clock, Compass, Loader2, MapPin, RefreshCw, Route, Swords } from 'lucide-react';
import { getRunNodeLabel } from '@/expedition/domain';

interface ExpeditionLauncherProps {
  onStart: () => void;
  onResume: (runId: string) => Promise<boolean> | boolean;
}

interface ResumeRunSummary {
  id: string;
  status: string;
  locationKey: string;
  realm: string | null;
  biome: string | null;
  bioregion: string | null;
  scoreTotal: number;
  finalScore: number | null;
  nodeCount: number;
  startedAt: string;
  endedAt: string | null;
  affinities: string[];
  hasResumeSnapshot?: boolean;
  nodes: Array<{
    nodeOrder: number;
    nodeType: string;
    nodeStatus: string;
    scoreEarned: number;
    movesUsed: number;
    counterGem: string | null;
    obstacleFamily: string | null;
    waypoint?: { name?: string; waypointType?: string; fallback?: boolean } | null;
  }>;
}

export function ExpeditionLauncher({ onStart, onResume }: ExpeditionLauncherProps) {
  const [resumeRuns, setResumeRuns] = useState<ResumeRunSummary[]>([]);
  const [loadingResumeRuns, setLoadingResumeRuns] = useState(false);
  const [loadingResumeId, setLoadingResumeId] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const loadResumeRuns = useCallback(async (signal?: AbortSignal) => {
    setLoadingResumeRuns(true);
    setResumeError(null);
    try {
      const response = await fetch('/api/runs/list?status=active,deduction&limit=5', { signal });
      if (!response.ok) throw new Error(`Resume list failed (${response.status})`);
      const data = await response.json();
      setResumeRuns(Array.isArray(data?.runs) ? data.runs : []);
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      console.error('Failed to load resumable runs:', error);
      setResumeError('Saved expeditions could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoadingResumeRuns(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadResumeRuns(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadResumeRuns]);

  const handleResume = useCallback(async (runId: string) => {
    setLoadingResumeId(runId);
    setResumeError(null);
    try {
      const resumed = await onResume(runId);
      if (!resumed) {
        setResumeError('That expedition could not be resumed.');
        await loadResumeRuns();
      }
    } finally {
      setLoadingResumeId(null);
    }
  }, [loadResumeRuns, onResume]);

  return (
    <div className="min-h-full px-ds-lg pt-14 pb-[104px] box-border text-ds-text-primary">
      <div className="mx-auto flex w-full max-w-md flex-col gap-ds-lg">
        <div className="flex items-center gap-ds-sm">
          <div className="flex size-10 items-center justify-center rounded-lg border border-ds-subtle glass-bg text-ds-cyan">
            <Compass size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 className="m-0 text-lg font-semibold">Expedition</h1>
            <p className="m-0 text-ds-body text-ds-text-muted">Build a route from a selected habitat.</p>
          </div>
        </div>

        <section className="glass-bg rounded-lg border border-ds-subtle shadow-card p-ds-lg">
          <div className="flex items-start gap-ds-md">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-ds-cyan/10 text-ds-cyan">
              <Route size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="m-0 text-ds-heading-sm font-semibold">New route</h2>
              <p className="mb-ds-lg mt-ds-xs text-ds-body text-ds-text-secondary">
                Choose an expedition site, review the briefing, then start the run.
              </p>
              <button
                type="button"
                onClick={onStart}
                className="inline-flex w-full items-center justify-center gap-ds-sm rounded-full border-none px-5 py-3 text-sm font-bold text-ds-bg shadow-glow-cyan sm:w-auto"
                style={{ background: 'var(--ds-gradient-cta)' }}
              >
                <MapPin size={18} aria-hidden="true" />
                Start Expedition
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ds-subtle bg-ds-surface/60 p-ds-lg">
          <div className="mb-ds-md flex items-center justify-between gap-ds-sm">
            <h2 className="m-0 text-ds-body font-semibold text-ds-text-primary">Resume</h2>
            <button
              type="button"
              onClick={() => void loadResumeRuns()}
              disabled={loadingResumeRuns || loadingResumeId != null}
              className="inline-flex size-8 items-center justify-center rounded-full border border-ds-subtle bg-ds-bg/60 text-ds-text-muted transition-colors hover:border-ds-cyan/40 hover:text-ds-cyan disabled:cursor-wait disabled:opacity-60"
              aria-label="Refresh saved expeditions"
            >
              {loadingResumeRuns ? (
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
            </button>
          </div>

          {resumeError && (
            <div className="mb-ds-sm flex items-start gap-2 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-ds-caption text-red-200" role="status">
              <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{resumeError}</span>
            </div>
          )}

          {loadingResumeRuns && resumeRuns.length === 0 ? (
            <p className="mb-0 mt-ds-xs text-ds-body text-ds-text-muted">Loading saved expeditions...</p>
          ) : resumeRuns.length > 0 ? (
            <div className="flex flex-col gap-ds-sm">
              {resumeRuns.map(run => (
                <ResumeRunCard
                  key={run.id}
                  run={run}
                  loading={loadingResumeId === run.id}
                  disabled={loadingResumeId != null}
                  onResume={() => void handleResume(run.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mb-0 mt-ds-xs text-ds-body text-ds-text-muted">
              No saved expedition checkpoint.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function ResumeRunCard({
  run,
  loading,
  disabled,
  onResume,
}: {
  run: ResumeRunSummary;
  loading: boolean;
  disabled: boolean;
  onResume: () => void;
}) {
  const completedNodes = run.nodes.filter(node => node.nodeStatus === 'completed').length;
  const activeNode = run.nodes.find(node => node.nodeStatus === 'active')
    ?? run.nodes.find(node => node.nodeStatus === 'locked')
    ?? null;
  const canResume = run.nodes.length > 0;
  const title = run.bioregion || run.realm || run.locationKey;
  const statusLabel = run.status === 'deduction' ? 'Deduction' : 'In progress';
  const nextLabel = run.status === 'deduction'
    ? 'Deduction camp ready'
    : activeNode
      ? `Node ${activeNode.nodeOrder}: ${getRunNodeLabel(activeNode)}`
      : 'Checkpoint ready';
  const waypointName = activeNode?.waypoint?.name;

  return (
    <div className="rounded-lg border border-ds-subtle bg-ds-bg/70 p-ds-md">
      <div className="flex items-start justify-between gap-ds-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-ds-xs">
            <span className="min-w-0 truncate text-ds-body font-semibold text-ds-text-primary">{title}</span>
            <span className="shrink-0 rounded-full border border-ds-cyan/30 bg-ds-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ds-cyan">
              {statusLabel}
            </span>
          </div>
          {run.biome && <p className="m-0 mt-1 truncate text-ds-caption text-ds-text-muted">{run.biome}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-ds-caption font-semibold text-ds-amber">
          <Swords size={13} aria-hidden="true" />
          {run.finalScore ?? run.scoreTotal}
        </div>
      </div>

      <div className="mt-ds-sm flex items-center justify-between gap-ds-sm text-ds-caption text-ds-text-muted">
        <span>{completedNodes}/{run.nodeCount} nodes</span>
        <span className="flex items-center gap-1">
          <Clock size={12} aria-hidden="true" />
          {formatRunDate(run.startedAt)}
        </span>
      </div>
      <p className="m-0 mt-1 truncate text-ds-caption text-ds-text-secondary" title={waypointName ? `${nextLabel} at ${waypointName}` : nextLabel}>
        {nextLabel}
        {waypointName ? <span className="text-ds-cyan"> at {waypointName}</span> : null}
      </p>
      {!run.hasResumeSnapshot && (
        <p className="m-0 mt-1 text-[10px] text-ds-text-muted">
          Legacy checkpoint; species context will be refreshed from the map point.
        </p>
      )}

      <button
        type="button"
        disabled={disabled || !canResume}
        onClick={onResume}
        className="mt-ds-sm inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-ds-cyan/40 bg-ds-cyan/10 px-3 py-2 text-ds-caption font-semibold text-ds-cyan transition-colors hover:bg-ds-cyan/15 disabled:cursor-wait disabled:border-ds-subtle disabled:bg-ds-surface/70 disabled:text-ds-text-muted"
      >
        {loading && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
        {canResume ? 'Resume' : 'Unavailable'}
      </button>
    </div>
  );
}

function formatRunDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
