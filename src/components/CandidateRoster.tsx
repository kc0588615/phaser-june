import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { EVIDENCE_FAMILIES, EVIDENCE_FAMILY_LABELS } from '@/expedition/evidenceFamilies';
import { candidateTraitPhrase, revealedFamilyObservations } from '@/expedition/candidateTraits';
import type { RunState } from '@/types/expedition';
import { EvidenceFamilyIcon } from './EvidenceFamilyIcon';

export function CandidateRoster({ runState, onGuess }: { runState: RunState; onGuess: (speciesId: number, refs: string[]) => Promise<boolean | null> }) {
  const caseState = runState.caseState;
  const [openId, setOpenId] = useState<number | null>(null);
  if (!caseState) return null;
  const eliminated = new Set(caseState.eliminatedIds);
  const guessing = caseState.stage === 'guess';
  const selectedFamilySet = new Set(caseState.selectedFamilies);
  const opened = caseState.profiles.find(profile => profile.speciesId === openId);
  const latest = caseState.observations.at(-1);
  const familyObservations = revealedFamilyObservations(caseState.observations);
  // Authored per-candidate phrases from the server; profile-tag derivation is
  // only a fallback for runs persisted before candidateFamilyTraits existed.
  const ownTraitFor = (profile: (typeof caseState.profiles)[number], family: (typeof caseState.selectedFamilies)[number]): string | null => {
    const authored = caseState.candidateFamilyTraits[String(profile.speciesId)]?.[family];
    if (authored) return authored;
    const observation = familyObservations[family];
    return observation ? candidateTraitPhrase(profile, observation) : null;
  };

  return (
    <section className="absolute bottom-1 left-2 right-[120px] z-[66] rounded-2xl border border-white/15 bg-[rgba(7,17,20,.9)] px-2 py-1.5 shadow-2xl backdrop-blur-md md:bottom-2 md:left-4 md:right-[152px]" aria-label="Candidate roster">
      <div className="mb-1 flex items-center justify-between gap-3 px-1">
        <p className="m-0 text-[9px] font-bold uppercase tracking-[.16em] text-cyan-100/60">Field roster · {caseState.candidateIds.length - eliminated.size} still possible</p>
        {guessing && <p className="m-0 text-[10px] font-bold text-amber-200">Choose the animal</p>}
      </div>
      {latest?.family && (
        <p className="mb-1 mt-0 truncate rounded-md bg-white/[.04] px-2 py-0.5 text-[9px] text-white/65" title={latest.observationText}>
          <b className="mr-1 text-cyan-100">{EVIDENCE_FAMILY_LABELS[latest.family]}:</b>{latest.observationText}
        </p>
      )}
      {opened && (
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-cyan-100/15 bg-cyan-100/[.06] px-2 py-1 text-[10px] text-white/70">
          <b className="text-white">{opened.commonName}</b>
          <i>{opened.scientificName}</i>
          {eliminated.has(opened.speciesId) && (
            <span className="text-red-200/85">{caseState.eliminationReasons[String(opened.speciesId)] ?? 'evidence mismatch'}</span>
          )}
          {caseState.selectedFamilies.length === 0 && <span>No hard clues yet</span>}
          {caseState.selectedFamilies.map(family => {
            const phrase = ownTraitFor(opened, family);
            return (
              <span key={family} className="rounded bg-white/[.07] px-1.5 py-px">
                <b className="mr-1 text-cyan-100">{EVIDENCE_FAMILY_LABELS[family]}:</b>{phrase ?? 'no read yet'}
              </span>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
        {caseState.profiles.map(profile => {
          const isOut = eliminated.has(profile.speciesId);
          const isAnswer = runState.resolvedSpeciesId === profile.speciesId;
          const initials = profile.commonName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
          const portrait = candidatePortrait(profile.scientificName) ?? initials;
          const activate = () => {
            if (guessing && !isOut) void onGuess(profile.speciesId, []);
            else setOpenId(previous => previous === profile.speciesId ? null : profile.speciesId);
          };
          return (
            <button
              key={profile.speciesId}
              type="button"
              disabled={guessing && isOut}
              onClick={activate}
              className={`group relative min-w-0 rounded-xl border px-1 py-1 text-left transition ${isAnswer ? 'border-amber-300 bg-amber-300/15' : isOut ? 'border-red-400/15 bg-red-950/15' : 'border-white/10 bg-white/[.04] hover:border-cyan-200/45 hover:bg-cyan-100/[.08]'}`}
              aria-label={`${profile.commonName}${isOut ? ', eliminated' : guessing ? ', choose as answer' : ''}`}
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
                      const ownPhrase = revealed ? ownTraitFor(profile, family) : null;
                      const dotStyle = !revealed ? 'bg-white/10 text-transparent'
                        : isOut ? 'bg-red-300/35 text-red-950/80'
                        : 'bg-cyan-200 text-slate-950';
                      return (
                        <span key={family} className={`grid h-2.5 w-2.5 place-items-center rounded-full ${dotStyle}`} title={revealed ? `${EVIDENCE_FAMILY_LABELS[family]}: ${ownPhrase ?? caseState.familyTraits[family] ?? 'studied'}` : EVIDENCE_FAMILY_LABELS[family]}>
                          <EvidenceFamilyIcon family={family} className="h-2 w-2" strokeWidth={3} />
                        </span>
                      );
                    })}
                  </span>
                </span>
              </div>
              {isOut && <span className="mt-0.5 block truncate pl-0.5 text-[8px] text-red-200/70">{caseState.eliminationReasons[String(profile.speciesId)] ?? 'mismatch'}</span>}
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
