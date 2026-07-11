import { METHOD_SLOTS, type MethodType } from '@/expedition/domain';
import {
  isCanonicalDeductionTag,
  validateDeductionTagProfile,
  type DeductionProfileCategory,
  type DeductionTagProfile,
} from '@/lib/deductionTags';

export const EVIDENCE_PROTOTYPE_IUCN_IDS = [
  512,
  5_748,
  7_140,
  12_763,
  15_955,
  18_732,
] as const;

export const EVIDENCE_ROUTE_METHODS = METHOD_SLOTS;

export const EVIDENCE_ORDINARY_CATEGORIES = [
  'habitat',
  'morphology',
  'diet',
  'behavior',
  'reproduction',
  'taxonomy',
] as const satisfies readonly DeductionProfileCategory[];

const ALL_CATEGORIES = [
  ...EVIDENCE_ORDINARY_CATEGORIES,
  'geography',
  'conservation',
  'key_fact',
] as const satisfies readonly DeductionProfileCategory[];

const METHOD_SET = new Set<string>(['track', 'observe', 'listen', 'survey', 'analyze']);
const CATEGORY_SET = new Set<string>(ALL_CATEGORIES);
const ORDINARY_CATEGORY_SET = new Set<string>(EVIDENCE_ORDINARY_CATEGORIES);
const PROHIBITED_ORDINARY_PREFIXES = ['genus:', 'misc:', 'signature:'] as const;

export type EvidenceReviewStatus = 'reviewed';

export interface EvidenceSeedCard {
  method: MethodType;
  observation_text: string;
  inference_text: string;
  trait_category: DeductionProfileCategory;
  primary_predicate: string;
  compare_tags: string[];
  is_signature: boolean;
  specificity: number;
  source: string;
  review_status: EvidenceReviewStatus;
}

export interface EvidenceSeed {
  iucn_id: number;
  scientific_name: string;
  common_name: string;
  cards: EvidenceSeedCard[];
}

export interface EvidenceProfileDossier {
  iucnId: number;
  scientificName: string;
  commonName: string;
  sources: readonly string[];
  profile: DeductionTagProfile;
}

export interface EvidenceChainStep {
  method: typeof EVIDENCE_ROUTE_METHODS[number];
  traitCategory: DeductionProfileCategory;
  compareTag: string;
  eliminatedIucnIds: number[];
  remainingIucnIds: number[];
}

export interface EvidenceSolvabilityReport {
  iucnId: number;
  scientificName: string;
  steps: EvidenceChainStep[];
  signatureNeeded: boolean;
  finalCandidateIds: number[];
}

export interface EvidenceCorpusValidation {
  errors: string[];
  reports: EvidenceSolvabilityReport[];
  ordinaryTagFrequencies: Array<{
    traitCategory: DeductionProfileCategory;
    compareTag: string;
    count: number;
  }>;
}

function assertValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireTrimmedString(value: unknown, context: string): string {
  assertValue(
    typeof value === 'string' && value.length > 0 && value.trim() === value,
    `${context} must be a nonempty trimmed string`,
  );
  return value;
}

function requireStringArray(value: unknown, context: string): string[] {
  assertValue(Array.isArray(value), `${context} must be an array`);
  const result = value.map((item, index) => requireTrimmedString(item, `${context}[${index}]`));
  assertValue(new Set(result).size === result.length, `${context} must not contain duplicates`);
  return result;
}

export function parseEvidenceSeed(raw: unknown, fileName = 'evidence seed'): EvidenceSeed {
  assertValue(isPlainObject(raw), `${fileName} must be an object`);
  assertValue(Number.isSafeInteger(raw.iucn_id) && Number(raw.iucn_id) > 0, `${fileName}.iucn_id must be a positive safe integer`);
  const scientificName = requireTrimmedString(raw.scientific_name, `${fileName}.scientific_name`);
  const commonName = requireTrimmedString(raw.common_name, `${fileName}.common_name`);
  assertValue(Array.isArray(raw.cards), `${fileName}.cards must be an array`);

  const cards = raw.cards.map((value, index): EvidenceSeedCard => {
    const context = `${fileName}.cards[${index}]`;
    assertValue(isPlainObject(value), `${context} must be an object`);
    assertValue(typeof value.method === 'string' && METHOD_SET.has(value.method), `${context}.method is invalid`);
    assertValue(
      typeof value.trait_category === 'string' && CATEGORY_SET.has(value.trait_category),
      `${context}.trait_category is invalid`,
    );
    assertValue(typeof value.is_signature === 'boolean', `${context}.is_signature must be boolean`);
    assertValue(
      Number.isInteger(value.specificity) && Number(value.specificity) >= 1 && Number(value.specificity) <= 3,
      `${context}.specificity must be an integer from 1 to 3`,
    );
    assertValue(value.review_status === 'reviewed', `${context}.review_status must be reviewed`);

    return {
      method: value.method as MethodType,
      observation_text: requireTrimmedString(value.observation_text, `${context}.observation_text`),
      inference_text: requireTrimmedString(value.inference_text, `${context}.inference_text`),
      trait_category: value.trait_category as DeductionProfileCategory,
      primary_predicate: requireTrimmedString(value.primary_predicate, `${context}.primary_predicate`),
      compare_tags: requireStringArray(value.compare_tags, `${context}.compare_tags`),
      is_signature: value.is_signature,
      specificity: Number(value.specificity),
      source: requireTrimmedString(value.source, `${context}.source`),
      review_status: 'reviewed',
    };
  });

  return {
    iucn_id: Number(raw.iucn_id),
    scientific_name: scientificName,
    common_name: commonName,
    cards,
  };
}

