import { METHOD_TYPES, type MethodType } from '@/expedition/domain';

export const METHOD_QUESTIONS: Record<MethodType, string> = {
  track: 'What signs did the animal leave behind?',
  observe: 'What can a direct sighting reveal?',
  listen: 'What can its sounds reveal?',
  survey: 'Which habitat conditions fit the animal?',
  analyze: 'What can a biological sample confirm?',
};

export type MethodOfferPair = [MethodType, MethodType];

export interface MethodOfferTree {
  nodeIndex: 0 | 1 | 2;
  nodeType: string;
  offered: MethodOfferPair;
  branches: Partial<Record<MethodType, MethodOfferTree | null>>;
}

const DEFAULT_RANKING = ['track', 'observe', 'survey', 'listen', 'analyze'] as const;

const NODE_METHOD_RANKINGS: Record<string, readonly MethodType[]> = {
  riverbank_sweep: ['track', 'survey', 'analyze', 'observe', 'listen'],
  dense_canopy: ['observe', 'listen', 'track', 'survey', 'analyze'],
  urban_fringe: ['observe', 'track', 'survey', 'listen', 'analyze'],
  elevation_ridge: ['observe', 'listen', 'survey', 'track', 'analyze'],
  storm_window: ['survey', 'track', 'analyze', 'listen', 'observe'],
  analysis: ['analyze', 'observe', 'survey', 'track', 'listen'],
  custom: DEFAULT_RANKING,
};

export function getMethodRanking(nodeType: string): readonly MethodType[] {
  return NODE_METHOD_RANKINGS[nodeType] ?? DEFAULT_RANKING;
}

/** Public-only derivation: node types and the choices made on the current branch. */
export function deriveMethodOfferTree(nodeTypes: readonly string[]): MethodOfferTree {
  if (nodeTypes.length !== 3 || nodeTypes.some(nodeType => typeof nodeType !== 'string' || nodeType.length === 0)) {
    throw new Error('Method offers require exactly three public node types.');
  }

  const build = (nodeIndex: 0 | 1 | 2, chosen: readonly MethodType[]): MethodOfferTree => {
    const offered = getMethodRanking(nodeTypes[nodeIndex]).filter(method => !chosen.includes(method)).slice(0, 2);
    if (offered.length !== 2) throw new Error('Method offer path exhausted.');
    const pair: MethodOfferPair = [offered[0], offered[1]];
    const branches: MethodOfferTree['branches'] = {};
    for (const method of pair) {
      branches[method] = nodeIndex === 2
        ? null
        : build((nodeIndex + 1) as 1 | 2, [...chosen, method]);
    }
    return { nodeIndex, nodeType: nodeTypes[nodeIndex], offered: pair, branches };
  };

  return build(0, []);
}

export function getMethodOfferAtPath(
  tree: MethodOfferTree,
  priorChoices: readonly MethodType[],
): MethodOfferPair | null {
  let cursor: MethodOfferTree | null = tree;
  for (const choice of priorChoices) {
    if (!cursor || !cursor.offered.includes(choice)) return null;
    cursor = cursor.branches[choice] ?? null;
  }
  return cursor ? [...cursor.offered] as MethodOfferPair : null;
}

/** Rejects stale, answer-influenced, or manually edited persisted offer trees. */
export function validatePersistedOfferTree(
  nodeTypes: readonly string[],
  value: unknown,
): MethodOfferTree | null {
  let expected: MethodOfferTree;
  try { expected = deriveMethodOfferTree(nodeTypes); }
  catch { return null; }
  return sameOfferTree(expected, value) ? expected : null;
}

function sameOfferTree(expected: MethodOfferTree | null, value: unknown): boolean {
  if (expected === null) return value === null;
  const source = record(value);
  if (source.nodeIndex !== expected.nodeIndex || source.nodeType !== expected.nodeType) return false;
  if (!Array.isArray(source.offered) || source.offered.length !== 2
    || source.offered[0] !== expected.offered[0] || source.offered[1] !== expected.offered[1]) return false;
  const branches = record(source.branches);
  const keys = Object.keys(branches);
  if (keys.length !== 2 || expected.offered.some(method => !keys.includes(method))) return false;
  return expected.offered.every(method => sameOfferTree(expected.branches[method] ?? null, branches[method]));
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function isMethodType(value: unknown): value is MethodType {
  return typeof value === 'string' && METHOD_TYPES.includes(value as MethodType);
}
