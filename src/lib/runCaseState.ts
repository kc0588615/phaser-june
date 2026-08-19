import { CASE_TRAIT_CATEGORIES, type CaseTraitCategory } from '@/lib/caseTraits';
import { EVIDENCE_FAMILIES, isEvidenceFamily, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import type { FieldFact } from '@/types/expedition';

const CATEGORY_SET = new Set<string>(CASE_TRAIT_CATEGORIES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_TO_PROFILE_KEY = {
  habitat: 'habitatTags',
  morphology: 'morphologyTags',
  diet: 'dietTags',
  behavior: 'behaviorTags',
  reproduction: 'reproductionTags',
  taxonomy: 'taxonomyTags',
  key_fact: 'keyFactTags',
  geography: 'geographyTags',
  conservation: 'conservationTags',
} as const satisfies Record<CaseTraitCategory, string>;

export const RUN_CHECKPOINT_LIMITS = {
  currentNodeIndex: 2,
  bankedScore: 10_000_000,
  objectiveProgress: 1_000_000,
  latencyMs: 3_600_000,
  candidateId: 2_147_483_647,
  choiceJustificationLength: 500,
} as const;

export interface PrivateCaseV3 {
  version: 3;
  answerId: number;
  caseSeed: string;
  familyCardIds: Record<EvidenceFamily, number>;
  familyHintIds: Record<EvidenceFamily, number[]>;
  cascadeHintIds: number[];
}

export type PrivateCaseSnapshot = PrivateCaseV3;

export interface V3EvidenceApplicationRecord {
  nodeIndex: number;
  ref: string;
  cardId: number;
  family: EvidenceFamily;
  actualEliminatedIds: number[];
  eliminationReasons: Record<string, string>;
  candidateTraitPhrases: Record<string, string>;
  issuedAt: string;
}

export interface EvidenceFamilyCardContent {
  id: number;
  family: EvidenceFamily;
  observationText: string;
  inferenceText: string;
  traitPhrase: string;
  bonusFactText: string;
  traitCategory: CaseTraitCategory;
  compareTag: string;
}

/** Server-authoritative elimination: compares one private marker across symmetric candidate profiles. */
export function computeActualEliminatedIds(
  profiles: ReadonlyArray<Pick<import('@/lib/deductionEngine').DeductionProfile,
    'speciesId' | 'habitatTags' | 'morphologyTags' | 'dietTags' | 'behaviorTags'
    | 'reproductionTags' | 'taxonomyTags' | 'keyFactTags' | 'geographyTags' | 'conservationTags'>>,
  alreadyEliminatedIds: readonly number[],
  traitCategory: CaseTraitCategory,
  compareTag: string,
): number[] {
  const key = CATEGORY_TO_PROFILE_KEY[traitCategory];
  const alreadyEliminated = new Set(alreadyEliminatedIds);
  const eliminatedIds: number[] = [];
  for (const profile of profiles) {
    if (!alreadyEliminated.has(profile.speciesId) && !profile[key].includes(compareTag)) {
      eliminatedIds.push(profile.speciesId);
    }
  }
  return eliminatedIds.sort((a, b) => a - b);
}

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** v3 only — stored v1/v2 private cases parse to null (legacy runs). */
export function parsePrivateCase(value: unknown): PrivateCaseSnapshot | null {
  const source = getRecord(value);
  if (source.version !== 3) return null;
  const idsSource = getRecord(source.familyCardIds);
  const hintIdsSource = getRecord(source.familyHintIds);
  const familyCardIds = {} as Record<EvidenceFamily, number>;
  const familyHintIds = {} as Record<EvidenceFamily, number[]>;
  for (const family of EVIDENCE_FAMILIES) {
    if (!isPositiveInteger(idsSource[family])) return null;
    familyCardIds[family] = idsSource[family] as number;
    const hintIds = parsePositiveIntegerArray(hintIdsSource[family], 5);
    if (hintIds.length < 3) return null;
    familyHintIds[family] = hintIds;
  }
  const cascadeHintIds = parsePositiveIntegerArray(source.cascadeHintIds, 30);
  const allFamilyHintIds = EVIDENCE_FAMILIES.flatMap(family => familyHintIds[family]);
  return isPositiveInteger(source.answerId)
    && typeof source.caseSeed === 'string'
    && /^[a-f0-9]{64}$/i.test(source.caseSeed)
    && cascadeHintIds.length >= 12
    && new Set(Object.values(familyCardIds)).size === EVIDENCE_FAMILIES.length
    && new Set(allFamilyHintIds).size === allFamilyHintIds.length
    ? { version: 3, answerId: source.answerId, caseSeed: source.caseSeed, familyCardIds, familyHintIds, cascadeHintIds }
    : null;
}

export function parseV3EvidenceApplications(value: unknown): V3EvidenceApplicationRecord[] {
  if (!Array.isArray(value)) return [];
  const seenNodes = new Set<number>();
  const seenFamilies = new Set<EvidenceFamily>();
  return value.flatMap(item => {
    const source = getRecord(item);
    const nodeIndex = source.nodeIndex;
    const family = source.family;
    const expectedRef = Number.isInteger(nodeIndex) ? `obs-${nodeIndex}` : '';
    const actualEliminatedIds = parsePositiveIntegerArray(source.actualEliminatedIds, 6);
    const eliminationReasonsSource = getRecord(source.eliminationReasons);
    const eliminationReasons = Object.fromEntries(actualEliminatedIds.map(id => [String(id), eliminationReasonsSource[String(id)]]));
    const candidateTraitPhrases = parseCandidateTraitPhrases(source.candidateTraitPhrases);
    if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 2
      || source.ref !== expectedRef || !isPositiveInteger(source.cardId) || !isEvidenceFamily(family)
      || typeof source.issuedAt !== 'string' || seenNodes.has(nodeIndex as number) || seenFamilies.has(family)
      || !Array.isArray(source.actualEliminatedIds)
      || actualEliminatedIds.length !== (source.actualEliminatedIds as unknown[]).length
      || !candidateTraitPhrases
      || Object.values(eliminationReasons).some(reason => typeof reason !== 'string' || reason.length < 1 || reason.length > 80)) return [];
    seenNodes.add(nodeIndex as number);
    seenFamilies.add(family);
    return [{ nodeIndex: nodeIndex as number, ref: expectedRef, cardId: source.cardId as number, family, actualEliminatedIds, eliminationReasons: eliminationReasons as Record<string, string>, candidateTraitPhrases, issuedAt: source.issuedAt }];
  }).sort((a, b) => a.nodeIndex - b.nodeIndex);
}

export function parseEvidenceFamilyCard(value: unknown): EvidenceFamilyCardContent | null {
  const source = getRecord(value);
  return isPositiveInteger(source.id) && isEvidenceFamily(source.family)
    && typeof source.observationText === 'string' && source.observationText.length > 0
    && typeof source.inferenceText === 'string' && source.inferenceText.length > 0
    && typeof source.traitPhrase === 'string' && source.traitPhrase.length > 0
    && typeof source.bonusFactText === 'string' && source.bonusFactText.length > 0
    && typeof source.traitCategory === 'string' && CATEGORY_SET.has(source.traitCategory)
    && typeof source.compareTag === 'string' && source.compareTag.length > 0
    ? {
        id: source.id as number,
        family: source.family,
        observationText: source.observationText,
        inferenceText: source.inferenceText,
        traitPhrase: source.traitPhrase,
        bonusFactText: source.bonusFactText,
        traitCategory: source.traitCategory as CaseTraitCategory,
        compareTag: source.compareTag,
      }
    : null;
}

export function resolveFieldFacts(
  applications: readonly V3EvidenceApplicationRecord[],
  cards: readonly EvidenceFamilyCardContent[],
): FieldFact[] {
  const cardsById = new Map(cards.map(card => [card.id, card]));
  return [...applications].sort((left, right) => left.nodeIndex - right.nodeIndex).flatMap(application => {
    const card = cardsById.get(application.cardId);
    return card?.family === application.family
      ? [{ nodeIndex: application.nodeIndex, family: application.family, text: card.bonusFactText }]
      : [];
  });
}

export function hydrateFamilyObservation(
  card: EvidenceFamilyCardContent,
  application: V3EvidenceApplicationRecord,
): Record<string, unknown> {
  const candidateTraitPhrases = Object.fromEntries(application.actualEliminatedIds.flatMap(speciesId => {
    const phrase = application.candidateTraitPhrases[String(speciesId)];
    return typeof phrase === 'string' && phrase.trim() ? [[String(speciesId), phrase]] : [];
  }));
  return {
    ref: application.ref,
    family: card.family,
    observationText: card.observationText,
    inferenceText: card.inferenceText,
    traitCategory: card.traitCategory,
    actualEliminatedIds: application.actualEliminatedIds,
    eliminationReasons: application.eliminationReasons,
    candidateTraitPhrases,
  };
}

function parseCandidateTraitPhrases(value: unknown): Record<string, string> | null {
  const source = getRecord(value);
  const entries = Object.entries(source);
  if (entries.length !== 6) return null;
  if (entries.some(([id, phrase]) => !/^\d+$/u.test(id) || !isPositiveInteger(Number(id))
    || typeof phrase !== 'string' || phrase.length < 1 || phrase.length > 64)) return null;
  return Object.fromEntries(entries) as Record<string, string>;
}

export function filterEliminatedCandidates<T extends { speciesId: number }>(
  candidates: readonly T[],
  eliminatedIds: Iterable<number>,
): T[] {
  const eliminated = new Set(eliminatedIds);
  return candidates.filter(candidate => !eliminated.has(candidate.speciesId));
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function resolveRunCreationIdentifiers(
  requestedCreateRequestId: unknown,
  generateUuid: () => string,
): { runId: string; createRequestId: string } | null {
  if (requestedCreateRequestId !== undefined
    && (typeof requestedCreateRequestId !== 'string' || !isUuid(requestedCreateRequestId))) return null;
  const createRequestId = requestedCreateRequestId === undefined ? generateUuid() : requestedCreateRequestId;
  const runId = generateUuid();
  return isUuid(createRequestId) && isUuid(runId) ? { runId, createRequestId } : null;
}

export type GuessDecision = 'not_ready' | 'wrong' | 'correct' | 'repeat_correct' | 'terminal_conflict';

export function decideGuess(runStatus: string | null | undefined, selectedId: number, answerId: number): GuessDecision {
  if (runStatus === 'completed') return selectedId === answerId ? 'repeat_correct' : 'terminal_conflict';
  if (runStatus !== 'deduction') return 'not_ready';
  return selectedId === answerId ? 'correct' : 'wrong';
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function parsePositiveIntegerArray(value: unknown, maxLength: number): number[] {
  if (!Array.isArray(value) || value.length > maxLength) return [];
  const values = value.filter(isPositiveInteger);
  return values.length === value.length && new Set(values).size === values.length ? values : [];
}