export function parseEvidenceProfileDossier(
  raw: unknown,
  fileName = 'deduction dossier',
): EvidenceProfileDossier {
  assertValue(isPlainObject(raw), `${fileName} must be an object`);
  assertValue(Number.isSafeInteger(raw.iucn_id) && Number(raw.iucn_id) > 0, `${fileName}.iucn_id must be a positive safe integer`);
  assertValue(isPlainObject(raw.species), `${fileName}.species must be an object`);
  assertValue(isPlainObject(raw.profile), `${fileName}.profile must be an object`);

  const profile = {} as Record<DeductionProfileCategory, readonly string[]>;
  for (const category of ALL_CATEGORIES) {
    const jsonKey = `${category}_tags`;
    profile[category] = requireStringArray(raw.profile[jsonKey], `${fileName}.profile.${jsonKey}`);
  }
  const signatureTag = raw.profile.signature_tag;
  assertValue(
    signatureTag === null || typeof signatureTag === 'string',
    `${fileName}.profile.signature_tag must be a string or null`,
  );
  const tagProfile: DeductionTagProfile = {
    ...profile,
    signatureTag,
  };
  const profileErrors = validateDeductionTagProfile(tagProfile);
  assertValue(profileErrors.length === 0, `${fileName}.profile invalid: ${profileErrors.join('; ')}`);

  return {
    iucnId: Number(raw.iucn_id),
    scientificName: requireTrimmedString(raw.scientific_name, `${fileName}.scientific_name`),
    commonName: requireTrimmedString(raw.common_name, `${fileName}.common_name`),
    sources: requireStringArray(raw.species.sources, `${fileName}.species.sources`),
    profile: tagProfile,
  };
}

function profileHasTag(
  dossier: EvidenceProfileDossier,
  category: DeductionProfileCategory,
  tag: string,
): boolean {
  return dossier.profile[category].includes(tag);
}

function frequencyKey(category: DeductionProfileCategory, tag: string): string {
  return `${category}\u0000${tag}`;
}

function countCategoryTag(
  dossiers: readonly EvidenceProfileDossier[],
  category: DeductionProfileCategory,
  tag: string,
): number {
  return dossiers.filter(dossier => profileHasTag(dossier, category, tag)).length;
}

function leakedNameTerms(text: string, seeds: readonly EvidenceSeed[]): string[] {
  const terms = new Set<string>();
  for (const seed of seeds) {
    for (const name of [seed.scientific_name, seed.common_name]) {
      for (const term of name.toLowerCase().split(/[^a-z0-9]+/u)) {
        if (term.length >= 4) terms.add(term);
      }
    }
  }
  const normalized = ` ${text.toLowerCase()} `;
  return [...terms].filter(term => new RegExp(`\\b${term}\\b`, 'u').test(normalized));
}

function applyCard(
  liveIds: readonly number[],
  card: EvidenceSeedCard,
  dossiersById: ReadonlyMap<number, EvidenceProfileDossier>,
): number[] {
  const tag = card.compare_tags[0];
  return liveIds.filter((iucnId) => {
    const dossier = dossiersById.get(iucnId);
    return dossier !== undefined && profileHasTag(dossier, card.trait_category, tag);
  });
}

