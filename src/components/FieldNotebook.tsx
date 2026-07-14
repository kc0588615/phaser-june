import React, { useMemo, useState } from 'react';
import { Check, Leaf, X } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { filterEliminatedCandidates } from '@/lib/runCaseState';
import { SpeciesGuessSelector } from '@/components/SpeciesGuessSelector';

interface Props {
  runState: RunState;
  onCommitInterpretation: (obsRef: string, predictedIds: number[]) => Promise<boolean>;
  onGuess: (speciesId: number) => Promise<boolean | null>;
}

export function FieldNotebook({ runState, onCommitInterpretation, onGuess }: Props) {
  const caseState = runState.caseState;
  const pending = caseState?.observations.find(item => item.ref === caseState.pendingInterpretationRef) ?? null;
  const latest = caseState?.observations.at(-1) ?? null;
  const latestInterpretation = latest ? caseState?.interpretations.find(item => item.obsRef === latest.ref) : null;
  const [predicted, setPredicted] = useState<Set<number>>(new Set());
  const [committing, setCommitting] = useState(false);

  const activeCandidates = useMemo(() => {
    if (!caseState) return [];
    return filterEliminatedCandidates(caseState.profiles, caseState.eliminatedIds);
  }, [caseState]);
  const eliminatedIds = useMemo(() => new Set(caseState?.eliminatedIds ?? []), [caseState?.eliminatedIds]);

  if (!caseState) return null;

  const commit = async () => {
    if (!pending || committing) return;
    setCommitting(true);
    try {
      // Keep the player's marked predictions when the save fails, so retry is free.
      const saved = await onCommitInterpretation(pending.ref, [...predicted]);
      if (saved) setPredicted(new Set());
    }
    finally { setCommitting(false); }
  };

  return (
    <aside aria-label="Field notebook" className="absolute inset-x-2 bottom-2 z-panel pointer-events-none sm:inset-x-4">
      <GlassPanel className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-xl border-[rgba(167,145,92,.45)] bg-[linear-gradient(135deg,rgba(24,32,27,.97),rgba(20,27,24,.94))] p-0 shadow-2xl">
        <header className="flex items-center justify-between border-b border-[rgba(167,145,92,.25)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-ds-emerald" aria-hidden="true" />
            <div><div className="text-xs font-bold uppercase tracking-[.18em] text-[rgb(220,204,157)]">Field dossier</div><div className="text-[11px] text-ds-text-muted">Case {Math.min(runState.currentNodeIndex + 1, 3)} / 3 · {activeCandidates.length} live candidates</div></div>
          </div>
          {caseState.missedEvidenceNodeIndexes.length > 0 && <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">Evidence missed at site {caseState.missedEvidenceNodeIndexes.map(index => index + 1).join(', ')}</span>}
        </header>

        <div className="p-4">
          {pending ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,1.15fr)]">
              <section>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald">{pending.method} observation</div>
                <p className="font-serif text-base leading-relaxed text-ds-text-primary">“{pending.observationText}”</p>
                <p className="mt-3 text-xs text-ds-text-muted">Predict which candidates this observation rules out. The interpretation is revealed only after your field note is saved.</p>
              </section>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-ds-text-secondary">Mark candidates to eliminate</legend>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {caseState.profiles.map(profile => {
                    const selected = predicted.has(profile.speciesId);
                    const alreadyEliminated = eliminatedIds.has(profile.speciesId);
                    return <button key={profile.speciesId} type="button" aria-pressed={selected} disabled={alreadyEliminated} onClick={() => setPredicted(previous => { const next = new Set(previous); selected ? next.delete(profile.speciesId) : next.add(profile.speciesId); return next; })} className={cn('min-h-11 rounded-md border px-2 py-1.5 text-left text-xs transition-colors', alreadyEliminated ? 'border-ds-subtle bg-black/10 text-ds-text-muted opacity-55 line-through' : selected ? 'border-amber-400/70 bg-amber-400/15 text-amber-100' : 'border-ds-subtle bg-white/[.03] text-ds-text-primary hover:bg-white/[.08]')}>
                      <span className="flex items-center gap-1.5">{selected ? <X className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-sm border border-current opacity-50" />}<span>{profile.commonName}</span></span>
                    </button>;
                  })}
                </div>
                <Button type="button" onClick={commit} disabled={committing} className="mt-3 w-full">{committing ? 'Saving interpretation…' : 'Commit field note'}</Button>
              </fieldset>
            </div>
          ) : caseState.stage === 'guess' ? (
            <section className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <div><div className="text-[10px] font-semibold uppercase tracking-widest text-ds-emerald">Final deduction</div><h2 className="font-serif text-lg text-ds-text-primary">Name the animal behind the evidence.</h2><p className="mt-1 text-xs text-ds-text-muted">Crossed-out candidates remain in the dossier for context; only live candidates can be identified.</p></div>
              <div><SpeciesGuessSelector candidates={activeCandidates} onGuess={onGuess} />{caseState.lastFeedback?.map(item => <p key={`${item.category}:${item.message}`} className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">{item.message}</p>)}</div>
            </section>
          ) : latest && latestInterpretation ? (
            <section className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div><div className="text-[10px] font-semibold uppercase tracking-widest text-ds-emerald">Interpretation saved</div><p className="font-serif text-sm text-ds-text-primary">{latest.inferenceText}</p><p className="mt-2 text-[11px] text-ds-text-muted">Trait: {latest.traitCategory?.replace('_', ' ')} · marker: <code>{latest.compareTag}</code></p></div>
              <div className="rounded-md border border-ds-subtle bg-black/15 p-3 text-xs"><div className={latestInterpretation.correct ? 'text-ds-emerald' : 'text-amber-200'}>{latestInterpretation.correct ? 'Prediction matched the evidence.' : 'Prediction revised.'}</div><div className="mt-2 flex gap-4 text-ds-text-secondary"><span>Predicted {latestInterpretation.predictedEliminatedIds.length}</span><span>Actual {latestInterpretation.actualEliminatedIds.length}</span></div><div className="mt-2 flex items-center gap-1 text-ds-text-muted"><Check className="h-3.5 w-3.5" /> Preparing the next site…</div></div>
            </section>
          ) : <p className="text-sm text-ds-text-muted">Complete the method objective to earn evidence. A failed site leaves a gap in the dossier, but the expedition continues.</p>}
        </div>
      </GlassPanel>
    </aside>
  );
}
