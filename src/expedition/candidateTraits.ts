// Candidate traits are public only after that observation eliminates them.
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';
import type { EarnedObservation } from '@/types/expedition';

export function eliminatedCandidateTraitPhrase(
  observations: readonly EarnedObservation[],
  speciesId: number,
  family: EvidenceFamily,
): string | null {
  const observation = observations.find(item => item.family === family
    && item.actualEliminatedIds?.includes(speciesId));
  return observation?.candidateTraitPhrases?.[String(speciesId)]?.trim() || null;
}