function findViableChain(
  seed: EvidenceSeed,
  dossiers: readonly EvidenceProfileDossier[],
): EvidenceSolvabilityReport | null {
  const dossiersById = new Map(dossiers.map(dossier => [dossier.iucnId, dossier]));
  const allIds = dossiers.map(dossier => dossier.iucnId).sort((left, right) => left - right);

  function search(
    stepIndex: number,
    liveIds: number[],
    usedCardIndexes: ReadonlySet<number>,
    steps: EvidenceChainStep[],
  ): EvidenceSolvabilityReport | null {
    if (stepIndex === EVIDENCE_ROUTE_METHODS.length) {
      const signatureNeeded = liveIds.length > 1;
      const finalIds = signatureNeeded ? [seed.iucn_id] : liveIds;
      return {
        iucnId: seed.iucn_id,
        scientificName: seed.scientific_name,
        steps,
        signatureNeeded,
        finalCandidateIds: finalIds,
      };
    }

    const method = EVIDENCE_ROUTE_METHODS[stepIndex];
    const remainingSteps = EVIDENCE_ROUTE_METHODS.length - stepIndex - 1;
    const candidates = seed.cards
      .map((card, cardIndex) => ({ card, cardIndex }))
      .filter(({ card, cardIndex }) => !card.is_signature && card.method === method && !usedCardIndexes.has(cardIndex))
      .map(({ card, cardIndex }) => {
        const remaining = applyCard(liveIds, card, dossiersById);
        const eliminated = liveIds.filter(id => !remaining.includes(id));
        return { card, cardIndex, remaining, eliminated };
      })
      .filter(({ remaining, eliminated }) => eliminated.length > 0 && remaining.length >= remainingSteps + 1)
      .sort((left, right) => {
        const target = liveIds.length / 2;
        const scoreDifference = Math.abs(target - left.eliminated.length) - Math.abs(target - right.eliminated.length);
        if (scoreDifference !== 0) return scoreDifference;
        const specificityDifference = right.card.specificity - left.card.specificity;
        if (specificityDifference !== 0) return specificityDifference;
        return `${left.card.trait_category}:${left.card.compare_tags[0]}`
          .localeCompare(`${right.card.trait_category}:${right.card.compare_tags[0]}`);
      });

    for (const candidate of candidates) {
      const nextUsed = new Set(usedCardIndexes);
      nextUsed.add(candidate.cardIndex);
      const result = search(stepIndex + 1, candidate.remaining, nextUsed, [
        ...steps,
        {
          method,
          traitCategory: candidate.card.trait_category,
          compareTag: candidate.card.compare_tags[0],
          eliminatedIucnIds: candidate.eliminated,
          remainingIucnIds: candidate.remaining,
        },
      ]);
      if (result) return result;
    }

    return null;
  }

  return search(0, allIds, new Set(), []);
}

