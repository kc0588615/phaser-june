import React, { useEffect, useMemo, useState } from 'react';
import { Check, Dna, Eye, Leaf, MapPin, Microscope, PawPrint, X } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { filterEliminatedCandidates } from '@/lib/runCaseState';
import { SpeciesGuessSelector } from '@/components/SpeciesGuessSelector';
import { METHOD_LABELS, getRunNodeLabel, type MethodType } from '@/expedition/domain';
import { METHOD_QUESTIONS } from '@/expedition/caseOffers';
import { METHOD_VERB_RULE_COPY, methodFrictionForObstacles } from '@/expedition/methodVerbs';
import { EVIDENCE_QUALITY_LABELS, evidenceLabelForMatchLength } from '@/expedition/evidenceQuality';
import { EVIDENCE_FAMILY_LABELS, EVIDENCE_FAMILY_QUESTIONS, type EvidenceFamily } from '@/expedition/evidenceFamilies';

interface Props {
  runState: RunState;
  onCommitInterpretation: (obsRef: string, predictedIds: number[]) => Promise<boolean>;
  onChooseMethod: (method: MethodType) => Promise<boolean>;
  onChooseEvidenceFamily: (family: EvidenceFamily) => Promise<boolean>;
  onGuess: (speciesId: number, evidenceRefs: string[]) => Promise<boolean | null>;
}

