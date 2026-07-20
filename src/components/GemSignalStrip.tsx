// GemSignalStrip — the thin status bar above the board during a mystery run.
// One dot per investigation method: route methods fill in as their evidence
// is secured; the current site's method pulses; off-route methods stay dim.
// Driven entirely by caseState (observations + interpretations) — no legacy
// wallet or comparative-deduction state.
import { useMemo, type ComponentProps } from 'react';
import type { RunState } from '@/types/expedition';
import { GEM_COLOR_MAP, METHOD_GEM_MAP, METHOD_LABELS, METHOD_SLOTS, METHOD_TYPES, type MethodType } from '@/expedition/domain';
import { evidenceLabelForMatchLength } from '@/expedition/evidenceQuality';
import { Dna, Eye, Leaf, MapPin, PawPrint } from 'lucide-react';
import { EVIDENCE_FAMILIES, EVIDENCE_FAMILY_GEMS, EVIDENCE_FAMILY_LABELS, deriveEvidenceFamilyOffer, type EvidenceFamily } from '@/expedition/evidenceFamilies';

interface GemSignalStripProps {
  runState: RunState;
}

export function GemSignalStrip({ runState }: GemSignalStripProps) {
  const caseState = runState.caseState;
  const routeMethods = useMemo(() => new Set<MethodType>(caseState?.version === 1
    ? METHOD_SLOTS
    : [...(caseState?.selectedMethods ?? []).filter((method): method is MethodType => method !== null), ...(caseState?.offeredMethods ?? [])]), [caseState?.offeredMethods, caseState?.selectedMethods, caseState?.version]);
  const currentMethod: MethodType | null = caseState?.stage === 'board'
    ? caseState.selectedMethods[Math.min(runState.currentNodeIndex, 2)] ?? null
    : null;
  const securedMethods = useMemo(
    () => new Set<MethodType>((caseState?.observations ?? []).flatMap(observation => observation.method ? [observation.method] : [])),
    [caseState?.observations],
  );

  const statusText = useMemo(() => {
    if (!caseState) return 'Field signal';
    const liveCount = caseState.profiles.length - caseState.eliminatedIds.length;
    const remain = `${liveCount} candidate${liveCount === 1 ? ' remains' : 's remain'}`;
    if (caseState.version === 3) {
      if (caseState.stage === 'choose_evidence') return `Choose a clue family — ${remain}`;
      if (caseState.stage === 'guess') return `Final deduction — ${remain}`;
      return `Site ${Math.min(runState.currentNodeIndex + 1, 3)} · move ${caseState.objectiveProgress} of 6 — direct clears steer your choices`;
    }
    if (caseState.stage === 'choose_method') return `Choose a field question — ${remain}`;
    if (caseState.stage === 'guess') return `Final deduction — ${remain}`;
    if (caseState.pendingInterpretationRef) {
      const pending = caseState.observations.find(item => item.ref === caseState.pendingInterpretationRef);
      return pending?.method ? `New ${METHOD_LABELS[pending.method]} evidence — open the field dossier` : 'New evidence — open the field dossier';
    }
    const latest = caseState.interpretations.at(-1);
    if (latest) return `${latest.correct ? 'Prediction confirmed' : 'Prediction revised'} — ${remain}`;
    const quality = caseState.version === 2 ? evidenceLabelForMatchLength(caseState.bestTargetMatchLength) : null;
    return currentMethod ? `Match ${METHOD_LABELS[currentMethod]} tiles · ${quality ?? 'no sample yet'}` : 'Field signal';
  }, [caseState, currentMethod, runState.currentNodeIndex]);

  if (caseState?.version === 3) {
    const likely = caseState.offeredFamilies.length > 0
      ? caseState.offeredFamilies
      : deriveEvidenceFamilyOffer(caseState.evidenceCharges, caseState.selectedFamilies);
    const selected = new Set(caseState.selectedFamilies);
    return (
      <div className="absolute left-0 right-0 top-0 z-panel pointer-events-none">
        <div className="glass-strip pointer-events-auto border-x-0 border-t-0 border-b border-ds-subtle px-3 py-2 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <span className="glass-strip-text min-w-0 truncate text-[11px] text-ds-text-primary">{statusText}</span>
            <div className="flex gap-1" aria-label={`${caseState.objectiveProgress} of 6 moves complete`}>
              {Array.from({ length: 6 }, (_, index) => <span key={index} className={`size-1.5 rounded-full ${index < caseState.objectiveProgress ? 'bg-ds-emerald' : 'bg-white/20'}`} />)}
            </div>
          </div>
          <ul className="mt-1.5 grid grid-cols-5 gap-1" aria-label="Evidence family totals">
            {EVIDENCE_FAMILIES.map(family => {
              const locked = selected.has(family);
              const offered = likely.includes(family) && !locked;
              const color = GEM_COLOR_MAP[EVIDENCE_FAMILY_GEMS[family]];
              return <li key={family} className={`flex min-w-0 items-center gap-1 rounded border px-1.5 py-1 ${offered ? 'border-white/35 bg-white/[.08]' : 'border-white/10 bg-black/10'} ${locked ? 'opacity-35' : ''}`} title={`${EVIDENCE_FAMILY_LABELS[family]}: ${caseState.evidenceCharges[family]}${locked ? ' (studied)' : offered ? ' (likely choice)' : ''}`}>
                <FamilyGlyph family={family} className="h-3 w-3 shrink-0" style={{ color }} />
                <span className="hidden truncate text-[9px] text-ds-text-secondary sm:inline">{EVIDENCE_FAMILY_LABELS[family]}</span>
                <strong className="ml-auto text-[10px] tabular-nums text-ds-text-primary">{locked ? '✓' : caseState.evidenceCharges[family]}</strong>
              </li>;
            })}
          </ul>
        </div>
      </div>
    );
  }

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

function FamilyGlyph({ family, ...props }: { family: EvidenceFamily } & ComponentProps<'svg'>) {
  const Icon = family === 'relatives' ? Dna : family === 'body' ? PawPrint : family === 'behavior' ? Eye : family === 'habits' ? Leaf : MapPin;
  return <Icon {...props} />;
}