export function validateEvidenceCorpus(
  seeds: readonly EvidenceSeed[],
  dossiers: readonly EvidenceProfileDossier[],
): EvidenceCorpusValidation {
  const errors: string[] = [];
  const expectedIds = [...EVIDENCE_PROTOTYPE_IUCN_IDS].sort((left, right) => left - right);
  const seedIds = seeds.map(seed => seed.iucn_id).sort((left, right) => left - right);
  const dossierIds = dossiers.map(dossier => dossier.iucnId).sort((left, right) => left - right);

  if (new Set(seedIds).size !== seeds.length || seedIds.join(',') !== expectedIds.join(',')) {
    errors.push(`evidence corpus must contain exactly the six prototype IUCN ids: ${expectedIds.join(', ')}`);
  }
  if (new Set(dossierIds).size !== dossiers.length || dossierIds.join(',') !== expectedIds.join(',')) {
    errors.push(`profile corpus must contain exactly the six prototype IUCN ids: ${expectedIds.join(', ')}`);
  }

  const dossiersById = new Map(dossiers.map(dossier => [dossier.iucnId, dossier]));
  const frequencyEntries = new Map<string, {
    traitCategory: DeductionProfileCategory;
    compareTag: string;
    count: number;
  }>();

  for (const seed of seeds) {
    const context = `${seed.scientific_name} (${seed.iucn_id})`;
    const dossier = dossiersById.get(seed.iucn_id);
    if (!dossier) {
      errors.push(`${context}: no matching deduction dossier`);
      continue;
    }
    if (seed.scientific_name !== dossier.scientificName || seed.common_name !== dossier.commonName) {
      errors.push(`${context}: names do not exactly match the deduction dossier`);
    }
    if (seed.cards.length !== 7) errors.push(`${context}: requires exactly seven cards`);

    const methodCounts = new Map<MethodType, number>();
    const signatureCards = seed.cards.filter(card => card.is_signature);
    const cardKeys = new Set<string>();

    for (const [cardIndex, card] of seed.cards.entries()) {
      const cardContext = `${context} card ${cardIndex + 1}`;
      const tag = card.compare_tags[0];
      methodCounts.set(card.method, (methodCounts.get(card.method) ?? 0) + 1);

      if (card.compare_tags.length !== 1) {
        errors.push(`${cardContext}: compare_tags must contain exactly one tag`);
        continue;
      }
      if (!isCanonicalDeductionTag(tag, card.trait_category)) {
        errors.push(`${cardContext}: non-canonical or misplaced tag "${tag}"`);
      }
      if (!profileHasTag(dossier, card.trait_category, tag)) {
        errors.push(`${cardContext}: tag "${tag}" is absent from profile.${card.trait_category}`);
      }
      if (!/^https:\/\//u.test(card.source) || !dossier.sources.includes(card.source)) {
        errors.push(`${cardContext}: source must exactly match an HTTPS dossier source`);
      }
      if (card.observation_text.length > 180 || card.inference_text.length > 240) {
        errors.push(`${cardContext}: observation or inference text exceeds the v0 mobile limit`);
      }
      if (!/[.!?]$/u.test(card.observation_text) || !/[.!?]$/u.test(card.inference_text)) {
        errors.push(`${cardContext}: observation and inference must be complete sentences`);
      }
      const leaks = leakedNameTerms(`${card.observation_text} ${card.inference_text}`, seeds);
      if (leaks.length > 0) errors.push(`${cardContext}: text leaks candidate name terms: ${leaks.join(', ')}`);

      const cardKey = `${card.method}\u0000${card.trait_category}\u0000${tag}`;
      if (cardKeys.has(cardKey)) errors.push(`${cardContext}: duplicates a method/category/tag card`);
      cardKeys.add(cardKey);

      if (card.is_signature) {
        if (card.method !== 'analyze') errors.push(`${cardContext}: signature card method must be analyze`);
        if (tag !== dossier.profile.signatureTag) errors.push(`${cardContext}: signature tag does not match target profile`);

        const locations = dossiers.flatMap(candidate => ALL_CATEGORIES.flatMap(category =>
          candidate.profile[category].includes(tag)
            ? [{ iucnId: candidate.iucnId, category }]
            : []));
        if (
          locations.length !== 1
          || locations[0].iucnId !== seed.iucn_id
          || locations[0].category !== card.trait_category
        ) {
          errors.push(`${cardContext}: signature tag must occur in exactly its one declared profile array across the corpus`);
        }
      } else {
        if (!EVIDENCE_ROUTE_METHODS.includes(card.method as typeof EVIDENCE_ROUTE_METHODS[number])) {
          errors.push(`${cardContext}: ordinary method must be track, observe, or survey`);
        }
        if (!ORDINARY_CATEGORY_SET.has(card.trait_category)) {
          errors.push(`${cardContext}: ordinary card uses sparse trait category ${card.trait_category}`);
        }
        if (PROHIBITED_ORDINARY_PREFIXES.some(prefix => tag.startsWith(prefix))) {
          errors.push(`${cardContext}: ordinary tag uses prohibited prefix`);
        }
        const count = countCategoryTag(dossiers, card.trait_category, tag);
        if (count < 2 || count > 5) {
          errors.push(`${cardContext}: ordinary tag frequency must be 2-5, got ${count}`);
        }
        frequencyEntries.set(frequencyKey(card.trait_category, tag), {
          traitCategory: card.trait_category,
          compareTag: tag,
          count,
        });
      }
    }

    for (const method of EVIDENCE_ROUTE_METHODS) {
      if ((methodCounts.get(method) ?? 0) !== 2) errors.push(`${context}: requires exactly two ${method} cards`);
    }
    if ((methodCounts.get('analyze') ?? 0) !== 1 || signatureCards.length !== 1) {
      errors.push(`${context}: requires exactly one analyze signature card`);
    }
    for (const method of ['listen'] as const) {
      if ((methodCounts.get(method) ?? 0) !== 0) errors.push(`${context}: ${method} cards are deferred in v0`);
    }
  }

  const reports = seeds
    .map(seed => findViableChain(seed, dossiers))
    .filter((report): report is EvidenceSolvabilityReport => report !== null)
    .sort((left, right) => left.iucnId - right.iucnId);
  const reportIds = new Set(reports.map(report => report.iucnId));
  for (const seed of seeds) {
    if (!reportIds.has(seed.iucn_id)) {
      errors.push(`${seed.scientific_name} (${seed.iucn_id}): no viable three-step positive-elimination chain`);
    }
  }

  const ordinaryTagFrequencies = [...frequencyEntries.values()].sort((left, right) =>
    `${left.traitCategory}:${left.compareTag}`.localeCompare(`${right.traitCategory}:${right.compareTag}`));

  return { errors, reports, ordinaryTagFrequencies };
}
