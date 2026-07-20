// EvidenceLog — persistent three-slot evidence readout (Plan 018 v3).
//
// One slot per selected family. Each earned clue keeps its full reasoning
// trail on screen for the rest of the run: the raw observation, the inference,
// and the candidates it ruled out. Never truncated to a "latest clue" line.
import { useEffect, useRef } from 'react';
import { NotebookPen } from 'lucide-react';
import { buildEvidenceLogSlots } from '@/expedition/evidenceLog';
import { EVIDENCE_FAMILY_LABELS } from '@/expedition/evidenceFamilies';
import type { CaseState } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

export function EvidenceLog({ caseState, focusNodeIndex = null, className = '' }: {
  caseState: CaseState;
  /** Highlights + scrolls to one site's slot (map marker taps). */
  focusNodeIndex?: number | null;
  className?: string;
}) {
  const slotRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (focusNodeIndex === null) return;
    slotRefs.current[focusNodeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusNodeIndex]);

  const familyObservations = caseState.observations.filter(observation => observation.family);
  const slots = buildEvidenceLogSlots(caseState);

  return (
    <section className={`min-w-0 ${className}`} aria-label="Evidence log">
      <p className="m-0 mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
        <NotebookPen className="h-3 w-3" /> Evidence log · {familyObservations.length}/3
      </p>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {slots.map(({ nodeIndex, observation, inference, ruledOut }) => {
          const focused = focusNodeIndex === nodeIndex;
          if (!observation?.family) {
            return (
              <li
                key={`evidence-slot-${nodeIndex}`}
                ref={element => { slotRefs.current[nodeIndex] = element; }}
                className={`rounded-xl border border-dashed px-2.5 py-2 text-[10px] text-white/40 ${focused ? 'border-cyan-200/50 bg-cyan-100/[.04]' : 'border-white/15 bg-white/[.02]'}`}
              >
                Site {nodeIndex + 1} · evidence slot open — finish six moves there and choose a family to study.
              </li>
            );
          }
          const family = observation.family;
          return (
            <li
              key={`evidence-slot-${nodeIndex}`}
              ref={element => { slotRefs.current[nodeIndex] = element; }}
              className={`rounded-xl border px-2.5 py-2 ${focused ? 'border-cyan-200/60 bg-cyan-100/[.07]' : 'border-white/12 bg-white/[.04]'}`}
            >
              <p className="m-0 mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-cyan-100/80">
                <EvidenceFamilyIcon family={family} className="h-3 w-3" strokeWidth={2.5} />
                {EVIDENCE_FAMILY_LABELS[family]} · Site {nodeIndex + 1}
              </p>
              <p className="m-0 text-[11px] leading-snug text-white/90">
                <b className="mr-1 font-semibold text-white/60">Observation</b>{observation.observationText}
              </p>
              <p className="m-0 mt-0.5 text-[11px] leading-snug text-cyan-50/85">
                <b className="mr-1 font-semibold text-white/60">Inference</b>{inference}
              </p>
              <p className="m-0 mt-0.5 text-[11px] leading-snug text-red-200/85">
                <b className="mr-1 font-semibold text-white/60">Ruled out</b>
                {ruledOut.length ? ruledOut.join(', ') : 'No candidates ruled out by this clue.'}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
