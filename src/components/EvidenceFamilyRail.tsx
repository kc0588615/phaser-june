import { Lock, RadioTower } from 'lucide-react';
import {
  EVIDENCE_FAMILIES,
  EVIDENCE_FAMILY_LABELS,
  EVIDENCE_FAMILY_QUESTIONS,
  type EvidenceFamily,
} from '@/expedition/evidenceFamilies';
import type { CaseState } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

const COLOR: Record<EvidenceFamily, string> = {
  relatives: '#ff756d', body: '#ffad52', behavior: '#f8d84b', habits: '#5fd28a', place: '#5bc4ff',
};

export function EvidenceFamilyRail({ caseState, onChoose }: { caseState: CaseState; onChoose: (family: EvidenceFamily) => Promise<boolean> }) {
  const offered = new Set(caseState.offeredFamilies);
  const locked = new Set(caseState.selectedFamilies);
  const choosing = caseState.stage === 'choose_evidence';

  return (
    <aside className="absolute bottom-[108px] right-2 top-2 z-[65] flex w-[112px] flex-col rounded-2xl border border-white/15 bg-[rgba(7,17,20,.88)] p-2 shadow-2xl backdrop-blur-md sm:bottom-[76px] sm:right-4 sm:w-[132px] lg:bottom-2" aria-label="Evidence families">
      <div className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/65">
        <div className="flex items-center gap-1.5"><RadioTower className="h-3 w-3" /> Evidence</div>
        <div className="mt-1.5 flex gap-1" aria-label={`${caseState.objectiveProgress} of 6 moves complete`}>
          {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < caseState.objectiveProgress ? 'bg-cyan-200' : 'bg-white/10'}`} />)}
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-5 gap-1.5">
        {EVIDENCE_FAMILIES.map(family => {
          const isLocked = locked.has(family);
          const isOffered = choosing && offered.has(family);
          const carried = caseState.carriedCharges[family] > 0;
          const content = (
            <>
              <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ color: COLOR[family], background: `${COLOR[family]}18` }}>
                <EvidenceFamilyIcon family={family} className="h-[18px] w-[18px]" strokeWidth={2.3} />
                {carried && !isLocked && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black bg-cyan-200" title="Carried from prior site" />}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[10px] font-bold text-white">{EVIDENCE_FAMILY_LABELS[family]}</span>
                <span className="block truncate text-[9px] text-white/55">{isLocked ? 'Evidence logged' : EVIDENCE_FAMILY_QUESTIONS[family]}</span>
              </span>
              {isLocked ? <Lock className="h-3 w-3 shrink-0 text-white/35" /> : <b className="font-mono text-xs text-white">{caseState.evidenceCharges[family]}</b>}
            </>
          );
          return isOffered ? (
            <button key={family} type="button" onClick={() => void onChoose(family)} className="flex min-w-0 items-center gap-1.5 rounded-xl border border-cyan-200/60 bg-cyan-100/10 px-1.5 transition hover:bg-cyan-100/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200" title={`Study ${EVIDENCE_FAMILY_LABELS[family]}`}>
              {content}
            </button>
          ) : (
            <div key={family} className={`flex min-w-0 items-center gap-1.5 rounded-xl border px-1.5 ${isLocked ? 'border-white/5 bg-white/[.025] opacity-60' : 'border-white/10 bg-white/[.04]'}`} title={isLocked ? `${EVIDENCE_FAMILY_LABELS[family]} evidence logged` : `${EVIDENCE_FAMILY_LABELS[family]} charge`}>
              {content}
            </div>
          );
        })}
      </div>
      {choosing && <p className="mb-0 mt-2 text-center text-[9px] font-semibold leading-tight text-cyan-100">Choose what to study</p>}
    </aside>
  );
}
