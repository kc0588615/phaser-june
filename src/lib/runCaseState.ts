import { METHOD_TYPES, type MethodType } from '@/expedition/domain';
import { CASE_TRAIT_CATEGORIES, type CaseTraitCategory } from '@/lib/caseCompiler';

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
} as const;

export interface PrivateCaseSnapshot {
  answerId: number;
  chainCardIds: number[];
  caseSeed: string;
}

export interface IssuedObservationRecord {
  nodeIndex: number;
  ref: string;
  cardId: number;
  issuedAt: string;
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
  profiles: readonly import('@/lib/deductionEngine').DeductionProfile[],
  alreadyEliminatedIds: readonly number[],
  traitCategory: CaseTraitCategory,
  compareTag: string,
): number[] {
  const key = CATEGORY_TO_PROFILE_KEY[traitCategory];
  const alreadyEliminated = new Set(alreadyEliminatedIds);
  return profiles
    .filter(profile => !alreadyEliminated.has(profile.speciesId) && !profile[key].includes(compareTag))
    .map(profile => profile.speciesId)
    .sort((a, b) => a - b);
}

export interface EvidenceCardContent {
  id: number;
  method: MethodType;
  observationText: string;
  inferenceText: string;
  traitCategory: CaseTraitCategory;
  compareTag: string;
  isSignature: boolean;
}

export function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parsePrivateCase(value: unknown): PrivateCaseSnapshot | null {
  const source = getRecord(value);
  const chainCardIds = parsePositiveIntegerArray(source.chainCardIds, 4);
  return isPositiveInteger(source.answerId)
    && typeof source.caseSeed === 'string'
    && /^[a-f0-9]{64}$/i.test(source.caseSeed)
    && chainCardIds.length >= 3
    && chainCardIds.length <= 4
    ? { answerId: source.answerId, chainCardIds, caseSeed: source.caseSeed }
    : null;
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
    return [{ nodeIndex: nodeIndex as number, ref: expectedRef, cardId: source.cardId, issuedAt: source.issuedAt }];
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

export function hydrateObservation(card: EvidenceCardContent, nodeIndex: number) {
  return {
    ref: `obs-${nodeIndex}`,
    method: card.method,
    observationText: card.observationText,
    inferenceText: card.inferenceText,
    traitCategory: card.traitCategory,
    compareTag: card.compareTag,
    isSignature: card.isSignature,
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
    ? {
        id: source.id,
        method: source.method as MethodType,
        observationText: source.observationText,
        inferenceText: source.inferenceText,
        traitCategory: source.traitCategory as CaseTraitCategory,
        compareTag: compareTags[0],
        isSignature: source.isSignature,
      }
    : null;
}

export function validateNodeCompletionInput(value: unknown): { scoreEarned: number; movesUsed: number; objectiveProgress: number } | null {
  const source = getRecord(value);
  const scoreEarned = source.scoreEarned ?? 0;
  const movesUsed = source.movesUsed ?? 0;
  const objectiveProgress = source.objectiveProgress ?? 0;
  if (!boundedInteger(scoreEarned, RUN_CHECKPOINT_LIMITS.bankedScore)
    || !boundedInteger(movesUsed, 10_000)
    || !boundedInteger(objectiveProgress, RUN_CHECKPOINT_LIMITS.objectiveProgress)) return null;
  return { scoreEarned, movesUsed, objectiveProgress } as { scoreEarned: number; movesUsed: number; objectiveProgress: number };
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
  return left.length === right.length && left.every(value => right.includes(value));
}
