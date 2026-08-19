import type { CaseState } from '@/types/expedition';

export interface EvidenceContrastOption {
  speciesId: number;
  commonName: string;
  candidateTrait: string;
  eliminationReason: string;
}

export function getEvidenceContrastMode(
  options: readonly EvidenceContrastOption[],
): 'hidden' | 'direct' | 'selector' {
  if (options.length === 0) return 'hidden';
  return options.length === 1 ? 'direct' : 'selector';
}

export function buildEvidenceLogSlots(caseState: CaseState) {
  const nameById = new Map(caseState.profiles.map(profile => [profile.speciesId, profile.commonName]));
  const familyObservations = caseState.observations.filter(observation => observation.family);
  return [0, 1, 2].map(nodeIndex => {
    const observation = familyObservations.find(candidate => candidate.ref === `obs-${nodeIndex}`)
      ?? familyObservations[nodeIndex]
      ?? null;
    const ruledOut = (observation?.actualEliminatedIds ?? [])
      .map(id => nameById.get(id))
      .filter((name): name is string => Boolean(name));
    const inference = observation?.inferenceText
      ?? 'The field team is still reading this find.';
    return { nodeIndex, observation, inference, ruledOut };
  });
}

export function buildIssuedEvidenceLogSlots(caseState: CaseState) {
  return buildEvidenceLogSlots(caseState).filter(slot => slot.observation?.family);
}

export function buildEvidenceContrastOptions(
  caseState: CaseState,
  observation: CaseState['observations'][number] | null,
): EvidenceContrastOption[] {
  if (!observation) return [];
  if (!observation.actualEliminatedIds?.length) return [];
  const profileById = new Map(caseState.profiles.map(profile => [profile.speciesId, profile]));
  return observation.actualEliminatedIds.flatMap(speciesId => {
    const profile = profileById.get(speciesId);
    const candidateTrait = observation.candidateTraitPhrases?.[String(speciesId)]?.trim();
    return profile && candidateTrait
      ? [{
          speciesId,
          commonName: profile.commonName,
          candidateTrait,
          eliminationReason: observation.eliminationReasons?.[String(speciesId)]?.trim() || 'Evidence mismatch',
        }]
      : [];
  });
}
