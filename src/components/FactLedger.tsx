import { ListChecks } from 'lucide-react';
import { EVIDENCE_FAMILIES, EVIDENCE_FAMILY_LABELS, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { ladderCategoryLabel } from '@/lib/evidenceLadder';
import type { CaseState, LedgerFact } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

/**
 * Live deduction ledger: every fact a match has spoken, filed under its family and
 * trait category, with the candidates it ruled out. Updates on every accepted move
 * so the player learns which category each fact belongs to while playing.
 */
export function FactLedger({
  caseState,
  variant = 'detail',
  className = '',
}: {
  caseState: CaseState;
  variant?: 'compact' | 'detail';
  className?: string;
}) {
  const nameById = new Map(caseState.profiles.map(profile => [profile.speciesId, profile.commonName]));
  const byFamily = groupByFamily(caseState.factLedger);
  const total = caseState.factLedger.length;
  const ruledOut = new Set(caseState.factLedger.flatMap(fact => fact.eliminatedIds)).size;

  if (variant === 'compact') {
    return (
      <section className={`min-w-0 ${className}`} aria-label="Fact ledger">
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.035] px-2 py-1 text-[10px] text-white/70">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-emerald-200/70" aria-hidden="true" />
          <b className="shrink-0 uppercase tracking-[.13em] text-emerald-100/70">Ledger</b>
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {EVIDENCE_FAMILIES.map(family => {
              const facts = byFamily[family];
              const latest = facts.at(-1);
              const rungTotal = latest?.rungTotal ?? 0;
              return (
                <span
                  key={family}
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${facts.length > 0 ? 'border-emerald-200/35 bg-emerald-300/10 text-emerald-50' : 'border-white/10 text-white/40'}`}
                  title={latest ? `${EVIDENCE_FAMILY_LABELS[family]} · ${ladderCategoryLabel(latest.traitCategory)}: ${latest.factText}` : `${EVIDENCE_FAMILY_LABELS[family]}: no facts yet`}
                >
                  <EvidenceFamilyIcon family={family} className="h-3 w-3" strokeWidth={2.4} />
                  <span className="hidden sm:inline">{latest ? ladderCategoryLabel(latest.traitCategory) : EVIDENCE_FAMILY_LABELS[family]}</span>
                  <span className="flex gap-px" aria-label={`${facts.length} of ${rungTotal || '?'} facts`}>
                    {Array.from({ length: Math.max(rungTotal, facts.length, 3) }, (_, index) => (
                      <span key={index} className={`h-1.5 w-1.5 rounded-full ${index < facts.length ? 'bg-emerald-300' : 'bg-white/15'}`} />
                    ))}
                  </span>
                </span>
              );
            })}
          </span>
          <span className="shrink-0 text-white/50">{total} fact{total === 1 ? '' : 's'} · {ruledOut} out</span>
        </div>
      </section>
    );
  }

  return (
    <section className={`min-w-0 ${className}`} aria-label="Fact ledger">
      <header className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-emerald-100/70">
        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
        Fact ledger · {total} spoken · {ruledOut} ruled out
      </header>
      {total === 0 && (
        <p className="m-0 rounded-lg border border-white/10 bg-white/[.035] px-2.5 py-1.5 text-[10px] text-white/55">
          Match a colour to make its family speak. Each fact is filed by category and rules out the animals it cannot fit.
        </p>
      )}
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {EVIDENCE_FAMILIES.map(family => {
          const facts = byFamily[family];
          if (facts.length === 0) return null;
          const category = ladderCategoryLabel(facts[0].traitCategory);
          return (
            <li key={family} className="rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.13em] text-cyan-100/70">
                <EvidenceFamilyIcon family={family} className="h-3.5 w-3.5" strokeWidth={2.4} />
                {EVIDENCE_FAMILY_LABELS[family]} · <span className="text-emerald-200/80">{category}</span>
                <span className="ml-auto font-mono normal-case tracking-normal text-white/45">{facts.length}/{facts[0].rungTotal}</span>
              </div>
              <ol className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                {facts.map(fact => (
                  <li key={`${fact.family}-${fact.rung}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5 text-[10px] leading-snug">
                    <span className="mt-px font-mono text-emerald-200/80">{fact.rung + 1}.</span>
                    <span className="min-w-0">
                      <span className="block text-white/85">{fact.factText}</span>
                      {fact.explanationNote && <span className="block text-amber-100/80">{fact.explanationNote}</span>}
                      <span className={`block ${fact.eliminatedIds.length ? 'text-red-200/75' : 'text-white/40'}`}>
                        {fact.eliminatedIds.length
                          ? `Ruled out: ${fact.eliminatedIds.map(id => nameById.get(id) ?? `#${id}`).join(', ')}`
                          : 'Nothing new ruled out.'}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function groupByFamily(facts: readonly LedgerFact[]): Record<EvidenceFamily, LedgerFact[]> {
  const grouped = Object.fromEntries(EVIDENCE_FAMILIES.map(family => [family, [] as LedgerFact[]])) as Record<EvidenceFamily, LedgerFact[]>;
  for (const fact of facts) grouped[fact.family].push(fact);
  for (const family of EVIDENCE_FAMILIES) grouped[family].sort((a, b) => a.rung - b.rung);
  return grouped;
}
