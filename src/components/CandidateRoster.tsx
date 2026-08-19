import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { EVIDENCE_FAMILIES, EVIDENCE_FAMILY_LABELS } from '@/expedition/evidenceFamilies';
import { eliminatedCandidateTraitPhrase } from '@/expedition/candidateTraits';
import type { RunState } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

export function CandidateRoster({ runState, onGuess }: { runState: RunState; onGuess: (speciesId: number) => Promise<boolean | null> }) {
  const caseState = runState.caseState;
  const [openId, setOpenId] = useState<number | null>(null);
  if (!caseState) return null;
  const eliminated = new Set(caseState.eliminatedIds);
  const guessing = caseState.stage === 'guess';
  const selectedFamilySet = new Set(caseState.selectedFamilies);

  return (
    <section
      className={`absolute bottom-1 left-2 right-[120px] z-[66] rounded-2xl border bg-[rgba(7,17,20,.92)] px-2 py-1.5 shadow-2xl backdrop-blur-md transition-colors sm:bottom-2 sm:left-4 sm:right-[152px] lg:bottom-2 lg:right-auto lg:top-2 lg:w-[132px] lg:overflow-y-auto lg:p-2 ${
        guessing ? 'border-amber-300/55 shadow-amber-950/30' : 'border-white/15'
      }`}
      aria-label="Candidate roster"
    >
      <div className="mb-1 flex items-center justify-between gap-2 px-1 lg:mb-2 lg:block">
        <p className="m-0 text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/60">
          Roster · {caseState.candidateIds.length - eliminated.size} possible
        </p>
        {guessing && <p className="m-0 text-[9px] font-bold uppercase tracking-[.12em] text-amber-200 lg:mt-1">Choose animal</p>}
      </div>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-1 lg:gap-1.5">
        {caseState.profiles.map(profile => {
          const isOut = eliminated.has(profile.speciesId);
          const isAnswer = runState.resolvedSpeciesId === profile.speciesId;
          const isOpen = openId === profile.speciesId;
          const initials = profile.commonName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
          const portrait = candidatePortrait(profile.scientificName) ?? initials;
          const activate = () => {
            if (guessing && !isOut) void onGuess(profile.speciesId);
            else setOpenId(previous => previous === profile.speciesId ? null : profile.speciesId);
          };
          return (
            <button
              key={profile.speciesId}
              type="button"
              disabled={guessing && isOut}
              onClick={activate}
              className={`group relative min-w-0 rounded-xl border px-1 py-1 text-left transition-colors ${
                isOpen ? 'col-span-3 sm:col-span-6 lg:col-span-1' : ''
              } ${
                isAnswer
                  ? 'border-amber-300 bg-amber-300/15'
                  : isOut
                    ? `border-red-400/15 bg-red-950/15 ${isOpen ? 'opacity-75' : 'opacity-40'}`
                    : guessing
                      ? 'border-amber-200/25 bg-amber-100/[.06] hover:border-amber-200 hover:bg-amber-100/[.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200'
                      : 'border-white/10 bg-white/[.04] hover:border-cyan-200/45 hover:bg-cyan-100/[.08]'
              }`}
              aria-label={`${profile.commonName}${isOut ? ', eliminated' : guessing ? ', choose as answer' : ''}`}
              aria-expanded={guessing ? undefined : isOpen}
            >
              <div className="flex items-center gap-1.5">
                <span className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black ${isOut ? 'border-red-300/30 bg-slate-700 grayscale' : 'border-cyan-100/25 bg-gradient-to-br from-cyan-300/25 to-emerald-300/10 text-cyan-50'}`}>
                  <span aria-hidden="true" className={portrait === initials ? '' : 'text-base'}>{portrait}</span>
                  {isOut && <span className="roster-cross absolute inset-0 grid place-items-center rounded-full bg-red-950/30"><X className="h-7 w-7 text-red-400" strokeWidth={3} /></span>}
                  {isAnswer && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-300 text-black"><Check className="h-3 w-3" /></span>}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[9px] font-semibold leading-tight text-white ${isOut ? 'line-through opacity-45' : ''}`}>{profile.commonName}</span>
                  <span className="mt-0.5 flex gap-0.5">
                    {EVIDENCE_FAMILIES.map(family => {
                      const revealed = selectedFamilySet.has(family);
                      const ownPhrase = revealed && isOut
                        ? eliminatedCandidateTraitPhrase(caseState.observations, profile.speciesId, family)
                        : null;
                      const dotStyle = !revealed ? 'bg-white/10 text-transparent'
                        : isOut ? 'bg-red-300/35 text-red-950/80'
                        : 'bg-cyan-200 text-slate-950';
                      return (
                        <span key={family} className={`grid h-2.5 w-2.5 place-items-center rounded-full ${dotStyle}`} title={revealed ? `${EVIDENCE_FAMILY_LABELS[family]}: ${ownPhrase ?? 'no mismatch found'}` : EVIDENCE_FAMILY_LABELS[family]}>
                          <EvidenceFamilyIcon family={family} className="h-2 w-2" strokeWidth={3} />
                        </span>
                      );
                    })}
                  </span>
                </span>
              </div>
              {isOpen && !guessing && (
                <span className="mt-1.5 block border-t border-white/10 pt-1.5 text-[9px] leading-snug text-white/65">
                  <i className="block truncate text-white/50">{profile.scientificName}</i>
                  {isOut && (
                    <span className="mt-1 block text-red-100/75">
                      {caseState.eliminationReasons[String(profile.speciesId)] ?? 'Evidence mismatch'}
                    </span>
                  )}
                  {caseState.selectedFamilies.length === 0 && <span className="mt-1 block">No hard clues yet.</span>}
                  {isOut
                    ? caseState.selectedFamilies.map(family => {
                        const phrase = eliminatedCandidateTraitPhrase(caseState.observations, profile.speciesId, family);
                        return phrase ? (
                          <span key={family} className="mt-1 block rounded bg-white/[.05] px-1.5 py-1">
                            <b className="text-cyan-100/75">{EVIDENCE_FAMILY_LABELS[family]}:</b>{' '}
                            {phrase}
                          </span>
                        ) : null;
                      })
                    : caseState.selectedFamilies.length > 0 && <span className="mt-1 block">Still consistent with issued evidence.</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function candidatePortrait(scientificName: string): string | null {
  const name = scientificName.toLowerCase();
  if (name.includes('elephas')) return '🐘';
  if (name.includes('panthera')) return '🐅';
  if (name.includes('pteropus')) return '🦇';
  if (name.includes('manis')) return '🦔';
  if (name.includes('addax')) return '🦌';
  if (name.includes('cryptochloris')) return '🐾';
  return null;
}
