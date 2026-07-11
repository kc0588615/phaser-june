import { METHOD_SLOTS, type MethodType } from '@/expedition/domain';
import { createSeededStream } from '@/lib/seededRng';

export const PROTOTYPE_SPECIES_COUNT = 6;
export const FIXED_ROUTE_METHODS = METHOD_SLOTS;

const UINT32_MAX = 0xffff_ffff;
const METHOD_SET = new Set<string>(['track', 'observe', 'listen', 'survey', 'analyze']);

export const CASE_TRAIT_CATEGORIES = [
  'habitat',
  'morphology',
  'diet',
  'behavior',
  'reproduction',
  'taxonomy',
  'key_fact',
  'geography',
  'conservation',
] as const;

export type CaseTraitCategory = typeof CASE_TRAIT_CATEGORIES[number];

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

const CATEGORY_SET = new Set<string>(CASE_TRAIT_CATEGORIES);

export interface CompilerSpeciesProfile {
  speciesId: number;
  habitatTags: readonly string[];
  morphologyTags: readonly string[];
  dietTags: readonly string[];
  behaviorTags: readonly string[];
  reproductionTags: readonly string[];
  taxonomyTags: readonly string[];
  geographyTags: readonly string[];
  conservationTags: readonly string[];
  keyFactTags: readonly string[];
  signatureTag: string | null;
}

export interface CompilerCard {
  id: number;
  speciesId: number;
  method: MethodType;
  traitCategory: CaseTraitCategory;
  primaryPredicate: string;
  compareTag: string;
  isSignature: boolean;
  specificity: number;
}

export interface CompiledCase {
  version: 1;
  public: {
    version: 1;
    candidateIds: number[];
    nodeMethods: MethodType[];
    boardSeeds: number[];
  };
  private: {
    answerId: number;
    chainCardIds: number[];
    caseSeed: string;
  };
}

export type CaseCompilerErrorCode =
  | 'invalid_case_seed'
  | 'invalid_prototype_species_ids'
  | 'invalid_route_methods'
  | 'invalid_board_seeds'
  | 'invalid_gis_prior'
  | 'invalid_species_pool'
  | 'invalid_card_corpus'
  | 'unsolvable_step'
  | 'unsolvable_signature';

export interface CaseCompilerFailure {
  error: CaseCompilerErrorCode;
  message: string;
  step?: number;
}

export type CompileCaseResult = CompiledCase | CaseCompilerFailure;

export interface CompileCaseInput {
  caseSeed: string;
  prototypeSpeciesIds: readonly number[];
  speciesPool: readonly CompilerSpeciesProfile[];
  cardsBySpecies: ReadonlyMap<number, readonly CompilerCard[]>;
  gisPrior: ReadonlyMap<number, number>;
  routeMethods: readonly MethodType[];
  boardSeeds: readonly number[];
}

interface ValidatedCorpus {
  prototypeIds: number[];
  profilesById: Map<number, CompilerSpeciesProfile>;
  cardsBySpecies: Map<number, CompilerCard[]>;
  routeMethods: MethodType[];
  boardSeeds: number[];
}

interface CardOutcome {
  card: CompilerCard;
  liveAfter: Set<number>;
  eliminatedCount: number;
  score: number;
  tieBreak: number;
}

function failure(
  error: CaseCompilerErrorCode,
  message: string,
  context: Pick<CaseCompilerFailure, 'step'> = {},
): CaseCompilerFailure {
  return { error, message, ...context };
}

function isFailure(value: ValidatedCorpus | CaseCompilerFailure): value is CaseCompilerFailure {
  return 'error' in value;
}

function isSafePositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isUint32(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
}

function numericAscending(left: number, right: number): number {
  return left - right;
}

function cardIdAscending(left: CompilerCard, right: CompilerCard): number {
  return left.id - right.id;
}

function isFixedRoute(methods: readonly MethodType[]): boolean {
  return methods.length === FIXED_ROUTE_METHODS.length
    && methods.every((method, index) => method === FIXED_ROUTE_METHODS[index]);
}

function getProfileTags(
  profile: CompilerSpeciesProfile,
  category: CaseTraitCategory,
): readonly string[] {
  return profile[CATEGORY_PROFILE_KEY[category]] as readonly string[];
}

function profileHasTag(
  profile: CompilerSpeciesProfile,
  category: CaseTraitCategory,
  tag: string,
): boolean {
  return getProfileTags(profile, category).includes(tag);
}

function countProfilesWithTag(
  profiles: readonly CompilerSpeciesProfile[],
  category: CaseTraitCategory,
  tag: string,
): number {
  let count = 0;
  for (const profile of profiles) {
    if (profileHasTag(profile, category, tag)) count += 1;
  }
  return count;
}

