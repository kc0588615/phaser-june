import { METHOD_TYPES, type MethodType } from '@/expedition/domain';
import { getMethodOfferAtPath, isMethodType } from '@/expedition/caseOffers';
import { evidenceTierForMatchLength, isBestTargetMatchLength, type EvidenceQualityTier } from '@/expedition/evidenceQuality';
import { CASE_TRAIT_CATEGORIES, type CaseTraitCategory } from '@/lib/caseCompiler';
import type { PublicCaseV2 } from '@/lib/runProjection';
import { EVIDENCE_FAMILIES, isEvidenceFamily, type EvidenceFamily } from '@/expedition/evidenceFamilies';

const METHOD_SET = new Set<string>(METHOD_TYPES);
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
  bestTargetMatchLength: 8,
  choiceJustificationLength: 500,
} as const;

export interface PrivateCaseV1 {
  version: 1;
  answerId: number;
  chainCardIds: number[];
  caseSeed: string;
}

export interface PrivateCaseV2 {
  version: 2;
  answerId: number;
  caseSeed: string;
  cardIdMatrix: Record<MethodType, [number, number, number]>;
  signatureCardId: number;
}

export interface PrivateCaseV3 {
  version: 3;
  answerId: number;
  caseSeed: string;
  familyCardIds: Record<EvidenceFamily, number>;
  familyHintIds: Record<EvidenceFamily, number[]>;
  cascadeHintIds: number[];
}

export type PrivateCaseSnapshot = PrivateCaseV1 | PrivateCaseV2 | PrivateCaseV3;

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

export interface IssuedObservationRecord {
  nodeIndex: number;
  ref: string;
  cardId: number;
  issuedAt: string;
  qualityTier?: EvidenceQualityTier;
}

export interface ReasoningEventCommit {
  obsRef: string;
  predictedEliminatedIds: number[];
  actualEliminatedIds: number[];
  correct: boolean;
  latencyMs: number;
}

/** Client-safe elimination: compares one public marker across the symmetric candidate profiles. */
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

