import { EVIDENCE_FAMILIES, isEvidenceFamily, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { CASE_TRAIT_CATEGORIES, type CaseTraitCategory, type CompilerSpeciesProfile } from '@/lib/caseTraits';
import { isCanonicalDeductionTag } from '@/lib/deductionTags';
import type { EvidenceProfileDossier } from '@/lib/evidenceSeedValidation';

export interface EvidenceFamilySeedCard {
  family: EvidenceFamily;
  observation_text: string;
  inference_text: string;
  trait_category: CaseTraitCategory;
  compare_tag: string;
  trait_phrase: string;
  bonus_fact_text: string;
  source: string;
  review_status: 'reviewed';
  hints: string[];
}

export interface EvidenceFamilySeed {
  iucn_id: number;
  scientific_name: string;
  common_name: string;
  cards: EvidenceFamilySeedCard[];
}

function assertValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, context: string): string {
  assertValue(typeof value === 'string' && value.length > 0 && value.trim() === value, `${context} must be a nonempty trimmed string`);
  return value;
}

export function parseEvidenceFamilySeed(raw: unknown, fileName = 'family evidence seed'): EvidenceFamilySeed {
  const source = record(raw);
  assertValue(source, `${fileName} must be an object`);
  assertValue(Number.isSafeInteger(source.iucn_id) && Number(source.iucn_id) > 0, `${fileName}.iucn_id must be positive`);
  assertValue(Array.isArray(source.cards), `${fileName}.cards must be an array`);
  return {
    iucn_id: Number(source.iucn_id),
    scientific_name: text(source.scientific_name, `${fileName}.scientific_name`),
    common_name: text(source.common_name, `${fileName}.common_name`),
    cards: source.cards.map((value, index) => {
      const card = record(value);
      const context = `${fileName}.cards[${index}]`;
      assertValue(card, `${context} must be an object`);
      assertValue(isEvidenceFamily(card.family), `${context}.family is invalid`);
      assertValue(typeof card.trait_category === 'string' && CASE_TRAIT_CATEGORIES.includes(card.trait_category as CaseTraitCategory), `${context}.trait_category is invalid`);
      assertValue(card.review_status === 'reviewed', `${context}.review_status must be reviewed`);
      return {
        family: card.family,
        observation_text: text(card.observation_text, `${context}.observation_text`),
        inference_text: text(card.inference_text, `${context}.inference_text`),
        trait_category: card.trait_category as CaseTraitCategory,
        compare_tag: text(card.compare_tag, `${context}.compare_tag`),
        trait_phrase: text(card.trait_phrase, `${context}.trait_phrase`),
        bonus_fact_text: text(card.bonus_fact_text, `${context}.bonus_fact_text`),
        source: text(card.source, `${context}.source`),
        review_status: 'reviewed',
        hints: (() => {
          assertValue(Array.isArray(card.hints) && card.hints.length >= 3 && card.hints.length <= 5, `${context}.hints must contain 3-5 lines`);
          return card.hints.map((hint, hintIndex) => text(hint, `${context}.hints[${hintIndex}]`));
        })(),
      };
    }),
  };
}

const PROFILE_KEY = {
  habitat: 'habitatTags', morphology: 'morphologyTags', diet: 'dietTags', behavior: 'behaviorTags',
  reproduction: 'reproductionTags', taxonomy: 'taxonomyTags', key_fact: 'keyFactTags',
  geography: 'geographyTags', conservation: 'conservationTags',
} as const satisfies Record<CaseTraitCategory, keyof CompilerSpeciesProfile>;

function leakedName(textValue: string, seeds: readonly EvidenceFamilySeed[]): string[] {
  const terms = new Set<string>();
  const allowedDescriptors = new Set(['asian']);
  for (const seed of seeds) {
    for (const name of [seed.scientific_name, seed.common_name]) {
      for (const term of name.toLowerCase().split(/[^a-z0-9]+/u)) {
        if (term.length >= 4 && !allowedDescriptors.has(term)) terms.add(term);
      }
    }
  }
  return [...terms].filter(term => new RegExp(`\\b${term}\\b`, 'u').test(textValue.toLowerCase()));
}

