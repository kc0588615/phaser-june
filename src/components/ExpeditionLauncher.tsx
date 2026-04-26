import { useEffect, useState } from 'react';
import { ArrowRight, Clock, Compass, Loader2, MapPin, Route, Swords } from 'lucide-react';

interface ExpeditionLauncherProps {
  onStart: () => void;
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
  nodes: Array<{
    nodeOrder: number;
    nodeType: string;
    nodeStatus: string;
    scoreEarned: number;
    movesUsed: number;
    counterGem: string | null;
    obstacleFamily: string | null;
  }>;
}

export function ExpeditionLauncher({ onStart }: ExpeditionLauncherProps) {
  const [resumeRuns, setResumeRuns] = useState<ResumeRunSummary[]>([]);
  const [loadingResumeRuns, setLoadingResumeRuns] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingResumeRuns(true);

    fetch('/api/runs/list?status=active,deduction&limit=5')
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!cancelled && Array.isArray(data?.runs)) {
          setResumeRuns(data.runs);
        }
      })
      .catch(error => console.error('Failed to load resumable runs:', error))
      .finally(() => {
        if (!cancelled) setLoadingResumeRuns(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
            {loadingResumeRuns && <Loader2 size={16} className="animate-spin text-ds-text-muted" aria-hidden="true" />}
          </div>

          {resumeRuns.length > 0 ? (
            <div className="flex flex-col gap-ds-sm">
              {resumeRuns.map(run => (
                <ResumeRunCard key={run.id} run={run} />
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

function ResumeRunCard({ run }: { run: ResumeRunSummary }) {
  const completedNodes = run.nodes.filter(node => node.nodeStatus === 'completed').length;
  const title = run.bioregion || run.realm || run.locationKey;
  const statusLabel = run.status === 'deduction' ? 'Deduction' : 'In progress';

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

      <button
        type="button"
        disabled
        className="mt-ds-sm inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-ds-subtle bg-ds-surface/70 px-3 py-2 text-ds-caption font-semibold text-ds-text-muted"
      >
        Resume unavailable
      </button>
    </div>
  );
}

function formatRunDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
