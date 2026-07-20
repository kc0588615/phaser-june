import { METHOD_TYPES, type MethodType } from '@/expedition/domain';
import { deriveMethodOfferTree, type MethodOfferTree } from '@/expedition/caseOffers';
import type { EvidenceQualityTier } from '@/expedition/evidenceQuality';
import {
  CASE_TRAIT_CATEGORIES,
  PROTOTYPE_SPECIES_COUNT,
  type CaseTraitCategory,
  type CompilerCard,
  type CompilerSpeciesProfile,
} from '@/lib/caseCompiler';
import { createSeededStream } from '@/lib/seededRng';

const CATEGORY_PROFILE_KEY = {
  habitat: 'habitatTags',
  morphology: 'morphologyTags',
  diet: 'dietTags',
  behavior: 'behaviorTags',
  reproduction: 'reproductionTags',
  taxonomy: 'taxonomyTags',
  key_fact: 'keyFactTags',
  geography: 'geographyTags',
  conservation: 'conservationTags',
} as const satisfies Record<CaseTraitCategory, keyof CompilerSpeciesProfile>;

export type EvidenceCardIdMatrix = Record<MethodType, [number, number, number]>;

export interface PublicCaseV2Compiled {
  version: 2;
  candidateIds: number[];
  nodeTypes: [string, string, string];
  boardSeeds: [number, number, number];
  offerTree: MethodOfferTree;
}

export interface PrivateCaseV2Compiled {
  version: 2;
  answerId: number;
  caseSeed: string;
  cardIdMatrix: EvidenceCardIdMatrix;
  signatureCardId: number;
}

export interface CompiledCaseV2 {
  version: 2;
  public: PublicCaseV2Compiled;
  private: PrivateCaseV2Compiled;
}

export type CaseCompilerV2ErrorCode =
  | 'invalid_case_seed'
  | 'invalid_prototype_species_ids'
  | 'invalid_board_seeds'
  | 'invalid_node_types'
  | 'invalid_gis_prior'
  | 'invalid_species_pool'
  | 'invalid_card_corpus'
  | 'invalid_forced_answer';

export interface CaseCompilerV2Failure {
  error: CaseCompilerV2ErrorCode;
  message: string;
}

export interface CompileCaseV2Input {
  caseSeed: string;
  prototypeSpeciesIds: readonly number[];
  speciesPool: readonly CompilerSpeciesProfile[];
  cardsBySpecies: ReadonlyMap<number, readonly CompilerCard[]>;
  gisPrior: ReadonlyMap<number, number>;
  boardSeeds: readonly number[];
  nodeTypes: readonly string[];
  /** Test/checker only. Production answer selection remains GIS-seeded. */
  forcedAnswerId?: number;
}

export type CompileCaseV2Result = CompiledCaseV2 | CaseCompilerV2Failure;

interface ValidatedV2Corpus {
  prototypeIds: number[];
  profilesById: Map<number, CompilerSpeciesProfile>;
  matricesBySpecies: Map<number, EvidenceCardIdMatrix>;
  signatureBySpecies: Map<number, number>;
}

export function compileCaseV2(input: CompileCaseV2Input): CompileCaseV2Result {
  const validated = validateV2Corpus(input);
  if ('error' in validated) return validated;

  const answerId = input.forcedAnswerId ?? chooseWeightedAnswer(
    validated.prototypeIds,
    input.gisPrior,
    createSeededStream(input.caseSeed, 'answer-choice-v2'),
  );
  if (!validated.prototypeIds.includes(answerId)) {
    return failure('invalid_forced_answer', 'forcedAnswerId must be a prototype species id.');
  }

  const candidateIds = shuffledIds(
    validated.prototypeIds,
    createSeededStream(input.caseSeed, 'candidate-shuffle-v2'),
  );
  const nodeTypes = [...input.nodeTypes] as [string, string, string];
  const boardSeeds = [...input.boardSeeds] as [number, number, number];

  return {
    version: 2,
    public: {
      version: 2,
      candidateIds,
      nodeTypes,
      boardSeeds,
      offerTree: deriveMethodOfferTree(nodeTypes),
    },
    private: {
      version: 2,
      answerId,
      caseSeed: input.caseSeed,
      cardIdMatrix: validated.matricesBySpecies.get(answerId)!,
      signatureCardId: validated.signatureBySpecies.get(answerId)!,
    },
  };
}

