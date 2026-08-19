import React, { useMemo, useState } from 'react';
import { Dna, Eye, Leaf, MapPin, PawPrint } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import { GlassPanel } from '@/components/ui/glass-panel';
import { filterEliminatedCandidates } from '@/lib/runCaseState';
import { EVIDENCE_FAMILY_LABELS, EVIDENCE_FAMILY_QUESTIONS, type EvidenceFamily } from '@/expedition/evidenceFamilies';

interface Props {
  runState: RunState;
  onChooseEvidenceFamily: (family: EvidenceFamily) => Promise<boolean>;
}

/** Evidence-family choice panel, shown when a site's six moves are logged. */
export function FieldNotebook({ runState, onChooseEvidenceFamily }: Props) {
  const caseState = runState.caseState;
  const [choosingFamily, setChoosingFamily] = useState<EvidenceFamily | null>(null);

  const activeCandidates = useMemo(() => {
    if (!caseState) return [];
    return filterEliminatedCandidates(caseState.profiles, caseState.eliminatedIds);
  }, [caseState]);

  if (!caseState || caseState.stage !== 'choose_evidence') return null;

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
        </header>

        <div className="p-4">
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
        </div>
      </GlassPanel>
    </aside>
  );
}

function FamilyIcon({ family, className }: { family: EvidenceFamily; className?: string }) {
  const Icon = family === 'relatives' ? Dna : family === 'body' ? PawPrint : family === 'behavior' ? Eye : family === 'habits' ? Leaf : MapPin;
  return <Icon className={className} aria-hidden="true" />;
}
