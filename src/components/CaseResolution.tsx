import { BookOpen, ExternalLink, GitBranch, Leaf, ShieldAlert } from 'lucide-react';
import type { MysteryResolution, PublicMysteryCase } from '@/lib/mysteryCase';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { ReactNode } from 'react';

export function CaseResolution({ mystery, resolution, explanationId }: {
  mystery: PublicMysteryCase;
  resolution: MysteryResolution;
  explanationId: string | null;
}) {
  const explanation = mystery.explanationChoices.find(choice => choice.id === explanationId);
  return (
    <GlassPanel className="w-full max-w-[420px] overflow-hidden rounded-2xl border-emerald-100/20 p-0">
      <div className="border-b border-white/10 bg-[linear-gradient(110deg,rgba(22,82,65,.34),rgba(89,71,30,.2))] px-4 py-4">
        <p className="m-0 font-mono text-[8px] font-bold uppercase tracking-[.2em] text-emerald-100/55">Case resolved · {mystery.title}</p>
        <h2 className="m-0 mt-2 font-serif text-xl font-semibold leading-tight text-[#f4ead0]">{resolution.headline}</h2>
        {explanation && <p className="m-0 mt-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-emerald-200/70">Diagnosis: {explanation.label}</p>}
        <p className="m-0 mt-3 text-xs leading-relaxed text-white/68">{resolution.diagnosis}</p>
      </div>

      <div className="grid gap-3 p-4">
        <ResolutionBlock icon={GitBranch} label="Evidence chain">
          <ol className="m-0 grid gap-1.5 pl-4 text-[11px] leading-relaxed text-white/60">
            {resolution.evidenceChain.map(item => <li key={item}>{item}</li>)}
          </ol>
        </ResolutionBlock>
        <ResolutionBlock icon={Leaf} label="Ecological role">
          <p className="m-0 text-[11px] leading-relaxed text-white/60">{resolution.ecologicalRole}</p>
        </ResolutionBlock>
        <ResolutionBlock icon={BookOpen} label="Taxonomy">
          <p className="m-0 text-[11px] leading-relaxed text-white/60">{resolution.taxonomy}</p>
        </ResolutionBlock>
        <ResolutionBlock icon={ShieldAlert} label="Misconception check">
          <p className="m-0 text-[11px] leading-relaxed text-amber-50/65">{resolution.misconception}</p>
          <ul className="m-0 mt-2 grid gap-1 pl-4 text-[10px] leading-relaxed text-white/45">
            {resolution.rejectedAlternatives.map(item => <li key={item}>{item}</li>)}
          </ul>
        </ResolutionBlock>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
        {resolution.sources.map(source => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-cyan-100/15 bg-cyan-100/[.05] px-2.5 py-1 font-mono text-[7px] font-semibold uppercase tracking-[.1em] text-cyan-100/60 transition hover:border-cyan-100/35 hover:text-cyan-50"
          >
            {source.label}
            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
          </a>
        ))}
      </div>
    </GlassPanel>
  );
}

function ResolutionBlock({ icon: Icon, label, children }: {
  icon: typeof BookOpen;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/[.07] bg-black/15 p-3">
      <h3 className="m-0 mb-2 flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[.17em] text-cyan-100/55">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </h3>
      {children}
    </section>
  );
}