function validateV2Corpus(input: CompileCaseV2Input): ValidatedV2Corpus | CaseCompilerV2Failure {
  if (!/^[0-9a-f]{64}$/.test(input.caseSeed)) {
    return failure('invalid_case_seed', 'caseSeed must be a 64-character lowercase hex digest.');
  }
  if (input.prototypeSpeciesIds.length !== PROTOTYPE_SPECIES_COUNT
    || input.prototypeSpeciesIds.some(id => !positiveInteger(id))
    || new Set(input.prototypeSpeciesIds).size !== PROTOTYPE_SPECIES_COUNT) {
    return failure('invalid_prototype_species_ids', 'Exactly six unique prototype ids are required.');
  }
  if (input.boardSeeds.length !== 3 || input.boardSeeds.some(seed => !uint32(seed))) {
    return failure('invalid_board_seeds', 'Exactly three uint32 board seeds are required.');
  }
  if (input.nodeTypes.length !== 3 || input.nodeTypes.some(value => typeof value !== 'string' || value.length === 0)) {
    return failure('invalid_node_types', 'Exactly three node types are required.');
  }

  const prototypeIds = [...input.prototypeSpeciesIds].sort((a, b) => a - b);
  const profilesById = new Map<number, CompilerSpeciesProfile>();
  for (const profile of input.speciesPool) {
    if (!prototypeIds.includes(profile.speciesId)) continue;
    if (profilesById.has(profile.speciesId) || !validProfile(profile)) {
      return failure('invalid_species_pool', 'A prototype profile is duplicated or malformed.');
    }
    profilesById.set(profile.speciesId, profile);
  }
  if (profilesById.size !== PROTOTYPE_SPECIES_COUNT) {
    return failure('invalid_species_pool', 'Every prototype requires one profile.');
  }
  for (const speciesId of prototypeIds) {
    const weight = input.gisPrior.get(speciesId);
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
      return failure('invalid_gis_prior', 'GIS prior weights must be finite and nonnegative.');
    }
  }

  const seenCardIds = new Set<number>();
  const matricesBySpecies = new Map<number, EvidenceCardIdMatrix>();
  const signatureBySpecies = new Map<number, number>();
  for (const speciesId of prototypeIds) {
    const cards = input.cardsBySpecies.get(speciesId);
    const profile = profilesById.get(speciesId)!;
    if (!Array.isArray(cards) || cards.length !== 16) {
      return failure('invalid_card_corpus', 'Each prototype requires fifteen tiered cards and one signature.');
    }
    const cells = new Map<string, CompilerCard>();
    let signature: CompilerCard | null = null;
    for (const card of cards) {
      if (!validCard(card, speciesId) || seenCardIds.has(card.id)
        || !profileHasTag(profile, card.traitCategory, card.compareTag)) {
        return failure('invalid_card_corpus', 'A v2 evidence card is malformed, duplicated, or absent from its answer profile.');
      }
      seenCardIds.add(card.id);
      if (card.isSignature) {
        if (signature || card.method !== 'analyze' || card.specificity !== 3
          || profile.signatureTag !== card.compareTag
          || countProfilesWithTag([...profilesById.values()], card.traitCategory, card.compareTag) !== 1) {
          return failure('invalid_card_corpus', 'Every prototype needs one globally unique Analyze signature.');
        }
        signature = card;
        continue;
      }
      if (card.compareTag.startsWith('signature:')) {
        return failure('invalid_card_corpus', 'Ordinary evidence cannot use a signature tag.');
      }
      const frequency = countProfilesWithTag([...profilesById.values()], card.traitCategory, card.compareTag);
      if (frequency < 2 || frequency > 5) {
        return failure('invalid_card_corpus', 'Ordinary evidence tags must occur in two to five profiles.');
      }
      const key = `${card.method}:${card.specificity}`;
      if (cells.has(key)) return failure('invalid_card_corpus', 'Every method-tier cell must be unique.');
      cells.set(key, card);
    }
    if (!signature || cells.size !== METHOD_TYPES.length * 3) {
      return failure('invalid_card_corpus', 'Every method requires exactly one card at each tier.');
    }
    for (const method of METHOD_TYPES) {
      const survivors = ([1, 2, 3] as EvidenceQualityTier[]).map(tier => survivorIds(
        [...profilesById.values()],
        cells.get(`${method}:${tier}`)!,
      ));
      if (!isSubset(survivors[2], survivors[1]) || !isSubset(survivors[1], survivors[0])) {
        return failure('invalid_card_corpus', 'Tier survivors must be nested for every species and method.');
      }
    }
    matricesBySpecies.set(speciesId, Object.fromEntries(METHOD_TYPES.map(method => [
      method,
      ([1, 2, 3] as EvidenceQualityTier[]).map(tier => cells.get(`${method}:${tier}`)!.id),
    ])) as EvidenceCardIdMatrix);
    signatureBySpecies.set(speciesId, signature.id);
  }

  return { prototypeIds, profilesById, matricesBySpecies, signatureBySpecies };
}

