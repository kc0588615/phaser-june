import { ArrowRight, FileSearch, MapPin } from 'lucide-react';
import type { PublicMysteryCase } from '@/lib/mysteryCase';

export function CaseIncidentIntro({ mystery, onContinue }: {
  mystery: PublicMysteryCase;
  onContinue: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[72] grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_20%_10%,rgba(36,112,98,.24),transparent_38%),rgba(4,11,13,.94)] px-4 py-6 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-incident-title"
        className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-amber-100/20 bg-[linear-gradient(145deg,rgba(23,35,32,.98),rgba(8,20,22,.98))] shadow-[0_28px_90px_rgba(0,0,0,.55)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-amber-100/10 bg-amber-200/[.04]" />
        <div className="border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[.24em] text-amber-100/60">
              <FileSearch className="h-4 w-4 text-amber-200" aria-hidden="true" />
              Ecological incident · Case 030
            </div>
            <span className="rotate-2 rounded border border-red-300/30 bg-red-950/25 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-[.18em] text-red-100/70">
              Unresolved
            </span>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-100/15 bg-emerald-950/20 p-3.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-100/55">GIS field context</p>
              <p className="m-0 mt-1 text-sm font-semibold text-emerald-50">{mystery.location.label}</p>
              <p className="m-0 mt-1 text-[10px] leading-relaxed text-emerald-100/55">{mystery.location.basis} Context guides investigation; it does not prove identity.</p>
            </div>
          </div>

          <p className="m-0 font-serif text-sm italic leading-relaxed text-amber-100/70">“{mystery.atmosphere}”</p>
          <h1 id="case-incident-title" className="m-0 mt-3 font-serif text-3xl font-semibold leading-none text-[#f4ead0] sm:text-4xl">
            {mystery.title}
          </h1>
          <p className="m-0 mt-4 text-sm leading-7 text-white/72 sm:text-[15px]">{mystery.incident}</p>

          <div className="mt-6 border-l-2 border-cyan-200/45 pl-4">
            <p className="m-0 font-mono text-[9px] font-bold uppercase tracking-[.2em] text-cyan-100/55">Investigation question</p>
            <p className="m-0 mt-1.5 text-base font-semibold leading-snug text-cyan-50">{mystery.question}</p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center font-mono text-[8px] uppercase tracking-[.13em] text-white/45">
            <span className="rounded-lg border border-white/10 bg-white/[.035] px-2 py-2">3 field sites</span>
            <span className="rounded-lg border border-white/10 bg-white/[.035] px-2 py-2">5 methods</span>
            <span className="rounded-lg border border-white/10 bg-white/[.035] px-2 py-2">2-part verdict</span>
          </div>

          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-100/20 bg-[linear-gradient(100deg,#79e3cf,#8ad9ef)] px-5 py-3.5 text-sm font-black uppercase tracking-[.08em] text-slate-950 shadow-[0_12px_35px_rgba(90,210,200,.18)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Begin fieldwork
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