function signatureLocations(
  profiles: readonly CompilerSpeciesProfile[],
  tag: string,
): Array<{ speciesId: number; category: CaseTraitCategory }> {
  const locations: Array<{ speciesId: number; category: CaseTraitCategory }> = [];

  for (const profile of profiles) {
    for (const category of CASE_TRAIT_CATEGORIES) {
      if (profileHasTag(profile, category, tag)) {
        locations.push({ speciesId: profile.speciesId, category });
      }
    }
  }

  return locations;
}

function validateProfileArrays(profile: CompilerSpeciesProfile): boolean {
  for (const category of CASE_TRAIT_CATEGORIES) {
    const tags = getProfileTags(profile, category);
    if (!Array.isArray(tags)) return false;
    if (tags.some((tag) => typeof tag !== 'string' || tag.length === 0 || tag.trim() !== tag)) {
      return false;
    }
    if (new Set(tags).size !== tags.length) return false;
  }
  return profile.signatureTag === null
    || (typeof profile.signatureTag === 'string'
      && profile.signatureTag.length > 0
      && profile.signatureTag.trim() === profile.signatureTag);
}

function validateInput(input: CompileCaseInput): ValidatedCorpus | CaseCompilerFailure {
  if (!/^[0-9a-f]{64}$/.test(input.caseSeed)) {
    return failure('invalid_case_seed', 'caseSeed must be a 64-character lowercase hex digest.');
  }

  if (
    input.prototypeSpeciesIds.length !== PROTOTYPE_SPECIES_COUNT
    || input.prototypeSpeciesIds.some((id) => !isSafePositiveInteger(id))
    || new Set(input.prototypeSpeciesIds).size !== PROTOTYPE_SPECIES_COUNT
  ) {
    return failure(
      'invalid_prototype_species_ids',
      'prototypeSpeciesIds must contain exactly six unique positive safe integers.',
    );
  }

  if (!isFixedRoute(input.routeMethods)) {
    return failure('invalid_route_methods', 'v0 route methods must be track, observe, survey.');
  }

  if (input.boardSeeds.length !== FIXED_ROUTE_METHODS.length || input.boardSeeds.some((seed) => !isUint32(seed))) {
    return failure('invalid_board_seeds', 'boardSeeds must contain exactly three uint32 values.');
  }

  const prototypeIds = [...input.prototypeSpeciesIds].sort(numericAscending);
  const prototypeIdSet = new Set(prototypeIds);
  const profilesById = new Map<number, CompilerSpeciesProfile>();

  for (const profile of input.speciesPool) {
    if (!prototypeIdSet.has(profile.speciesId)) continue;
    if (profilesById.has(profile.speciesId) || !validateProfileArrays(profile)) {
      return failure(
        'invalid_species_pool',
        'A prototype profile is duplicated or malformed.',
      );
    }
    profilesById.set(profile.speciesId, profile);
  }

  const missingProfileId = prototypeIds.find((speciesId) => !profilesById.has(speciesId));
  if (missingProfileId !== undefined) {
    return failure(
      'invalid_species_pool',
      'A prototype profile is missing.',
    );
  }

  for (const speciesId of prototypeIds) {
    const weight = input.gisPrior.get(speciesId);
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
      return failure(
        'invalid_gis_prior',
        'Each present GIS prior must be finite and non-negative.',
      );
    }
  }

  const totalPriorWeight = prototypeIds.reduce(
    (total, speciesId) => total + (input.gisPrior.get(speciesId) ?? 0),
    0,
  );
  if (!Number.isFinite(totalPriorWeight)) {
    return failure('invalid_gis_prior', 'Combined GIS prior weight must be finite.');
  }

  const profiles = prototypeIds.map((speciesId) => profilesById.get(speciesId)!);
  const normalizedCards = new Map<number, CompilerCard[]>();
  const seenCardIds = new Set<number>();

  for (const speciesId of prototypeIds) {
    const sourceCards = input.cardsBySpecies.get(speciesId);
    if (!Array.isArray(sourceCards)) {
      return failure(
        'invalid_card_corpus',
        'A prototype evidence-card collection is missing.',
      );
    }

    const cards = [...sourceCards].sort(cardIdAscending);
    const profile = profilesById.get(speciesId)!;
    let signatureCount = 0;
    const ordinaryMethodCounts = new Map<MethodType, number>();

    for (const card of cards) {
      if (
        !isSafePositiveInteger(card.id)
        || seenCardIds.has(card.id)
        || card.speciesId !== speciesId
        || !METHOD_SET.has(card.method)
        || !CATEGORY_SET.has(card.traitCategory)
        || typeof card.primaryPredicate !== 'string'
        || card.primaryPredicate.length === 0
        || card.primaryPredicate.trim() !== card.primaryPredicate
        || typeof card.compareTag !== 'string'
        || card.compareTag.length === 0
        || card.compareTag.trim() !== card.compareTag
        || !Number.isInteger(card.specificity)
        || card.specificity < 1
        || card.specificity > 3
      ) {
        return failure(
          'invalid_card_corpus',
          'An evidence card is malformed or has a duplicate id.',
        );
      }
      seenCardIds.add(card.id);

      if (!profileHasTag(profile, card.traitCategory, card.compareTag)) {
        return failure(
          'invalid_card_corpus',
          'An evidence compareTag is absent from its target profile category.',
        );
      }

      if (card.isSignature) {
        signatureCount += 1;
        const locations = signatureLocations(profiles, card.compareTag);
        if (
          profile.signatureTag !== card.compareTag
          || locations.length !== 1
          || locations[0].speciesId !== speciesId
          || locations[0].category !== card.traitCategory
        ) {
          return failure(
            'invalid_card_corpus',
            'A signature card is not globally unique in its declared category.',
          );
        }
      } else {
        if (
          card.compareTag.startsWith('genus:')
          || card.compareTag.startsWith('misc:')
          || card.compareTag.startsWith('signature:')
        ) {
          return failure(
            'invalid_card_corpus',
            'An ordinary card uses a prohibited compareTag prefix.',
          );
        }
        const frequency = countProfilesWithTag(profiles, card.traitCategory, card.compareTag);
        if (frequency < 2 || frequency > 5) {
          return failure(
            'invalid_card_corpus',
            'Every ordinary card tag frequency must be between two and five.',
          );
        }
        ordinaryMethodCounts.set(card.method, (ordinaryMethodCounts.get(card.method) ?? 0) + 1);
      }
    }

    if (signatureCount !== 1 || !profile.signatureTag) {
      return failure(
        'invalid_card_corpus',
        'Every prototype must have exactly one signature card and signature tag.',
      );
    }

    for (const method of FIXED_ROUTE_METHODS) {
      if ((ordinaryMethodCounts.get(method) ?? 0) < 2) {
        return failure(
          'invalid_card_corpus',
          `Every prototype needs at least two ordinary ${method} cards.`,
        );
      }
    }

    normalizedCards.set(speciesId, cards);
  }

  const corpus: ValidatedCorpus = {
    prototypeIds,
    profilesById,
    cardsBySpecies: normalizedCards,
    routeMethods: [...input.routeMethods],
    boardSeeds: [...input.boardSeeds],
  };

  for (const speciesId of prototypeIds) {
    const live = new Set(prototypeIds);
    if (!hasViableRegularCompletion(corpus, speciesId, live, 0, new Set())) {
      return failure(
        'unsolvable_step',
        'A prototype has no three-step positive-elimination chain.',
        { step: 0 },
      );
    }
  }

  return corpus;
}