export function survivorIds(
  profiles: readonly CompilerSpeciesProfile[],
  card: Pick<CompilerCard, 'traitCategory' | 'compareTag'>,
  liveIds?: ReadonlySet<number>,
): Set<number> {
  return new Set(profiles.flatMap(profile => {
    if (liveIds && !liveIds.has(profile.speciesId)) return [];
    return profileHasTag(profile, card.traitCategory, card.compareTag) ? [profile.speciesId] : [];
  }));
}

function profileHasTag(profile: CompilerSpeciesProfile, category: CaseTraitCategory, tag: string): boolean {
  return (profile[CATEGORY_PROFILE_KEY[category]] as readonly string[]).includes(tag);
}

function countProfilesWithTag(profiles: readonly CompilerSpeciesProfile[], category: CaseTraitCategory, tag: string): number {
  return profiles.filter(profile => profileHasTag(profile, category, tag)).length;
}

function isSubset(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  return [...left].every(id => right.has(id));
}

function validProfile(profile: CompilerSpeciesProfile): boolean {
  return positiveInteger(profile.speciesId)
    && CASE_TRAIT_CATEGORIES.every(category => {
      const value = profile[CATEGORY_PROFILE_KEY[category]];
      return Array.isArray(value) && value.every(tag => typeof tag === 'string' && tag.length > 0);
    })
    && (profile.signatureTag === null || typeof profile.signatureTag === 'string');
}

function validCard(card: CompilerCard, speciesId: number): boolean {
  return positiveInteger(card.id) && card.speciesId === speciesId
    && METHOD_TYPES.includes(card.method)
    && CASE_TRAIT_CATEGORIES.includes(card.traitCategory)
    && typeof card.primaryPredicate === 'string' && card.primaryPredicate.length > 0
    && typeof card.compareTag === 'string' && card.compareTag.length > 0
    && Number.isInteger(card.specificity) && card.specificity >= 1 && card.specificity <= 3;
}

function chooseWeightedAnswer(ids: readonly number[], prior: ReadonlyMap<number, number>, rng: () => number): number {
  const total = ids.reduce((sum, id) => sum + (prior.get(id) ?? 0), 0);
  if (total === 0) return ids[Math.floor(rng() * ids.length)];
  const roll = rng() * total;
  let cumulative = 0;
  for (const id of ids) {
    cumulative += prior.get(id) ?? 0;
    if (roll < cumulative) return id;
  }
  return ids.at(-1)!;
}

function shuffledIds(ids: readonly number[], rng: () => number): number[] {
  const result = [...ids].sort((a, b) => a - b);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function positiveInteger(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
function uint32(value: number): boolean { return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff; }
function failure(error: CaseCompilerV2ErrorCode, message: string): CaseCompilerV2Failure { return { error, message }; }
