import { useEffect, useMemo, useState } from 'react';
import { Check, CircleAlert, ClipboardCheck, Microscope, Send } from 'lucide-react';
import type { RunState } from '@/types/expedition';

export function CaseDiagnosisPanel({ runState, onSubmit }: {
  runState: RunState;
  onSubmit: (speciesId: number, explanationId: string) => Promise<boolean | null>;
}) {
  const caseState = runState.caseState;
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [explanationId, setExplanationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const activeProfiles = useMemo(() => {
    const eliminated = new Set(caseState?.eliminatedIds ?? []);
    return caseState?.profiles.filter(profile => !eliminated.has(profile.speciesId)) ?? [];
  }, [caseState]);

  useEffect(() => {
    if (speciesId !== null && !activeProfiles.some(profile => profile.speciesId === speciesId)) setSpeciesId(null);
  }, [activeProfiles, speciesId]);

  if (!caseState) return null;
  const feedback = caseState.diagnosisFeedback;
  const canSubmit = speciesId !== null && explanationId !== null && !submitting;
  const submit = async () => {
    if (!canSubmit || speciesId === null || explanationId === null) return;
    setSubmitting(true);
    try { await onSubmit(speciesId, explanationId); } finally { setSubmitting(false); }
  };

  return (
    <div className="absolute inset-0 z-[72] overflow-y-auto bg-[linear-gradient(135deg,rgba(3,13,15,.97),rgba(17,20,16,.96))] px-3 py-4 backdrop-blur-md sm:px-5 sm:py-6">
      <section role="dialog" aria-modal="true" aria-labelledby="diagnosis-title" className="mx-auto w-full max-w-4xl">
        <header className="mb-4 flex flex-col gap-2 border-b border-amber-100/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[.22em] text-amber-100/55">
              <ClipboardCheck className="h-4 w-4 text-amber-200" aria-hidden="true" />
              Final field diagnosis
            </p>
            <h1 id="diagnosis-title" className="m-0 mt-2 font-serif text-2xl font-semibold text-[#f5ead0] sm:text-3xl">{caseState.mystery.title}</h1>
          </div>
          <p className="m-0 max-w-md text-xs leading-relaxed text-white/55">Name the species and explain the incident. Both claims must be supported.</p>
        </header>

        {feedback && (
          <div className="mb-4 rounded-2xl border border-amber-200/20 bg-amber-950/20 p-3" role="status">
            <div className="flex flex-wrap gap-2">
              <VerdictPill label="Species" verdict={feedback.speciesVerdict} />
              <VerdictPill label="Explanation" verdict={feedback.explanationVerdict} />
            </div>
            <p className="m-0 mt-2 text-xs leading-relaxed text-amber-50/75">{feedback.explanationText}</p>
            {caseState.lastFeedback?.map((item, index) => (
              <p key={`${item.category}-${index}`} className="m-0 mt-1.5 text-[11px] leading-relaxed text-white/55">{item.message}</p>
            ))}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[.9fr_1.1fr]">
          <fieldset className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
            <legend className="px-2 font-mono text-[9px] font-bold uppercase tracking-[.18em] text-cyan-100/60">1 · Species involved</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {activeProfiles.map(profile => {
                const selected = speciesId === profile.speciesId;
                return (
                  <button
                    key={profile.speciesId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSpeciesId(profile.speciesId)}
                    className={`relative min-h-16 rounded-xl border px-3 py-2 text-left transition ${selected ? 'border-cyan-200 bg-cyan-100/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(165,243,252,.18)]' : 'border-white/10 bg-white/[.035] text-white/70 hover:border-cyan-100/35 hover:bg-cyan-100/[.06]'}`}
                  >
                    <span className="block text-xs font-bold leading-tight">{profile.commonName}</span>
                    <span className="mt-1 block truncate font-serif text-[10px] italic text-white/40">{profile.scientificName}</span>
                    {selected && <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-cyan-200 text-slate-950"><Check className="h-3 w-3" aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
            <legend className="px-2 font-mono text-[9px] font-bold uppercase tracking-[.18em] text-emerald-100/60">2 · Best explanation</legend>
            <div className="mt-1 grid gap-2">
              {caseState.mystery.explanationChoices.map(choice => {
                const selected = explanationId === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setExplanationId(choice.id)}
                    className={`relative rounded-xl border px-3 py-2.5 pr-9 text-left transition ${selected ? 'border-emerald-200 bg-emerald-100/15 text-emerald-50 shadow-[inset_0_0_0_1px_rgba(167,243,208,.16)]' : 'border-white/10 bg-white/[.035] text-white/70 hover:border-emerald-100/35 hover:bg-emerald-100/[.06]'}`}
                  >
                    <span className="block text-xs font-bold">{choice.label}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-white/48">{choice.description}</span>
                    {selected && <span className="absolute right-3 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-emerald-200 text-slate-950"><Check className="h-3 w-3" aria-hidden="true" /></span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 flex items-start gap-2 text-[10px] leading-relaxed text-white/45 sm:max-w-lg">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/70" aria-hidden="true" />
            An unsupported submission reduces the remaining diagnosis bonus. Correct answers are never exposed after an incomplete verdict.
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full border border-emerald-100/20 bg-[linear-gradient(100deg,#83e4bf,#88dceb)] px-5 py-3 text-xs font-black uppercase tracking-[.09em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {submitting ? <Microscope className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {submitting ? 'Checking…' : 'Submit diagnosis'}
          </button>
        </div>
      </section>
    </div>
  );
}

function VerdictPill({ label, verdict }: { label: string; verdict: 'supported' | 'revise' }) {
  const supported = verdict === 'supported';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[.14em] ${supported ? 'border-emerald-200/25 bg-emerald-100/10 text-emerald-100' : 'border-amber-200/25 bg-amber-100/10 text-amber-100'}`}>
      {supported ? <Check className="h-3 w-3" aria-hidden="true" /> : <CircleAlert className="h-3 w-3" aria-hidden="true" />}
      {label}: {supported ? 'supported' : 'revise'}
    </span>
  );
}
