import { useRef, useState } from 'react';
import type { ClaimInput } from '@/lib/liveClaims';
import type { RunState } from '@/types/expedition';

/** Claims stay available alongside fieldwork; a confirmed row never asks again. */
export function CaseClaimsPanel({ runState, onSubmit }: {
  runState: RunState;
  onSubmit: (input: ClaimInput) => Promise<boolean | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [explanationId, setExplanationId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const state = runState.caseState;
  if (!state) return null;
  const { claims, hypotheses, mystery } = state;
  const open = expanded || state.stage === 'claims_only';
  const name = (id: number) => state.profiles.find(profile => profile.speciesId === id)?.commonName ?? 'Unknown species';
  async function submit(input: ClaimInput) {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage('Checking the field record…');
    try {
      const correct = await onSubmit(input);
      setMessage(correct === null ? 'Not saved. Retry the same claim.' : correct ? 'Claim confirmed. Continue the other investigation.' : 'Not supported. Gather evidence and revise.');
    } catch { setMessage('Not saved. Retry the same claim.'); }
    finally { busy.current = false; setPending(false); }
  }
  const chip = 'min-h-10 rounded-md border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45';
  return (
    <section aria-label="Live case claims" className="absolute bottom-3 left-3 z-[90] w-[min(440px,calc(100%-24px))] rounded-xl border border-amber-100/25 bg-[#15231f] text-[#f5ead0] shadow-xl">
      <button type="button" aria-expanded={open} aria-controls="case-claims-content" onClick={() => setExpanded(value => !value)}
        style={{ padding: '12px 16px' }} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left">
        <span className="font-serif text-base">Field claims <span className="ml-2 font-sans text-[10px] uppercase tracking-widest text-amber-100/60">{claims.species === 'locked' ? 'Species confirmed' : 'Species open'} · {claims.explanation === 'locked' ? 'Explanation confirmed' : 'Explanation open'}</span></span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div id="case-claims-content" style={{ padding: 16 }} className="max-h-[60dvh] overflow-y-auto border-t border-amber-100/15 p-4">
        <div style={{ marginBottom: 16 }} className="mb-4 flex items-center justify-between gap-3 text-xs text-amber-100/75">
          <span>Three unsupported claims close the case without a discovery.</span>
          <span aria-label={`${claims.wrongClaims} unsupported claims`} className="flex shrink-0 gap-1.5">
            {['first', 'second', 'third'].map((key, i) => <span key={key} aria-hidden="true" className={`h-2.5 w-2.5 rounded-full border border-amber-100/50 ${i < claims.wrongClaims ? 'bg-red-300' : 'bg-transparent'}`} />)}
          </span>
        </div>
        <fieldset disabled={pending} className="m-0 border-0 p-0">
          <legend style={{ marginBottom: 8 }} className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">Which species?</legend>
          {claims.species === 'locked' ? <p style={{ padding: 12 }} className="m-0 rounded-md bg-emerald-200/10 p-3 text-sm">Confirmed · {name(claims.lockedSpeciesId!)}</p> : <>
            <div className="grid grid-cols-2 gap-2">
              {state.candidateIds.map(id => <button key={id} type="button" aria-pressed={speciesId === id} disabled={state.eliminatedIds.includes(id)}
                onClick={() => setSpeciesId(id)} style={{ padding: '10px 12px' }} className={`${chip} ${speciesId === id ? 'border-amber-100 bg-amber-100/15' : 'border-white/15'} ${state.eliminatedIds.includes(id) ? 'line-through' : ''}`}>
                {name(id)}{state.eliminatedIds.includes(id) && <span className="sr-only"> — ruled out</span>}
              </button>)}
            </div>
            <button type="button" disabled={speciesId === null || state.eliminatedIds.includes(speciesId)} onClick={() => speciesId !== null && void submit({ claim: 'species', speciesId })}
              style={{ marginTop: 8, padding: '10px 16px' }} className="mt-2 min-h-10 rounded-md bg-amber-100 px-4 text-xs font-bold text-[#15231f] disabled:opacity-40">Confirm species</button>
          </>}
        </fieldset>
        <fieldset disabled={pending} style={{ marginTop: 20 }} className="m-0 mt-5 border-0 p-0">
          <legend style={{ marginBottom: 8 }} className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-200">What explains the evidence?</legend>
          {claims.explanation === 'locked' ? <p style={{ padding: 12 }} className="m-0 rounded-md bg-emerald-200/10 p-3 text-sm">Confirmed · {mystery.explanationChoices.find(c => c.id === claims.lockedExplanationId)?.label}</p> : <>
            <div className="flex flex-col gap-2">
              {mystery.explanationChoices.map(choice => <button key={choice.id} type="button" aria-pressed={explanationId === choice.id} disabled={hypotheses[choice.id] === 'contradicted'}
                onClick={() => setExplanationId(choice.id)} style={{ padding: '10px 12px' }} className={`${chip} ${explanationId === choice.id ? 'border-amber-100 bg-amber-100/15' : 'border-white/15'}`}>
                <span className="flex justify-between gap-2 font-semibold"><span>{choice.label}</span><span className="text-[10px] uppercase tracking-wide">{hypotheses[choice.id] ?? 'open'}</span></span>
                <span className="mt-1 block text-white/65">{choice.description}</span>
              </button>)}
            </div>
            <button type="button" disabled={!explanationId || hypotheses[explanationId] === 'contradicted'} onClick={() => explanationId && void submit({ claim: 'explanation', explanationId })}
              style={{ marginTop: 8, padding: '10px 16px' }} className="mt-2 min-h-10 rounded-md bg-amber-100 px-4 text-xs font-bold text-[#15231f] disabled:opacity-40">Confirm explanation</button>
          </>}
          {Object.entries(state.explanationFeedback).map(([id, text]) => <p key={id} style={{ marginTop: 8, paddingLeft: 8 }} className="mb-0 mt-2 border-l-2 border-amber-200/60 pl-2 text-xs leading-relaxed text-amber-100/80">{text}</p>)}
        </fieldset>
        <p role="status" style={{ marginTop: 12 }} className="mb-0 mt-3 text-xs text-emerald-100">{message || 'Keep matching to investigate. Submit either claim when ready.'}</p>
      </div>}
    </section>
  );
}