export function validateEvidenceFamilyCorpus(
  seeds: readonly EvidenceFamilySeed[],
  dossiers: readonly EvidenceProfileDossier[],
): string[] {
  const errors: string[] = [];
  const dossierById = new Map(dossiers.map(dossier => [dossier.iucnId, dossier]));
  const expectedIds = [...dossierById.keys()].sort((a, b) => a - b);
  const seedIds = seeds.map(seed => seed.iucn_id).sort((a, b) => a - b);
  if (seeds.length !== 6 || new Set(seedIds).size !== 6 || seedIds.join() !== expectedIds.join()) {
    errors.push('family corpus must contain exactly one seed for each of the six deduction profiles');
  }
  for (const seed of seeds) {
    const dossier = dossierById.get(seed.iucn_id);
    const context = `${seed.scientific_name} (${seed.iucn_id})`;
    if (!dossier) { errors.push(`${context}: missing profile`); continue; }
    if (seed.scientific_name !== dossier.scientificName || seed.common_name !== dossier.commonName) errors.push(`${context}: names differ from profile`);
    if (seed.cards.length !== EVIDENCE_FAMILIES.length
      || new Set(seed.cards.map(card => card.family)).size !== EVIDENCE_FAMILIES.length) errors.push(`${context}: requires one card per family`);
    for (const family of EVIDENCE_FAMILIES) if (!seed.cards.some(card => card.family === family)) errors.push(`${context}: missing ${family}`);
    for (const card of seed.cards) {
      if (!isCanonicalDeductionTag(card.compare_tag, card.trait_category)) errors.push(`${context}/${card.family}: invalid tag ${card.compare_tag}`);
      if (!dossier.profile[card.trait_category].includes(card.compare_tag)) errors.push(`${context}/${card.family}: answer profile lacks ${card.compare_tag}`);
      const frequency = dossiers.filter(candidate => candidate.profile[card.trait_category].includes(card.compare_tag)).length;
      if (frequency < 2 || frequency > 5) errors.push(`${context}/${card.family}: tag frequency must be 2-5, got ${frequency}`);
      if (!/^https:\/\//u.test(card.source)) errors.push(`${context}/${card.family}: source must use HTTPS`);
      if (card.observation_text.length > 180 || card.inference_text.length > 180 || card.bonus_fact_text.length > 240 || card.trait_phrase.length > 64) errors.push(`${context}/${card.family}: copy exceeds mobile limit`);
      if (!/[.!?]$/u.test(card.observation_text) || !/[.!?]$/u.test(card.inference_text) || !/[.!?]$/u.test(card.bonus_fact_text)) errors.push(`${context}/${card.family}: copy must be complete sentences`);
      for (const [field, copy] of [['observation', card.observation_text], ['inference', card.inference_text]] as const) {
        const leaks = leakedName(copy, seeds);
        if (leaks.length > 0) errors.push(`${context}/${card.family}: ${field} leaks name terms ${leaks.join(', ')}`);
      }
      for (const [hintIndex, hint] of card.hints.entries()) {
        if (hint.length > 140 || !/[.!?]$/u.test(hint)) errors.push(`${context}/${card.family}/hint-${hintIndex}: invalid ticker copy`);
        const hintLeaks = leakedName(hint, seeds);
        if (hintLeaks.length > 0) errors.push(`${context}/${card.family}/hint-${hintIndex}: leaks name terms ${hintLeaks.join(', ')}`);
      }
    }
  }
  return errors;
}

export interface CascadeHintSeed { sequence_index: number; hint_text: string }

export function parseCascadeHintSeed(raw: unknown, fileName = 'cascade hints'): CascadeHintSeed[] {
  const source = record(raw);
  assertValue(source && Array.isArray(source.lines), `${fileName}.lines must be an array`);
  assertValue(source.lines.length >= 12 && source.lines.length <= 30, `${fileName}.lines must contain 12-30 lines`);
  return source.lines.map((value, index) => ({ sequence_index: index, hint_text: text(value, `${fileName}.lines[${index}]`) }));
}

export function familySeedToCompilerProfiles(dossiers: readonly EvidenceProfileDossier[]): CompilerSpeciesProfile[] {
  return dossiers.map(dossier => ({
    speciesId: dossier.iucnId,
    habitatTags: dossier.profile.habitat,
    morphologyTags: dossier.profile.morphology,
    dietTags: dossier.profile.diet,
    behaviorTags: dossier.profile.behavior,
    reproductionTags: dossier.profile.reproduction,
    taxonomyTags: dossier.profile.taxonomy,
    keyFactTags: dossier.profile.key_fact,
    geographyTags: dossier.profile.geography,
    conservationTags: dossier.profile.conservation,
    signatureTag: dossier.profile.signatureTag,
  }));
}

export function profileHasFamilyCardTag(profile: CompilerSpeciesProfile, card: EvidenceFamilySeedCard): boolean {
  return (profile[PROFILE_KEY[card.trait_category]] as readonly string[]).includes(card.compare_tag);
}
