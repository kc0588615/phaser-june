// GemSignalStrip — the thin status bar above the board during a mystery run.
// One dot per investigation method: route methods fill in as their evidence
// is secured; the current site's method pulses; off-route methods stay dim.
// Driven entirely by caseState (observations + interpretations) — no legacy
// wallet or comparative-deduction state.
import { useMemo } from 'react';
import type { RunState } from '@/types/expedition';
import { GEM_COLOR_MAP, METHOD_GEM_MAP, METHOD_LABELS, METHOD_SLOTS, METHOD_TYPES, type MethodType } from '@/expedition/domain';

interface GemSignalStripProps {
  runState: RunState;
}

export function GemSignalStrip({ runState }: GemSignalStripProps) {
  const caseState = runState.caseState;
  const routeMethods = useMemo(() => new Set<MethodType>(METHOD_SLOTS), []);
  const currentMethod: MethodType | null = caseState?.stage === 'board'
    ? METHOD_SLOTS[Math.min(runState.currentNodeIndex, METHOD_SLOTS.length - 1)] ?? null
    : null;
  const securedMethods = useMemo(
    () => new Set<MethodType>((caseState?.observations ?? []).map(observation => observation.method)),
    [caseState?.observations],
  );

  const statusText = useMemo(() => {
    if (!caseState) return 'Field signal';
    const liveCount = caseState.profiles.length - caseState.eliminatedIds.length;
    if (caseState.stage === 'guess') return `Final deduction — ${liveCount} candidates remain`;
    if (caseState.pendingInterpretationRef) {
      const pending = caseState.observations.find(item => item.ref === caseState.pendingInterpretationRef);
      return pending ? `New ${METHOD_LABELS[pending.method]} evidence — open the field dossier` : 'New evidence — open the field dossier';
    }
    const latest = caseState.interpretations.at(-1);
    if (latest) return `${latest.correct ? 'Prediction confirmed' : 'Prediction revised'} — ${liveCount} candidates remain`;
    return currentMethod ? `Match ${METHOD_LABELS[currentMethod]} tiles to secure evidence` : 'Field signal';
  }, [caseState, currentMethod]);

  return (
    <div className="absolute left-0 right-0 top-0 z-panel pointer-events-none">
      <style>{`
        @keyframes gem-signal-pulse {
          0% { transform: scale(1); }
          45% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .gem-signal-dot-pulse { animation: gem-signal-pulse 1200ms ease-out infinite; }
      `}</style>
      <div className="glass-strip pointer-events-auto h-10 border-x-0 border-t-0 border-b border-ds-subtle px-ds-md flex items-center justify-between gap-ds-sm shadow-card">
        <span className="glass-strip-text min-w-0 flex-1 truncate text-ds-caption text-ds-text-primary">
          {statusText}
        </span>
        <ul className="m-0 flex flex-none list-none items-center justify-end gap-2 p-0" aria-label="Investigation method signals">
          {METHOD_TYPES.map((method) => {
            const color = GEM_COLOR_MAP[METHOD_GEM_MAP[method]];
            const onRoute = routeMethods.has(method);
            const secured = securedMethods.has(method);
            const active = currentMethod === method;
            const state = secured ? 'evidence secured' : onRoute ? 'evidence pending' : 'not on this route';
            return (
              <li
                key={method}
                title={`${METHOD_LABELS[method]} — ${state}`}
                aria-label={`${METHOD_LABELS[method]} ${state}`}
                className={`block size-3 rounded-full ${active ? 'gem-signal-dot-pulse' : ''}`}
                style={{
                  background: secured ? color : 'transparent',
                  border: `1.5px solid ${color}`,
                  opacity: secured || active ? 1 : onRoute ? 0.65 : 0.3,
                  boxShadow: secured || active ? `0 0 10px ${color}` : 'none',
                }}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}
