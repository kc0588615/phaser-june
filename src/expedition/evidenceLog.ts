import type { CaseState } from '@/types/expedition';

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
      ?? (observation?.traitPhrase
        ? `Points to an animal that is ${observation.traitPhrase}.`
        : 'The field team is still reading this find.');
    return { nodeIndex, observation, inference, ruledOut };
  });
}