function applyCard(
  corpus: ValidatedCorpus,
  live: ReadonlySet<number>,
  card: CompilerCard,
): { liveAfter: Set<number>; eliminatedCount: number } {
  const liveAfter = new Set<number>();

  for (const speciesId of live) {
    const profile = corpus.profilesById.get(speciesId)!;
    if (profileHasTag(profile, card.traitCategory, card.compareTag)) {
      liveAfter.add(speciesId);
    }
  }

  return {
    liveAfter,
    eliminatedCount: live.size - liveAfter.size,
  };
}

function hasViableRegularCompletion(
  corpus: ValidatedCorpus,
  answerId: number,
  live: ReadonlySet<number>,
  step: number,
  usedCardIds: ReadonlySet<number>,
): boolean {
  if (step >= corpus.routeMethods.length) return true;

  const method = corpus.routeMethods[step];
  const remainingRegularSteps = corpus.routeMethods.length - step - 1;
  const cards = corpus.cardsBySpecies.get(answerId)!;

  for (const card of cards) {
    if (card.isSignature || card.method !== method || usedCardIds.has(card.id)) continue;

    const outcome = applyCard(corpus, live, card);
    if (outcome.eliminatedCount <= 0 || outcome.liveAfter.size < remainingRegularSteps + 1) continue;

    const nextUsed = new Set(usedCardIds);
    nextUsed.add(card.id);
    if (hasViableRegularCompletion(corpus, answerId, outcome.liveAfter, step + 1, nextUsed)) {
      return true;
    }
  }

  return false;
}

