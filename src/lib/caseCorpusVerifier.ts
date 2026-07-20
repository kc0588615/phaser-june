import { METHOD_TYPES, type MethodType } from '@/expedition/domain';
import type { EvidenceQualityTier } from '@/expedition/evidenceQuality';
import type { CompilerCard, CompilerSpeciesProfile } from '@/lib/caseCompiler';
import { survivorIds } from '@/lib/caseCompilerV2';

export const CASE_COMPILER_SHAPE_COUNT = 9_720;

export interface CaseCorpusVerification {
  shapeCount: number;
  errors: string[];
  residualCounts: Record<number, number>;
  corroborationCount: number;
}

export function verifyTieredCaseCorpus(
  profiles: readonly CompilerSpeciesProfile[],
  cardsBySpecies: ReadonlyMap<number, readonly CompilerCard[]>,
): CaseCorpusVerification {
  const errors: string[] = [];
  const residualCounts: Record<number, number> = {};
  let shapeCount = 0;
  let corroborationCount = 0;
  const ids = profiles.map(profile => profile.speciesId).sort((a, b) => a - b);
  const permutations = threeMethodPermutations();
  const tierPaths = allTierPaths();

  for (const answerId of ids) {
    const cards = cardsBySpecies.get(answerId) ?? [];
    const ordinary = new Map(cards.filter(card => !card.isSignature).map(card => [`${card.method}:${card.specificity}`, card]));
    const signature = cards.find(card => card.isSignature);

    for (const method of METHOD_TYPES) {
      const tierCards = ([1, 2, 3] as EvidenceQualityTier[]).map(tier => ordinary.get(`${method}:${tier}`));
      if (tierCards.some(card => !card)) {
        errors.push(`${answerId}/${method}: missing tier cell`);
        continue;
      }
      const survivors = tierCards.map(card => survivorIds(profiles, card!));
      if (!subset(survivors[2], survivors[1]) || !subset(survivors[1], survivors[0])) {
        errors.push(`${answerId}/${method}: tier nesting failed`);
      }
      if (survivors.some(set => !set.has(answerId))) errors.push(`${answerId}/${method}: answer does not survive every tier`);
    }

    for (const methods of permutations) {
      for (const tiers of tierPaths) {
        shapeCount += 1;
        let live = new Set(ids);
        for (let step = 0; step < 3; step += 1) {
          const card = ordinary.get(`${methods[step]}:${tiers[step]}`);
          if (!card) { errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: missing card`); break; }
          const before = live;
          const after = survivorIds(profiles, card, before);
          if (!after.has(answerId)) errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: answer removed at ${step + 1}`);
          if (after.size === 0 || after.size > before.size) errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: invalid candidate transition`);
          if (after.size === before.size) {
            if (tiers[step] >= 2 && before.size > 1) errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: tier ${tiers[step]} corroborated with multiple candidates`);
            if (tiers[step] === 1) corroborationCount += 1;
          }
          live = after;
        }
        residualCounts[live.size] = (residualCounts[live.size] ?? 0) + 1;
        if (live.size > 3) errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: residual ${live.size} exceeds 3`);
        if (live.size > 1) {
          if (!signature) errors.push(`${answerId}: residual ambiguity lacks signature`);
          else {
            const resolved = survivorIds(profiles, signature, live);
            if (resolved.size !== 1 || !resolved.has(answerId)) {
              errors.push(`${answerId}/${methods.join('-')}/${tiers.join('')}: signature failed`);
            }
          }
        }
      }
    }
  }

  return { shapeCount, errors: [...new Set(errors)], residualCounts, corroborationCount };
}

function threeMethodPermutations(): Array<[MethodType, MethodType, MethodType]> {
  const result: Array<[MethodType, MethodType, MethodType]> = [];
  for (const first of METHOD_TYPES) for (const second of METHOD_TYPES) for (const third of METHOD_TYPES) {
    if (new Set([first, second, third]).size === 3) result.push([first, second, third]);
  }
  return result;
}

function allTierPaths(): Array<[EvidenceQualityTier, EvidenceQualityTier, EvidenceQualityTier]> {
  const result: Array<[EvidenceQualityTier, EvidenceQualityTier, EvidenceQualityTier]> = [];
  for (const first of [1, 2, 3] as const) for (const second of [1, 2, 3] as const) for (const third of [1, 2, 3] as const) {
    result.push([first, second, third]);
  }
  return result;
}

function subset(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  return [...left].every(id => right.has(id));
}
