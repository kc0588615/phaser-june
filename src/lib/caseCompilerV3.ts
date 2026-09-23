import { parseExplanationEffects, validateExplanationEffects, type ExplanationEffects } from '@/lib/liveClaims';
import { snapshotEvidenceHints, type EvidenceHintSnapshot } from '@/lib/evidenceHintSnapshot';
import { EVIDENCE_FAMILIES, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { CASE_TRAIT_CATEGORIES, POOL_SIZE, type CaseTraitCategory, type CompilerSpeciesProfile } from '@/lib/caseTraits';
import { validateFamilyLadder } from '@/lib/evidenceLadder';
import { createSeededStream } from '@/lib/seededRng';
import { parseExpeditionMapView, type ExpeditionMapView } from '@/expedition/mapView';
import {
  buildPrivateMysteryCase,
  buildPublicMysteryCase,
  validateAuthoredMysteryCase,
  validatePublicMysteryCase,
  type AuthoredMysteryCase,
  type PrivateMysteryCase,
  type PublicMysteryCase,
} from '@/lib/mysteryCase';

const PROFILE_KEY = {
  habitat: 'habitatTags', morphology: 'morphologyTags', diet: 'dietTags', behavior: 'behaviorTags',
  reproduction: 'reproductionTags', taxonomy: 'taxonomyTags', key_fact: 'keyFactTags',
  geography: 'geographyTags', conservation: 'conservationTags',
} as const satisfies Record<CaseTraitCategory, keyof CompilerSpeciesProfile>;

export interface CompilerEvidenceFamilyCard {
  id: number;
  speciesId: number;
  family: EvidenceFamily;
  observationText: string;
  inferenceText: string;
  traitPhrase: string;
  bonusFactText: string;
  traitCategory: CaseTraitCategory;
  compareTag: string;
  explains?: ExplanationEffects | null;
}

export interface CompilerEvidenceFamilyHint {
  id: number;
  speciesId: number;
  family: EvidenceFamily;
  sequenceIndex: number;
  hintText: string;
  weakTag: string;
  explains?: ExplanationEffects | null;
}

export interface CompilerCascadeHint {
  id: number;
  sequenceIndex: number;
  hintText: string;
}

export interface CompiledCaseV4 {
  version: 4;
  public: { version: 4; candidateIds: number[]; boardSeeds: [number, number, number]; mapView: ExpeditionMapView; mystery: PublicMysteryCase };
  private: {
    version: 4;
    answerId: number;
    caseSeed: string;
    familyCardIds: Record<EvidenceFamily, number>;
    familyHintIds: Record<EvidenceFamily, number[]>;
    familyHints: EvidenceHintSnapshot[];
    familyCardEffects: Record<string, ExplanationEffects | null>;
    cascadeHintIds: number[];
    mystery: PrivateMysteryCase;
  };
}

export type CompileCaseV4Result = CompiledCaseV4 | { error: string; message: string };

export interface CompileCaseV4Input {
  caseSeed: string;
  prototypeSpeciesIds: readonly number[];
  speciesPool: readonly CompilerSpeciesProfile[];
  cardsBySpecies: ReadonlyMap<number, readonly CompilerEvidenceFamilyCard[]>;
  hintsBySpecies: ReadonlyMap<number, readonly CompilerEvidenceFamilyHint[]>;
  cascadeHints: readonly CompilerCascadeHint[];
  gisPrior: ReadonlyMap<number, number>;
  boardSeeds: readonly number[];
  mapView: ExpeditionMapView;
  mysteryCasesBySpeciesId: ReadonlyMap<number, AuthoredMysteryCase>;
  answerTermsBySpeciesId: ReadonlyMap<number, readonly string[]>;
  strictExplanationEffects?: boolean;
  forcedAnswerId?: number;
}

export function compileCaseV4(input: CompileCaseV4Input): CompileCaseV4Result {
  if (!/^[0-9a-f]{64}$/.test(input.caseSeed)) return fail('invalid_case_seed', 'caseSeed must be a lowercase SHA-256 digest.');
  if (input.prototypeSpeciesIds.length !== POOL_SIZE
    || new Set(input.prototypeSpeciesIds).size !== POOL_SIZE
    || input.prototypeSpeciesIds.some(id => !Number.isSafeInteger(id) || id <= 0)) return fail('invalid_species_ids', 'Exactly six unique species ids are required.');
  if (input.boardSeeds.length !== 3 || input.boardSeeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff)) return fail('invalid_board_seeds', 'Exactly three uint32 board seeds are required.');
  const mapView = parseExpeditionMapView(input.mapView);
  if (!mapView) return fail('invalid_map_view', 'Exactly three bounded map route points are required.');
  const ids = [...input.prototypeSpeciesIds].sort((a, b) => a - b);
  const idSet = new Set(ids);
  const profileById = new Map<number, CompilerSpeciesProfile>();
  for (const profile of input.speciesPool) {
    if (idSet.has(profile.speciesId)) profileById.set(profile.speciesId, profile);
  }
  if (profileById.size !== POOL_SIZE) return fail('invalid_profiles', 'Every prototype needs one deduction profile.');
  const profiles = [...profileById.values()];
  for (const speciesId of ids) {
    const mystery = input.mysteryCasesBySpeciesId.get(speciesId);
    const terms = input.answerTermsBySpeciesId.get(speciesId);
    if (!mystery || !terms) return fail('invalid_mystery_cases', 'Every prototype species needs one authored mystery case.');
    const errors = validateAuthoredMysteryCase(mystery, terms);
    errors.push(...validateExplanationEffects([
      ...(input.cardsBySpecies.get(speciesId) ?? []).map(card => card.explains),
      ...(input.hintsBySpecies.get(speciesId) ?? []).map(hint => hint.explains),
    ], mystery.public.explanationChoices.map(choice => choice.id), mystery.private.answerExplanationId, input.strictExplanationEffects ?? false));
    if (errors.length > 0) return fail('invalid_mystery_cases', `${speciesId}: ${errors.join('; ')}`);
  }
  const cardIdsBySpecies = new Map<number, Record<EvidenceFamily, number>>();
  const hintIdsBySpecies = new Map<number, Record<EvidenceFamily, number[]>>();
  const seenCardIds = new Set<number>();
  for (const speciesId of ids) {
    const cards = input.cardsBySpecies.get(speciesId);
    const profile = profileById.get(speciesId);
    if (!profile || !cards || cards.length !== EVIDENCE_FAMILIES.length) return fail('invalid_cards', 'Every species needs five family cards.');
    const byFamily = new Map<EvidenceFamily, CompilerEvidenceFamilyCard>();
    for (const card of cards) {
      if (!Number.isSafeInteger(card.id) || card.id <= 0 || card.speciesId !== speciesId
        || !EVIDENCE_FAMILIES.includes(card.family) || !CASE_TRAIT_CATEGORIES.includes(card.traitCategory)
        || !card.observationText || !card.inferenceText || !card.traitPhrase || !card.bonusFactText || !card.compareTag || seenCardIds.has(card.id)
        || !(profile[PROFILE_KEY[card.traitCategory]] as readonly string[]).includes(card.compareTag)
        || byFamily.has(card.family)) return fail('invalid_cards', 'Family cards are missing, duplicated, or do not match their answer profile.');
      const frequency = profiles.filter(candidate =>
        (candidate[PROFILE_KEY[card.traitCategory]] as readonly string[]).includes(card.compareTag)).length;
      if (frequency < 2 || frequency > 5) return fail('invalid_cards', 'Each family tag must occur in two to five profiles.');
      seenCardIds.add(card.id);
      byFamily.set(card.family, card);
    }
    if (byFamily.size !== EVIDENCE_FAMILIES.length) return fail('invalid_cards', 'Every family must occur exactly once.');
    const cardIds = {} as Record<EvidenceFamily, number>;
    for (const family of EVIDENCE_FAMILIES) {
      const card = byFamily.get(family);
      if (!card) return fail('invalid_cards', 'Every family must occur exactly once.');
      cardIds[family] = card.id;
    }
    cardIdsBySpecies.set(speciesId, cardIds);
    const hints = input.hintsBySpecies.get(speciesId) ?? [];
    const idsByFamily = {} as Record<EvidenceFamily, number[]>;
    for (const family of EVIDENCE_FAMILIES) {
      const card = byFamily.get(family);
      if (!card) return fail('invalid_cards', 'Every family must occur exactly once.');
      const familyHints = hints.filter(hint => hint.family === family).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
      if (familyHints.some(hint => !Number.isSafeInteger(hint.id) || hint.id <= 0 || hint.speciesId !== speciesId || !hint.hintText)
        // Safety only at run creation: answer-safe, 2-5 survivors, never widening. Strict narrowing is a corpus check.
        || validateFamilyLadder(speciesId, card, familyHints, profiles, { strict: false }).length > 0) {
        return fail('invalid_hints', 'Every family needs a 3-5 rung answer-safe ladder that never widens the candidate pool.');
      }
      idsByFamily[family] = familyHints.map(hint => hint.id);
    }
    if (new Set(Object.values(idsByFamily).flat()).size !== hints.length) return fail('invalid_hints', 'Hint ids must be unique.');
    hintIdsBySpecies.set(speciesId, idsByFamily);
  }
  const cascadeHintIds = [...input.cascadeHints].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  if (cascadeHintIds.length < 12 || cascadeHintIds.some((hint, index) => !Number.isSafeInteger(hint.id)
    || hint.id <= 0 || hint.sequenceIndex !== index || !hint.hintText)) return fail('invalid_cascade_hints', 'Cascade hints are incomplete.');
  for (const id of ids) {
    const weight = input.gisPrior.get(id);
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) return fail('invalid_gis_prior', 'GIS weights must be nonnegative and finite.');
  }
  const answerId = input.forcedAnswerId ?? chooseWeighted(ids, input.gisPrior, createSeededStream(input.caseSeed, 'answer-choice-v3'));
  if (!ids.includes(answerId)) return fail('invalid_forced_answer', 'forcedAnswerId must be a prototype species.');
  const mystery = input.mysteryCasesBySpeciesId.get(answerId);
  const familyCardIds = cardIdsBySpecies.get(answerId);
  const familyHintIds = hintIdsBySpecies.get(answerId);
  const answerTerms = input.answerTermsBySpeciesId.get(answerId);
  if (!mystery || !familyCardIds || !familyHintIds || !answerTerms) return fail('invalid_case_data', 'Answer case data is incomplete.');
  const publicMystery = buildPublicMysteryCase(mystery, mapView, answerTerms);
  const publicErrors = validatePublicMysteryCase(publicMystery, answerTerms);
  if (publicErrors.length > 0) return fail('invalid_mystery_cases', `${answerId}: ${publicErrors.join('; ')}`);
  return {
    version: 4,
    public: {
      version: 4,
      candidateIds: shuffle(ids, createSeededStream(input.caseSeed, 'candidate-shuffle-v4')),
      boardSeeds: [...input.boardSeeds] as [number, number, number],
      mapView,
      mystery: publicMystery,
    },
    private: {
      version: 4,
      answerId,
      caseSeed: input.caseSeed,
      familyCardIds,
      familyHintIds,
      familyCardEffects: Object.fromEntries((input.cardsBySpecies.get(answerId) ?? []).map(card => [String(card.id), parseExplanationEffects(card.explains)])),
      familyHints: snapshotEvidenceHints(familyHintIds, (input.hintsBySpecies.get(answerId) ?? []).map(hint => ({
        ...hint,
        traitCategory: input.cardsBySpecies.get(answerId)!.find(card => card.family === hint.family)!.traitCategory,
      }))),
      cascadeHintIds: shuffle(cascadeHintIds.map(hint => hint.id), createSeededStream(input.caseSeed, 'cascade-hints-v3')),
      mystery: buildPrivateMysteryCase(mystery),
    },
  };
}

