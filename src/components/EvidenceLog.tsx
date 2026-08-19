import { useEffect, useRef, useState } from 'react';
import { ChevronRight, NotebookPen, X } from 'lucide-react';
import { buildEvidenceContrastOptions, buildEvidenceLogSlots, buildIssuedEvidenceLogSlots, getEvidenceContrastMode } from '@/expedition/evidenceLog';
import { EVIDENCE_FAMILY_LABELS } from '@/expedition/evidenceFamilies';
import type { CaseState } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

export function EvidenceLog({
  caseState,
  focusNodeIndex = null,
  className = '',
  variant = 'detail',
  onOpenDetail,
}: {
  caseState: CaseState;
  focusNodeIndex?: number | null;
  className?: string;
  variant?: 'compact' | 'detail';
  onOpenDetail?: (nodeIndex: number) => void;
}) {
  const slotRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [contrastByNode, setContrastByNode] = useState<Record<number, number>>({});

  useEffect(() => {
    if (focusNodeIndex === null) return;
    slotRefs.current[focusNodeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusNodeIndex]);

  const issuedSlots = buildIssuedEvidenceLogSlots(caseState);

  if (variant === 'compact') {
    if (issuedSlots.length === 0) {
      return (
        <section className={`min-w-0 ${className}`} aria-label="Evidence log">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[10px] text-white/55">
            <NotebookPen className="h-3.5 w-3.5 shrink-0 text-cyan-200/60" aria-hidden="true" />
            <b className="shrink-0 uppercase tracking-[.13em] text-cyan-100/65">0 / 3 evidence</b>
            <span className="truncate">Finish six moves to unlock the first family.</span>
          </div>
        </section>
      );
    }

    return (
      <section className={`min-w-0 ${className}`} aria-label="Evidence log">
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {issuedSlots.map(({ nodeIndex, observation, ruledOut }) => {
            if (!observation?.family) return null;
            const family = observation.family;
            const focused = focusNodeIndex === nodeIndex;
            return (
              <li
                key={`evidence-slot-${nodeIndex}`}
                ref={element => { slotRefs.current[nodeIndex] = element; }}
              >
                <button
                  type="button"
                  onClick={() => onOpenDetail?.(nodeIndex)}
                  className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                    focused
                      ? 'border-cyan-200/55 bg-cyan-100/[.08]'
                      : 'border-white/10 bg-white/[.035] hover:border-cyan-100/30 hover:bg-white/[.06]'
                  }`}
                  aria-label={`Open full evidence from site ${nodeIndex + 1}`}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-cyan-100/[.08] text-cyan-100">
                    <EvidenceFamilyIcon family={family} className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[8px] font-bold uppercase tracking-[.13em] text-cyan-100/60">
                      {EVIDENCE_FAMILY_LABELS[family]} · Site {nodeIndex + 1}
                    </span>
                    <span className="block truncate text-[10px] text-white/85">{observation.observationText}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {ruledOut.slice(0, 3).map(name => (
                      <span
                        key={name}
                        title={`Ruled out: ${name}`}
                        className="grid h-5 min-w-5 place-items-center rounded-full border border-red-200/20 bg-red-300/10 px-1 font-mono text-[8px] text-red-100/75 line-through"
                      >
                        {initials(name)}
                      </span>
                    ))}
                    <ChevronRight className="h-3.5 w-3.5 text-white/30" aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  const slots = buildEvidenceLogSlots(caseState);

  return (
    <section className={`min-w-0 ${className}`} aria-label="Evidence log">
      <p className="m-0 mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
        <NotebookPen className="h-3 w-3" /> Evidence log · {issuedSlots.length}/3
      </p>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {slots.map(({ nodeIndex, observation, inference, ruledOut }) => {
          const focused = focusNodeIndex === nodeIndex;
          if (!observation?.family) return null;
          const family = observation.family;
          const contrastOptions = buildEvidenceContrastOptions(caseState, observation);
          const contrastMode = getEvidenceContrastMode(contrastOptions);
          const selectedContrastId = contrastByNode[nodeIndex];
          const selectedContrast = contrastOptions.find(option => option.speciesId === selectedContrastId)
            ?? contrastOptions[0]
            ?? null;
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
                <b className="font-semibold text-white/60">Observation:</b>{' '}{observation.observationText}
              </p>
              <p className="m-0 mt-0.5 text-[11px] leading-snug text-cyan-50/85">
                <b className="font-semibold text-white/60">Inference:</b>{' '}{inference}
              </p>
              {ruledOut.length > 0 && (
                <p className="m-0 mt-0.5 text-[11px] leading-snug text-red-200/85">
                  <b className="font-semibold text-white/60">Ruled out:</b>{' '}{ruledOut.join(', ')}
                </p>
              )}
              {selectedContrast && (
                <div className="mt-2 border-t border-white/10 pt-1.5">
                  <p className="m-0 flex items-center gap-1.5 px-1 text-[8px] font-bold uppercase tracking-[.15em] text-red-100/65">
                    <span className="grid h-4 w-4 place-items-center rounded-full border border-red-200/20 bg-red-300/10">
                      <X className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                    Why ruled out
                  </p>
                  {contrastMode === 'selector' && (
                    <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={`Candidates ruled out by site ${nodeIndex + 1}`}>
                      {contrastOptions.map(option => (
                        <button
                          key={option.speciesId}
                          type="button"
                          onClick={() => setContrastByNode(current => ({ ...current, [nodeIndex]: option.speciesId }))}
                          aria-pressed={option.speciesId === selectedContrast.speciesId}
                          className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-200 ${
                            option.speciesId === selectedContrast.speciesId
                              ? 'border-red-200/45 bg-red-100/12 text-red-50'
                              : 'border-white/10 bg-white/[.04] text-white/55 hover:border-white/25 hover:text-white/80'
                          }`}
                        >
                          {option.commonName}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-1.5 rounded-lg border border-red-100/15 bg-[linear-gradient(135deg,rgba(248,113,113,.07),rgba(255,255,255,.025))] px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <b className="truncate text-[9px] text-red-50/90">{selectedContrast.commonName}</b>
                      <span className="shrink-0 rounded-full border border-red-200/15 bg-red-200/[.07] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[.1em] text-red-100/60">
                        {selectedContrast.eliminationReason}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-[10px] leading-snug text-white/70">
                      <b className="font-semibold text-white/45">Candidate record:</b>{' '}{selectedContrast.candidateTrait}
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {issuedSlots.length === 0 && (
        <p className="m-0 rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-[10px] text-white/45">
          No evidence issued yet.
        </p>
      )}
    </section>
  );
}

function initials(name: string) {
  return name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
}