export function FieldNotebook({ runState, onCommitInterpretation, onChooseMethod, onChooseEvidenceFamily, onGuess }: Props) {
  const caseState = runState.caseState;
  const pending = caseState?.observations.find(item => item.ref === caseState.pendingInterpretationRef) ?? null;
  const latest = caseState?.observations.at(-1) ?? null;
  const latestInterpretation = latest ? caseState?.interpretations.find(item => item.obsRef === latest.ref) : null;
  const [predicted, setPredicted] = useState<Set<number>>(() => new Set());
  const [committing, setCommitting] = useState(false);
  const [choosing, setChoosing] = useState<MethodType | null>(null);
  const [choosingFamily, setChoosingFamily] = useState<EvidenceFamily | null>(null);
  const [cited, setCited] = useState<Set<string>>(() => new Set(caseState?.citedObservationRefs ?? []));
  useEffect(() => setCited(new Set(caseState?.citedObservationRefs ?? [])), [caseState?.citedObservationRefs]);

  const activeCandidates = useMemo(() => {
    if (!caseState) return [];
    return filterEliminatedCandidates(caseState.profiles, caseState.eliminatedIds);
  }, [caseState]);
  const eliminatedIds = useMemo(() => new Set(caseState?.eliminatedIds ?? []), [caseState?.eliminatedIds]);

  if (!caseState) return null;
  const currentNode = runState.expedition?.nodes[runState.currentNodeIndex];
  const selectedMethod = caseState.selectedMethods[runState.currentNodeIndex];
  const qualityLabel = evidenceLabelForMatchLength(caseState.bestTargetMatchLength);
  const interpretedRefs = new Set(caseState.interpretations.map(event => event.obsRef));
  const citable = caseState.observations.filter(observation => interpretedRefs.has(observation.ref));
  const requiredCitationCount = caseState.version === 2 ? Math.min(2, citable.length) : 0;
  const latestFieldNote = caseState.fieldNotes.at(-1) ?? null;

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

  const choose = async (method: MethodType) => {
    if (choosing) return;
    setChoosing(method);
    try { await onChooseMethod(method); }
    finally { setChoosing(null); }
  };

  const chooseFamily = async (family: EvidenceFamily) => {
    if (choosingFamily) return;
    setChoosingFamily(family);
    try { await onChooseEvidenceFamily(family); }
    finally { setChoosingFamily(null); }
  };

  return (
    <aside aria-label="Field notebook" className="absolute inset-x-2 bottom-2 z-panel pointer-events-none sm:inset-x-4">
      <GlassPanel className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-xl border-[rgba(167,145,92,.45)] bg-[linear-gradient(135deg,rgba(24,32,27,.97),rgba(20,27,24,.94))] p-0 shadow-2xl">
        <header className="flex items-center justify-between border-b border-[rgba(167,145,92,.25)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-ds-emerald" aria-hidden="true" />
            <div><div className="text-xs font-bold uppercase tracking-[.18em] text-[rgb(220,204,157)]">Field dossier</div><div className="text-[11px] text-ds-text-muted">Case {Math.min(runState.currentNodeIndex + 1, 3)} / 3 · {activeCandidates.length} live candidate{activeCandidates.length === 1 ? '' : 's'}</div></div>
          </div>
          {caseState.missedEvidenceNodeIndexes.length > 0 && <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">Evidence missed at site {caseState.missedEvidenceNodeIndexes.map(index => index + 1).join(', ')}</span>}
        </header>

        <div className="p-4">
          {caseState.stage === 'choose_method' && caseState.version === 2 ? (
            <section className="grid gap-4 md:grid-cols-[minmax(0,.8fr)_minmax(360px,1.4fr)]">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald"><MapPin className="h-3.5 w-3.5" /> {currentNode ? getRunNodeLabel({ nodeType: currentNode.node_type, waypoint: currentNode.waypoint }) : `Site ${runState.currentNodeIndex + 1}`}</div>
                <h2 className="mt-1 font-serif text-lg text-ds-text-primary">Choose the next field question.</h2>
                <p className="mt-2 text-xs leading-relaxed text-ds-text-muted">{currentNode?.rationale ?? 'Select the method that best fits this waypoint.'}</p>
                <p className="mt-3 text-[11px] text-ds-text-secondary">Used methods stay closed for this route. {activeCandidates.length} candidate{activeCandidates.length === 1 ? ' remains' : 's remain'}.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {caseState.offeredMethods?.map(method => {
                  const friction = methodFrictionForObstacles(method, currentNode?.obstacles);
                  return (
                  <button key={method} type="button" disabled={choosing !== null} onClick={() => void choose(method)} className="group min-h-28 rounded-lg border border-[rgba(167,145,92,.35)] bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.015))] p-3 text-left transition hover:-translate-y-0.5 hover:border-ds-emerald/60 hover:bg-ds-emerald/10 disabled:opacity-60">
                    <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.18em] text-[rgb(220,204,157)]"><span>{METHOD_LABELS[method]}</span><Microscope className="h-4 w-4 text-ds-emerald transition-transform group-hover:rotate-6" /></span>
                    <span className="mt-3 block font-serif text-sm leading-snug text-ds-text-primary">{METHOD_QUESTIONS[method]}</span>
                    <span className="mt-2 block text-[11px] leading-snug text-ds-text-secondary">{METHOD_VERB_RULE_COPY[method]}</span>
                    {friction && <span className="mt-1.5 block text-[10px] leading-snug text-amber-200/90">⚠ {friction}</span>}
                    <span className="mt-3 block text-[10px] text-ds-text-muted">{choosing === method ? 'Committing choice…' : 'Use this question'}</span>
                  </button>
                  );
                })}
                <p className="sm:col-span-2 text-[10px] leading-relaxed text-ds-text-muted">Sampling quality comes from your best first-swap match: 3 → Broad · 4 → Replicated · 5+ → High-resolution. Sharper samples narrow the case further.</p>
              </div>
            </section>
          ) : caseState.stage === 'choose_evidence' && caseState.version === 3 ? (
            <section className="grid gap-4 md:grid-cols-[minmax(0,.8fr)_minmax(360px,1.4fr)]">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald"><MapPin className="h-3.5 w-3.5" /> Site {runState.currentNodeIndex + 1} complete</div>
                <h2 className="mt-1 font-serif text-lg text-ds-text-primary">Choose what to investigate.</h2>
                <p className="mt-2 text-xs leading-relaxed text-ds-text-muted">Your direct matches steered these choices. Every clue has the same strength; the family changes what you learn.</p>
                <p className="mt-3 text-[11px] text-ds-text-secondary">{activeCandidates.length} candidates remain. Chosen families close for the rest of this route.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {caseState.offeredFamilies.map(family => (
                  <button key={family} type="button" disabled={choosingFamily !== null} onClick={() => void chooseFamily(family)} className="group min-h-24 rounded-lg border border-[rgba(167,145,92,.35)] bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.015))] p-3 text-left transition hover:-translate-y-0.5 hover:border-ds-emerald/60 hover:bg-ds-emerald/10 disabled:opacity-60">
                    <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.18em] text-[rgb(220,204,157)]"><span>{EVIDENCE_FAMILY_LABELS[family]}</span><FamilyIcon family={family} className="h-4 w-4 text-ds-emerald" /></span>
                    <span className="mt-2 block font-serif text-sm text-ds-text-primary">{EVIDENCE_FAMILY_QUESTIONS[family]}</span>
                    <span className="mt-2 block text-[10px] text-ds-text-muted">{choosingFamily === family ? 'Applying evidence…' : `${caseState.evidenceCharges[family]} matched gems`}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : caseState.version === 3 && caseState.stage === 'interpreting' && latest?.family ? (
            <section className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald"><FamilyIcon family={latest.family} className="h-3.5 w-3.5" /> {EVIDENCE_FAMILY_LABELS[latest.family]} evidence</div><p className="mt-1 font-serif text-base leading-relaxed text-ds-text-primary">“{latest.observationText}”</p></div>
              <div className="rounded-md border border-ds-subtle bg-black/15 p-3 text-xs text-ds-text-secondary"><div className="text-ds-emerald">{latest.actualEliminatedIds?.length ? `${latest.actualEliminatedIds.length} incompatible candidate${latest.actualEliminatedIds.length === 1 ? '' : 's'} removed.` : 'This clue supports the remaining candidates.'}</div><p className="mt-2">{caseState.travelEntry ?? 'Preparing the next research site…'}</p></div>
            </section>
          ) : pending ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,1.15fr)]">
              <section>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald"><span>{pending.method} observation</span>{pending.qualityTier && <QualityBadge tier={pending.qualityTier} />}</div>
                <p className="font-serif text-base leading-relaxed text-ds-text-primary">“{pending.observationText}”</p>
                <p className="mt-3 text-xs text-ds-text-muted">Predict which candidates this observation rules out. The interpretation is revealed only after your evidence is logged.</p>
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
                <Button type="button" onClick={commit} disabled={committing} className="mt-3 w-full">{committing ? 'Saving interpretation…' : 'Log evidence'}</Button>
              </fieldset>
            </div>
          ) : caseState.stage === 'guess' ? (
            <section className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
              <div><div className="text-[10px] font-semibold uppercase tracking-widest text-ds-emerald">Final deduction</div><h2 className="font-serif text-lg text-ds-text-primary">{caseState.version === 3 ? 'Name the animal.' : 'Cite the evidence, then name the animal.'}</h2><p className="mt-1 text-xs text-ds-text-muted">{caseState.version === 3 ? 'Use the three clues below. A wrong guess can be revised.' : `Cite exactly ${requiredCitationCount} evidence ${requiredCitationCount === 1 ? 'entry' : 'entries'}. Citations document the reasoning; they do not change the verdict or score.`}</p>
                {caseState.version === 3 && <div className="mt-3 grid gap-1.5">{caseState.observations.map(observation => observation.family && <div key={observation.ref} className="rounded-md border border-ds-subtle bg-black/10 px-2.5 py-2 text-xs text-ds-text-secondary"><span className="mr-2 font-semibold text-[rgb(220,204,157)]">{EVIDENCE_FAMILY_LABELS[observation.family]}</span>{observation.observationText}</div>)}</div>}
                {caseState.version === 2 && <div className="mt-3 grid gap-1.5">{citable.map(observation => { const selected = cited.has(observation.ref); const disabled = !selected && cited.size >= requiredCitationCount; return <button key={observation.ref} type="button" aria-pressed={selected} disabled={disabled} onClick={() => setCited(previous => { const next = new Set(previous); selected ? next.delete(observation.ref) : next.add(observation.ref); return next; })} className={cn('rounded-md border px-2.5 py-2 text-left text-xs transition', selected ? 'border-ds-emerald/60 bg-ds-emerald/10 text-ds-text-primary' : 'border-ds-subtle bg-black/10 text-ds-text-secondary', disabled && 'opacity-45')}><span className="mr-2 font-semibold">{selected ? 'Cited' : 'Evidence'}</span>{observation.method ? METHOD_LABELS[observation.method] : 'Evidence'}{observation.qualityTier ? ` · ${EVIDENCE_QUALITY_LABELS[observation.qualityTier]}` : ''}</button>; })}</div>}
                {caseState.fieldNotes.length > 0 && <div className="mt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-ds-text-muted">Candidate notes gathered</div>
                  <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
                    {caseState.fieldNotes.map(note => <li key={`${note.nodeIndex}:${note.speciesId}:${note.categoryName}:${note.text}`} className="text-[11px] leading-snug text-ds-text-secondary">{note.icon} <span className="font-semibold text-ds-text-primary">{note.speciesName}</span> — {note.text}</li>)}
                  </ul>
                </div>}
              </div>
              <div><SpeciesGuessSelector candidates={activeCandidates} onGuess={(speciesId) => onGuess(speciesId, [...cited])} disabled={caseState.version === 2 && cited.size !== requiredCitationCount} />{caseState.lastFeedback?.map(item => <p key={`${item.category}:${item.message}`} className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-100">{item.message}</p>)}</div>
            </section>
          ) : caseState.stage === 'board' ? <section className="flex items-center justify-between gap-4"><div><div className="text-[10px] font-semibold uppercase tracking-widest text-ds-emerald">{caseState.version === 3 ? `Research site ${runState.currentNodeIndex + 1}` : `${selectedMethod ? METHOD_LABELS[selectedMethod] : 'Research'} question`}</div><p className="font-serif text-sm text-ds-text-primary">{caseState.version === 3 ? 'Make six matches. Directly cleared gems steer your evidence choices.' : selectedMethod ? METHOD_QUESTIONS[selectedMethod] : 'Complete the method objective to earn evidence.'}</p>{caseState.version === 2 && selectedMethod && <p className="mt-1 text-[11px] text-ds-text-secondary">{METHOD_VERB_RULE_COPY[selectedMethod]}</p>}<p className="mt-1 text-[11px] text-ds-text-muted">{caseState.version === 3 ? 'Moves' : 'Objective'} {caseState.objectiveProgress} / {caseState.objectiveTarget}</p>{latestFieldNote && caseState.version !== 3 && <p className="mt-1 text-[11px] text-[rgb(220,204,157)]">{latestFieldNote.icon} {latestFieldNote.speciesName}: {latestFieldNote.text}</p>}</div>{caseState.version === 2 && <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-ds-text-muted">Sampling quality</div><div className="mt-1 text-sm font-semibold text-[rgb(220,204,157)]">{qualityLabel ?? 'No target match yet'}</div></div>}</section>
          : latest && latestInterpretation ? (
            <section className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ds-emerald"><span>Interpretation saved</span>{latest.qualityTier && <QualityBadge tier={latest.qualityTier} />}</div><p className="font-serif text-sm text-ds-text-primary">{latest.inferenceText}</p><p className="mt-2 text-[11px] text-ds-text-muted">Trait: {latest.traitCategory?.replace('_', ' ')} · marker: <code>{latest.compareTag}</code></p></div>
              <div className="rounded-md border border-ds-subtle bg-black/15 p-3 text-xs"><div className={latestInterpretation.correct ? 'text-ds-emerald' : 'text-amber-200'}>{latestInterpretation.actualEliminatedIds.length === 0 ? 'Evidence corroborated the live candidates.' : latestInterpretation.correct ? 'Prediction matched the evidence.' : 'Prediction revised.'}</div><div className="mt-2 flex gap-4 text-ds-text-secondary"><span>Predicted {latestInterpretation.predictedEliminatedIds.length}</span><span>Actual {latestInterpretation.actualEliminatedIds.length}</span></div><div className="mt-2 flex items-center gap-1 text-ds-text-muted"><Check className="h-3.5 w-3.5" /> Preparing the next site…</div></div>
            </section>
          )
          : <p className="text-sm text-ds-text-muted">{caseState.nodeOutcomes[runState.currentNodeIndex] === 'failed' ? 'Objective missed. No evidence issued; the expedition continues.' : 'Objective met. Preparing the evidence record…'}</p>}
        </div>
      </GlassPanel>
    </aside>
  );
}

function QualityBadge({ tier }: { tier: 1 | 2 | 3 }) {
  return <span className="rounded-full border border-[rgba(167,145,92,.4)] bg-[rgba(167,145,92,.12)] px-2 py-0.5 text-[9px] tracking-wide text-[rgb(230,215,170)]">{EVIDENCE_QUALITY_LABELS[tier]}</span>;
}

function FamilyIcon({ family, className }: { family: EvidenceFamily; className?: string }) {
  const Icon = family === 'relatives' ? Dna : family === 'body' ? PawPrint : family === 'behavior' ? Eye : family === 'habits' ? Leaf : MapPin;
  return <Icon className={className} aria-hidden="true" />;
}
