import { ArrowRight, Compass, MapPin, Route } from 'lucide-react';

interface ExpeditionLauncherProps {
  onStart: () => void;
}

export function ExpeditionLauncher({ onStart }: ExpeditionLauncherProps) {
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
          <h2 className="m-0 text-ds-body font-semibold text-ds-text-primary">Resume</h2>
          <p className="mb-0 mt-ds-xs text-ds-body text-ds-text-muted">
            Run resume is not available in this build.
          </p>
        </section>
      </div>
    </div>
  );
}
