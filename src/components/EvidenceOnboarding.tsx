import { useEffect, useState } from 'react';
import { Radio, UsersRound } from 'lucide-react';
import { EVIDENCE_FAMILIES, EVIDENCE_FAMILY_LABELS, EVIDENCE_FAMILY_QUESTIONS } from '@/expedition/evidenceFamilies';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

const STORAGE_KEY = 'expedition-evidence-onboarding-v3';

export function EvidenceOnboarding() {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    try { setStep(localStorage.getItem(STORAGE_KEY) ? null : 0); } catch { setStep(0); }
  }, []);
  if (step === null) return null;

  const family = step < EVIDENCE_FAMILIES.length ? EVIDENCE_FAMILIES[step] : null;
  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'seen'); } catch { /* optional preference only */ }
    setStep(null);
  };
  const isLast = step === EVIDENCE_FAMILIES.length + 1;

  return (
    <section className="absolute inset-0 z-[90] grid place-items-center bg-[rgba(3,10,13,.78)] p-5 backdrop-blur-sm" aria-label="How to investigate">
      <div className="w-full max-w-sm rounded-[28px] border border-cyan-100/20 bg-[rgb(9,24,27)] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,.65)]">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-200/60">Field training · {step + 1}/7</p>
        {family ? (
          <>
            <div className="mx-auto my-5 grid h-24 w-24 place-items-center rounded-[30px] border border-white/15 bg-gradient-to-br from-cyan-100/15 to-emerald-100/5 text-cyan-100">
              <EvidenceFamilyIcon family={family} className="h-14 w-14" strokeWidth={1.7} />
            </div>
            <h2 className="m-0 font-serif text-3xl text-white">{EVIDENCE_FAMILY_LABELS[family]}</h2>
            <p className="mb-2 mt-3 font-serif text-lg text-cyan-50">“{EVIDENCE_FAMILY_QUESTIONS[family]}”</p>
            <p className="m-0 text-sm leading-relaxed text-white/55">Match this silhouette to steer the investigation toward {EVIDENCE_FAMILY_LABELS[family].toLowerCase()} evidence.</p>
          </>
        ) : step === EVIDENCE_FAMILIES.length ? (
          <>
            <Radio className="mx-auto my-7 h-20 w-20 text-cyan-200" strokeWidth={1.5} />
            <h2 className="m-0 font-serif text-2xl text-white">Hear the field team</h2>
            <p className="mb-3 mt-4 text-sm leading-relaxed text-white/65">The ticker is your field radio — snippets from the research team arrive as your matches clear.</p>
          </>
        ) : (
          <>
            <UsersRound className="mx-auto my-7 h-20 w-20 text-amber-200" strokeWidth={1.5} />
            <h2 className="m-0 font-serif text-2xl text-white">Narrow the roster</h2>
            <p className="mb-3 mt-4 text-sm leading-relaxed text-white/65">These are the six species we’re considering. Evidence crosses them off; at the end, tap one that remains.</p>
          </>
        )}
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={finish} className="rounded-xl px-3 py-2 text-xs font-semibold text-white/45 hover:text-white">Skip</button>
          <button type="button" onClick={() => isLast ? finish() : setStep(step + 1)} className="flex-1 rounded-xl border border-cyan-100/25 bg-cyan-200 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-white">
            {isLast ? 'Start investigating' : 'Next'}
          </button>
        </div>
      </div>
    </section>
  );
}