export function verifyCaseCorpusV3(
  profiles: readonly CompilerSpeciesProfile[],
  cardsBySpecies: ReadonlyMap<number, readonly CompilerEvidenceFamilyCard[]>,
  hintsBySpecies: ReadonlyMap<number, readonly CompilerEvidenceFamilyHint[]>,
): { pathCount: number; residualCounts: Record<number, number>; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const residualCounts: Record<number, number> = {};
  let pathCount = 0;
  for (const answer of profiles) {
    const cards = cardsBySpecies.get(answer.speciesId) ?? [];
    for (const path of orderedFamilyPaths()) {
      pathCount += 1;
      let live = [...profiles];
      for (const family of path) {
        const card = cards.find(candidate => candidate.family === family);
        if (!card) { errors.push(`${answer.speciesId}/${family}: missing card`); break; }
        const next = live.filter(profile => (profile[PROFILE_KEY[card.traitCategory]] as readonly string[]).includes(card.compareTag));
        if (!next.some(profile => profile.speciesId === answer.speciesId)) errors.push(`${answer.speciesId}/${path.join('-')}: answer eliminated`);
        if (next.length === 0 || next.length > live.length) errors.push(`${answer.speciesId}/${path.join('-')}: invalid candidate transition`);
        if (next.length < 2) errors.push(`${answer.speciesId}/${path.join('-')}/${family}: hard tag unique among live candidates`);
        if (family === path[2] && live.length >= 2 && next.length >= live.length) errors.push(`${answer.speciesId}/${path.join('-')}: final clue did not eliminate`);
        live = next;
      }
      residualCounts[live.length] = (residualCounts[live.length] ?? 0) + 1;
      if (live.length < 1 || live.length > 3) errors.push(`${answer.speciesId}/${path.join('-')}: residual ${live.length}`);
    }
  }
  for (const answer of profiles) {
    const cards = cardsBySpecies.get(answer.speciesId) ?? [];
    const hints = hintsBySpecies.get(answer.speciesId) ?? [];
    for (const card of cards) {
      for (const [field, copy] of [['observation', card.observationText], ['inference', card.inferenceText]] as const) {
        if (/\b(?:not|neither|no|without|lacks|except)\b/iu.test(copy)) {
          warnings.push(`${answer.speciesId}/${card.family}/${field}: possible negative-form clue`);
        }
      }
      const familyHints = hints.filter(hint => hint.family === card.family);
      for (const error of validateFamilyLadder(answer.speciesId, card, familyHints, profiles, { strict: true })) {
        errors.push(`${answer.speciesId}/${error}`);
      }
    }
  }
  return { pathCount, residualCounts, errors, warnings };
}

export function orderedFamilyPaths(): [EvidenceFamily, EvidenceFamily, EvidenceFamily][] {
  return EVIDENCE_FAMILIES.flatMap(first => EVIDENCE_FAMILIES.flatMap(second => second === first ? []
    : EVIDENCE_FAMILIES.flatMap(third => third === first || third === second ? [] : [[first, second, third]]))) as [EvidenceFamily, EvidenceFamily, EvidenceFamily][];
}

function chooseWeighted(ids: readonly number[], prior: ReadonlyMap<number, number>, rng: () => number): number {
  const total = ids.reduce((sum, id) => sum + (prior.get(id) ?? 0), 0);
  if (total <= 0) return ids[Math.floor(rng() * ids.length)];
  let roll = rng() * total;
  for (const id of ids) { roll -= prior.get(id) ?? 0; if (roll < 0) return id; }
  return ids.at(-1)!;
}

function shuffle(ids: readonly number[], rng: () => number): number[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function fail(error: string, message: string): { error: string; message: string } { return { error, message }; }