export interface EvidenceCardContent {
  id: number;
  method: MethodType;
  observationText: string;
  inferenceText: string;
  traitCategory: CaseTraitCategory;
  compareTag: string;
  isSignature: boolean;
  specificity: EvidenceQualityTier;
}

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parsePrivateCase(value: unknown): PrivateCaseSnapshot | null {
  const source = getRecord(value);
  if (source.version === 3) {
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
  if (source.version === 2) {
    const matrixSource = getRecord(source.cardIdMatrix);
    const matrix = {} as PrivateCaseV2['cardIdMatrix'];
    for (const method of METHOD_TYPES) {
      const ids = parsePositiveIntegerArray(matrixSource[method], 3);
      if (ids.length !== 3) return null;
      matrix[method] = [ids[0], ids[1], ids[2]];
    }
    return isPositiveInteger(source.answerId)
      && typeof source.caseSeed === 'string'
      && /^[a-f0-9]{64}$/i.test(source.caseSeed)
      && isPositiveInteger(source.signatureCardId)
      ? { version: 2, answerId: source.answerId, caseSeed: source.caseSeed, cardIdMatrix: matrix, signatureCardId: source.signatureCardId }
      : null;
  }
  const chainCardIds = parsePositiveIntegerArray(source.chainCardIds, 4);
  return isPositiveInteger(source.answerId)
    && typeof source.caseSeed === 'string'
    && /^[a-f0-9]{64}$/i.test(source.caseSeed)
    && chainCardIds.length >= 3
    && chainCardIds.length <= 4
    ? { version: 1, answerId: source.answerId, chainCardIds, caseSeed: source.caseSeed }
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

export function hydrateFamilyObservation(
  card: EvidenceFamilyCardContent,
  application: V3EvidenceApplicationRecord,
): Record<string, unknown> {
  return {
    ref: application.ref,
    family: card.family,
    observationText: card.observationText,
    inferenceText: card.inferenceText,
    traitCategory: card.traitCategory,
    compareTag: card.compareTag,
    actualEliminatedIds: application.actualEliminatedIds,
    eliminationReasons: application.eliminationReasons,
    candidateTraitPhrases: application.candidateTraitPhrases,
    traitPhrase: card.traitPhrase,
    isSignature: false,
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

export function parseIssuedObservations(value: unknown): IssuedObservationRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<number>();
  return value.flatMap(item => {
    const source = getRecord(item);
    const nodeIndex = source.nodeIndex;
    if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 3 || seen.has(nodeIndex as number)) return [];
    const expectedRef = `obs-${nodeIndex}`;
    if (source.ref !== expectedRef || !isPositiveInteger(source.cardId) || typeof source.issuedAt !== 'string') return [];
    seen.add(nodeIndex as number);
    const qualityTier = source.qualityTier;
    if (qualityTier !== undefined && qualityTier !== 1 && qualityTier !== 2 && qualityTier !== 3) return [];
    return [{ nodeIndex: nodeIndex as number, ref: expectedRef, cardId: source.cardId, issuedAt: source.issuedAt, ...(qualityTier ? { qualityTier } : {}) }];
  });
}

export function parseReasoningEvent(value: unknown): ReasoningEventCommit | null {
  const source = getRecord(value);
  const obsRef = typeof source.obsRef === 'string' && /^obs-[0-3]$/.test(source.obsRef) ? source.obsRef : null;
  const predicted = parsePositiveIntegerArray(source.predictedEliminatedIds, 6);
  const actual = parsePositiveIntegerArray(source.actualEliminatedIds, 6);
  const latencyMs = source.latencyMs;
  if (!obsRef || !Number.isInteger(latencyMs) || (latencyMs as number) < 0 || (latencyMs as number) > RUN_CHECKPOINT_LIMITS.latencyMs) return null;
  return {
    obsRef,
    predictedEliminatedIds: predicted,
    actualEliminatedIds: actual,
    correct: sameIntegerSet(predicted, actual),
    latencyMs: latencyMs as number,
  };
}

export function getEliminatedCandidateIds(reasoningEvents: unknown): Set<number> {
  const eliminated = new Set<number>();
  if (!Array.isArray(reasoningEvents)) return eliminated;
  for (const value of reasoningEvents) {
    const event = parseReasoningEvent(value);
    if (!event) continue;
    for (const speciesId of event.actualEliminatedIds) eliminated.add(speciesId);
  }
  return eliminated;
}

export function filterEliminatedCandidates<T extends { speciesId: number }>(
  candidates: readonly T[],
  eliminatedIds: Iterable<number>,
): T[] {
  const eliminated = new Set(eliminatedIds);
  return candidates.filter(candidate => !eliminated.has(candidate.speciesId));
}

export function appendReasoningEvents(
  existingValue: unknown,
  requestedValue: unknown,
  issued: readonly IssuedObservationRecord[],
): { events: ReasoningEventCommit[]; rejected: boolean } {
  const existing = Array.isArray(existingValue)
    ? existingValue.flatMap(value => {
        const parsed = parseReasoningEvent(value);
        return parsed ? [parsed] : [];
      })
    : [];
  const requested = Array.isArray(requestedValue) ? requestedValue : [];
  const issuedRefs = new Set(issued.map(item => item.ref));
  const byRef = new Map(existing.map(event => [event.obsRef, event]));
  let rejected = false;
  for (const value of requested) {
    const event = parseReasoningEvent(value);
    if (!event || !issuedRefs.has(event.obsRef)) {
      rejected = true;
      continue;
    }
    if (!byRef.has(event.obsRef)) byRef.set(event.obsRef, event);
  }
  return { events: [...byRef.values()].sort((a, b) => a.obsRef.localeCompare(b.obsRef)), rejected };
}

export function serverVerifyReasoningEvent(
  value: unknown,
  issued: readonly IssuedObservationRecord[],
  candidateIds: readonly number[],
  card: EvidenceCardContent | null,
  profiles: readonly Record<string, unknown>[],
): ReasoningEventCommit | null {
  const parsed = parseReasoningEvent(value);
  if (!parsed || !issued.some(item => item.ref === parsed.obsRef) || !card) return null;
  const profileKey = CATEGORY_TO_PROFILE_KEY[card.traitCategory];
  const actual = candidateIds.filter(speciesId => {
    const profile = profiles.find(item => item.speciesId === speciesId);
    const tags = profile?.[profileKey];
    return !Array.isArray(tags) || !tags.includes(card.compareTag);
  });
  return {
    ...parsed,
    actualEliminatedIds: actual,
    correct: sameIntegerSet(parsed.predictedEliminatedIds, actual),
  };
}

export function verifyReasoningEventBatch(
  existingValue: unknown,
  requestedValue: unknown,
  issued: readonly IssuedObservationRecord[],
  candidateIds: readonly number[],
  cards: ReadonlyMap<number, EvidenceCardContent>,
  profiles: readonly Record<string, unknown>[],
): { events: ReasoningEventCommit[]; committedRefs: string[]; error: string | null } {
  const existing = Array.isArray(existingValue) ? existingValue.flatMap(value => {
    const parsed = parseReasoningEvent(value);
    return parsed ? [parsed] : [];
  }) : [];
  const byRef = new Map(existing.map(event => [event.obsRef, event]));
  const orderedIssued = [...issued].sort((a, b) => a.nodeIndex - b.nodeIndex);
  const issuanceByRef = new Map(orderedIssued.map(item => [item.ref, item]));
  const existingRefs = new Set(existing.map(event => event.obsRef));
  if (existingRefs.size !== existing.length) return { events: existing, committedRefs: [], error: 'invalid' };
  const committedPrefixLength = orderedIssued.findIndex(item => !existingRefs.has(item.ref));
  const prefixLength = committedPrefixLength === -1 ? orderedIssued.length : committedPrefixLength;
  if (existing.some(event => !issuanceByRef.has(event.obsRef))
    || orderedIssued.slice(prefixLength).some(item => existingRefs.has(item.ref))) {
    return { events: existing, committedRefs: [], error: 'invalid' };
  }
  const requested = Array.isArray(requestedValue) ? requestedValue : [];
  const requestedByRef = new Map<string, unknown>();
  for (const value of requested) {
    const ref = getRecord(value).obsRef;
    if (typeof ref !== 'string' || !issuanceByRef.has(ref)) return { events: existing, committedRefs: [], error: 'unissued' };
    if (!requestedByRef.has(ref)) requestedByRef.set(ref, value);
  }

  const live = new Set(candidateIds);
  for (const issuance of orderedIssued.slice(0, prefixLength)) {
    const event = byRef.get(issuance.ref)!;
    for (const id of event.actualEliminatedIds) live.delete(id);
  }
  const requestedPending = orderedIssued.slice(prefixLength).filter(item => requestedByRef.has(item.ref));
  if (requestedPending.length > 0) {
    const requestedRefs = new Set(requestedPending.map(item => item.ref));
    const requestedPrefix = orderedIssued.slice(prefixLength, prefixLength + requestedPending.length);
    if (requestedPrefix.some(item => !requestedRefs.has(item.ref))) {
      return { events: existing, committedRefs: [], error: 'out_of_order' };
    }
  }
  const committedRefs: string[] = [];
  for (const issuance of orderedIssued) {
    if (byRef.has(issuance.ref) || !requestedByRef.has(issuance.ref)) continue;
    const verified = serverVerifyReasoningEvent(requestedByRef.get(issuance.ref), issued, [...live], cards.get(issuance.cardId) ?? null, profiles);
    if (!verified) return { events: existing, committedRefs: [], error: 'invalid' };
    byRef.set(issuance.ref, verified);
    committedRefs.push(issuance.ref);
    for (const id of verified.actualEliminatedIds) live.delete(id);
  }
  return { events: [...byRef.values()].sort((a, b) => a.obsRef.localeCompare(b.obsRef)), committedRefs, error: null };
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

export type TerminalMutationDecision = 'allow' | 'idempotent' | 'reject';

export function decideObservationIssuance(runStatus: string | null | undefined, alreadyIssued: boolean): TerminalMutationDecision {
  if (alreadyIssued) return 'idempotent';
  return runStatus === 'completed' ? 'reject' : 'allow';
}

export function decideCheckpointMutation(runStatus: string | null | undefined, changesState: boolean): TerminalMutationDecision {
  if (runStatus !== 'completed') return 'allow';
  return changesState ? 'reject' : 'idempotent';
}

export function decideGuess(runStatus: string | null | undefined, selectedId: number, answerId: number): GuessDecision {
  if (runStatus === 'completed') return selectedId === answerId ? 'repeat_correct' : 'terminal_conflict';
  if (runStatus !== 'deduction') return 'not_ready';
  return selectedId === answerId ? 'correct' : 'wrong';
}

export function hydrateObservation(card: EvidenceCardContent, nodeIndex: number, qualityTier?: EvidenceQualityTier) {
  return {
    ref: `obs-${nodeIndex}`,
    method: card.method,
    observationText: card.observationText,
    inferenceText: card.inferenceText,
    traitCategory: card.traitCategory,
    compareTag: card.compareTag,
    isSignature: card.isSignature,
    ...(qualityTier ? { qualityTier } : {}),
  };
}

export function parseEvidenceCard(value: unknown): EvidenceCardContent | null {
  const source = getRecord(value);
  const compareTags = Array.isArray(source.compareTags) ? source.compareTags : [];
  return isPositiveInteger(source.id)
    && typeof source.method === 'string' && METHOD_SET.has(source.method)
    && typeof source.observationText === 'string' && source.observationText.length > 0
    && typeof source.inferenceText === 'string' && source.inferenceText.length > 0
    && typeof source.traitCategory === 'string' && CATEGORY_SET.has(source.traitCategory)
    && compareTags.length === 1 && typeof compareTags[0] === 'string'
    && typeof source.isSignature === 'boolean'
    && (source.specificity === 1 || source.specificity === 2 || source.specificity === 3)
    ? {
        id: source.id,
        method: source.method as MethodType,
        observationText: source.observationText,
        inferenceText: source.inferenceText,
        traitCategory: source.traitCategory as CaseTraitCategory,
        compareTag: compareTags[0],
        isSignature: source.isSignature,
        specificity: source.specificity,
      }
    : null;
}

export function validateNodeCompletionInput(value: unknown): { scoreEarned: number; movesUsed: number; objectiveProgress: number; bestTargetMatchLength: number } | null {
  const source = getRecord(value);
  const scoreEarned = source.scoreEarned ?? 0;
  const movesUsed = source.movesUsed ?? 0;
  const objectiveProgress = source.objectiveProgress ?? 0;
  const bestTargetMatchLength = source.bestTargetMatchLength ?? 0;
  if (!boundedInteger(scoreEarned, RUN_CHECKPOINT_LIMITS.bankedScore)
    || !boundedInteger(movesUsed, 10_000)
    || !boundedInteger(objectiveProgress, RUN_CHECKPOINT_LIMITS.objectiveProgress)
    || !isBestTargetMatchLength(bestTargetMatchLength)) return null;
  return { scoreEarned, movesUsed, objectiveProgress, bestTargetMatchLength } as {
    scoreEarned: number; movesUsed: number; objectiveProgress: number; bestTargetMatchLength: number;
  };
}

export type MethodChoiceDecision =
  | { kind: 'commit'; method: MethodType; offered: [MethodType, MethodType] }
  | { kind: 'idempotent'; method: MethodType; offered: [MethodType, MethodType] }
  | { kind: 'reject'; reason: 'invalid_method' | 'not_active' | 'not_offered' | 'method_reused' | 'choice_locked' | 'invalid_offer_path' };

export function decideMethodChoice(input: {
  publicCase: PublicCaseV2;
  nodeIndex: number;
  nodeStatus: string;
  requestedMethod: unknown;
  persistedMethod: unknown;
  priorMethods: readonly MethodType[];
}): MethodChoiceDecision {
  if (!isMethodType(input.requestedMethod)) return { kind: 'reject', reason: 'invalid_method' };
  const offered = getMethodOfferAtPath(input.publicCase.offerTree, input.priorMethods);
  if (!offered || input.nodeIndex !== input.priorMethods.length) return { kind: 'reject', reason: 'invalid_offer_path' };
  if (isMethodType(input.persistedMethod)) {
    return input.persistedMethod === input.requestedMethod
      ? { kind: 'idempotent', method: input.persistedMethod, offered }
      : { kind: 'reject', reason: 'choice_locked' };
  }
  if (input.nodeStatus !== 'active') return { kind: 'reject', reason: 'not_active' };
  if (input.priorMethods.includes(input.requestedMethod)) return { kind: 'reject', reason: 'method_reused' };
  if (!offered.includes(input.requestedMethod)) return { kind: 'reject', reason: 'not_offered' };
  return { kind: 'commit', method: input.requestedMethod, offered };
}

export type QualityCheckpointDecision =
  | { kind: 'store'; bestTargetMatchLength: number }
  | { kind: 'idempotent'; bestTargetMatchLength: number }
  | { kind: 'reject'; reason: 'invalid_quality' | 'node_not_active' };

export function decideQualityCheckpoint(
  nodeStatus: string,
  existingValue: unknown,
  incomingValue: unknown,
): QualityCheckpointDecision {
  if (!isBestTargetMatchLength(incomingValue)) return { kind: 'reject', reason: 'invalid_quality' };
  const existing = isBestTargetMatchLength(existingValue) ? existingValue : 0;
  if (nodeStatus !== 'active') return incomingValue <= existing
    ? { kind: 'idempotent', bestTargetMatchLength: existing }
    : { kind: 'reject', reason: 'node_not_active' };
  const bestTargetMatchLength = Math.max(existing, incomingValue);
  return bestTargetMatchLength === existing
    ? { kind: 'idempotent', bestTargetMatchLength }
    : { kind: 'store', bestTargetMatchLength };
}

export function qualityTierForSuccessfulNode(
  objectiveProgress: number,
  objectiveTarget: number,
  bestTargetMatchLength: number,
): EvidenceQualityTier | null {
  if (objectiveProgress < objectiveTarget) return null;
  // Tier tracks direct-swap matches only, so a cascade-only completion can
  // arrive with no qualifying length; a met objective still earns Broad.
  return evidenceTierForMatchLength(bestTargetMatchLength) ?? 1;
}

export function isV2SignatureInterpretationEligible(
  issued: readonly IssuedObservationRecord[],
  interpretedRefs: ReadonlySet<string>,
): boolean {
  return issued.some(item => item.nodeIndex < 3 && interpretedRefs.has(item.ref))
    && issued.filter(item => item.nodeIndex < 3).every(item => interpretedRefs.has(item.ref));
}

export type CitationValidation =
  | { ok: true; refs: string[] }
  | { ok: false; reason: 'wrong_count' | 'duplicate' | 'unissued' | 'uninterpreted' | 'invalid_ref' };

export function validateEvidenceCitations(
  value: unknown,
  issued: readonly IssuedObservationRecord[],
  interpretedRefs: ReadonlySet<string>,
): CitationValidation {
  if (!Array.isArray(value) || value.some(ref => typeof ref !== 'string' || !/^obs-[0-3]$/.test(ref))) {
    return { ok: false, reason: 'invalid_ref' };
  }
  const refs = value as string[];
  if (new Set(refs).size !== refs.length) return { ok: false, reason: 'duplicate' };
  const required = Math.min(2, interpretedRefs.size);
  if (refs.length !== required) return { ok: false, reason: 'wrong_count' };
  const issuedRefs = new Set(issued.map(item => item.ref));
  if (refs.some(ref => !issuedRefs.has(ref))) return { ok: false, reason: 'unissued' };
  if (refs.some(ref => !interpretedRefs.has(ref))) return { ok: false, reason: 'uninterpreted' };
  return { ok: true, refs: [...refs] };
}

function boundedInteger(value: unknown, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function parsePositiveIntegerArray(value: unknown, maxLength: number): number[] {
  if (!Array.isArray(value) || value.length > maxLength) return [];
  const values = value.filter(isPositiveInteger);
  return values.length === value.length && new Set(values).size === values.length ? values : [];
}

function sameIntegerSet(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  const rightValues = new Set(right);
  return left.every(value => rightValues.has(value));
}