function chooseWeightedAnswer(
  prototypeIds: readonly number[],
  gisPrior: ReadonlyMap<number, number>,
  rng: () => number,
): number {
  const totalWeight = prototypeIds.reduce(
    (total, speciesId) => total + (gisPrior.get(speciesId) ?? 0),
    0,
  );
  if (totalWeight === 0) {
    return prototypeIds[Math.floor(rng() * prototypeIds.length)];
  }

  const roll = rng() * totalWeight;
  let cumulative = 0;
  for (const speciesId of prototypeIds) {
    cumulative += gisPrior.get(speciesId) ?? 0;
    if (roll < cumulative) return speciesId;
  }

  return prototypeIds[prototypeIds.length - 1];
}

function shuffledIds(ids: readonly number[], rng: () => number): number[] {
  const result = [...ids].sort(numericAscending);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function compareOutcomes(left: CardOutcome, right: CardOutcome): number {
  if (left.score !== right.score) return left.score - right.score;
  if (left.tieBreak !== right.tieBreak) return left.tieBreak - right.tieBreak;
  return left.card.id - right.card.id;
}

function compileValidatedCase(
  input: CompileCaseInput,
  corpus: ValidatedCorpus,
): CompiledCase | CaseCompilerFailure {
  const answerRng = createSeededStream(input.caseSeed, 'answer-choice');
  const candidateRng = createSeededStream(input.caseSeed, 'candidate-shuffle');
  const chainRng = createSeededStream(input.caseSeed, 'chain-tie-break');

  const answerId = chooseWeightedAnswer(corpus.prototypeIds, input.gisPrior, answerRng);
  const candidateIds = shuffledIds(corpus.prototypeIds, candidateRng);
  const answerCards = corpus.cardsBySpecies.get(answerId)!;
  const live = new Set(corpus.prototypeIds);
  const usedCardIds = new Set<number>();
  const usedPredicates = new Set<string>();
  const chainCardIds: number[] = [];

  for (let step = 0; step < corpus.routeMethods.length; step += 1) {
    const method = corpus.routeMethods[step];
    const remainingRegularSteps = corpus.routeMethods.length - step - 1;
    const outcomes: CardOutcome[] = [];

    for (const card of answerCards) {
      if (card.isSignature || card.method !== method || usedCardIds.has(card.id)) continue;
      const outcome = applyCard(corpus, live, card);
      if (outcome.eliminatedCount <= 0 || outcome.liveAfter.size < remainingRegularSteps + 1) continue;

      const nextUsed = new Set(usedCardIds);
      nextUsed.add(card.id);
      if (!hasViableRegularCompletion(corpus, answerId, outcome.liveAfter, step + 1, nextUsed)) {
        continue;
      }

      outcomes.push({
        card,
        liveAfter: outcome.liveAfter,
        eliminatedCount: outcome.eliminatedCount,
        score: Math.abs(live.size / 2 - outcome.eliminatedCount)
          + (usedPredicates.has(card.primaryPredicate) ? 2 : 0)
          - card.specificity * 0.1,
        tieBreak: chainRng(),
      });
    }

    outcomes.sort(compareOutcomes);
    const selected = outcomes[0];
    if (!selected) {
      return failure(
        'unsolvable_step',
        `No viable ${method} card at regular step ${step}.`,
        { step },
      );
    }

    live.clear();
    for (const speciesId of selected.liveAfter) live.add(speciesId);
    usedCardIds.add(selected.card.id);
    usedPredicates.add(selected.card.primaryPredicate);
    chainCardIds.push(selected.card.id);
  }

  if (live.size > 1) {
    const signature = answerCards.find((card) => card.isSignature);
    if (!signature) {
      return failure(
        'unsolvable_signature',
        'Residual ambiguity remains without a signature card.',
        { step: corpus.routeMethods.length },
      );
    }

    const signatureOutcome = applyCard(corpus, live, signature);
    if (
      signatureOutcome.eliminatedCount <= 0
      || signatureOutcome.liveAfter.size !== 1
      || !signatureOutcome.liveAfter.has(answerId)
    ) {
      return failure(
        'unsolvable_signature',
        'Signature card does not reduce the residual set to the answer.',
        { step: corpus.routeMethods.length },
      );
    }
    chainCardIds.push(signature.id);
  }

  return {
    version: 1,
    public: {
      version: 1,
      candidateIds,
      nodeMethods: [...corpus.routeMethods],
      boardSeeds: [...corpus.boardSeeds],
    },
    private: {
      answerId,
      chainCardIds,
      caseSeed: input.caseSeed,
    },
  };
}

export function compileCase(input: CompileCaseInput): CompileCaseResult {
  const corpus = validateInput(input);
  if (isFailure(corpus)) return corpus;
  return compileValidatedCase(input, corpus);
}
