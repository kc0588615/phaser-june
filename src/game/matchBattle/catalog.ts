import type { ActionGemType } from '@/game/constants';
import type { AffinityType } from '@/expedition/affinities';
import type {
  ArmamentDef,
  EnemyIntent,
  MatchBattleEnemy,
  MatchBattleNodeType,
  MatchBattleRouteNode,
  MatchBattleRunState,
  PieceDef,
  PiecePoolEntry,
  RewardOption,
  UpgradeDef,
} from './types';
import type { MatchBattlePartner } from './partner';

export const MATCH_BATTLE_SCHEMA_VERSION = 4;
export const MATCH_BATTLE_LOOT_CHANCE = 0.35;
export const MATCH_BATTLE_PIECE_IDS = ['sword', 'staff', 'shield'] as const satisfies readonly ActionGemType[];

const RETIRED_PIECE_MAP: Partial<Record<ActionGemType, typeof MATCH_BATTLE_PIECE_IDS[number]>> = {
  crate: 'shield',
  power: 'staff',
  thought: 'shield',
  key: 'staff',
  multiplier: 'sword',
  grenade: 'sword',
  blade_drive: 'sword',
  caltrops: 'sword',
  shield_unit: 'shield',
};

export const PIECE_CATALOG: Partial<Record<ActionGemType, PieceDef>> = {
  sword: {
    id: 'sword',
    label: 'Spotting Scope',
    trigger: 'match',
    role: 'Damage',
    description: 'MATCH: deal Data.',
    color: '#dc2626',
    effect: { stat: 'damage', baseValue: 2, levelScaling: 1 },
  },
  shield: {
    id: 'shield',
    label: 'Camo Blind',
    trigger: 'match',
    role: 'Recovery',
    description: 'MATCH: recover Stamina.',
    color: '#94a3b8',
    effect: { stat: 'heal', baseValue: 1, levelScaling: 1 },
  },
  staff: {
    id: 'staff',
    label: 'Telephoto Lens',
    trigger: 'match',
    role: 'Heavy',
    description: 'MATCH: deal heavier Data.',
    color: '#6366f1',
    effect: { stat: 'pierce', baseValue: 3, levelScaling: 1 },
  },
};

export const ARMAMENT_CATALOG: ArmamentDef[] = [
  { id: 'assault_potion', name: 'Trail Mix', kind: 'risk', trigger: 'turn_start', description: '+4 Approach each turn; spend 2 Stamina.' },
  { id: 'credit_ledger', name: 'Grant Ledger', kind: 'economy', trigger: 'combat_end', description: '+8 Grants after each encounter.' },
  { id: 'iron_jaw', name: 'Reinforced Blind', kind: 'defense', trigger: 'combat_start', description: '+3 Stamina at encounter start.' },
  { id: 'pain_transmitter', name: 'Endurance Log', kind: 'scaling', trigger: 'on_hp_loss', description: 'Taking damage counters with Data.' },
  { id: 'crescendo_earrings', name: 'Smartwatch', kind: 'scaling', trigger: 'on_cascade', description: 'Every cascade adds +1 Data.' },
];

export const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'board_col', name: 'Wider Viewfinder', type: 'board_col', cost: 3, description: 'Wider board, higher combo ceiling.' },
  { id: 'board_row', name: 'Deeper Range', type: 'board_row', cost: 3, description: 'Taller board, more drop setup.' },
  // 'snippet_row' upgrade removed: snippetsEnabled is true at MB init (createInitialMatchBattleState), so the purchase was a no-op.
  { id: 'arm_slot', name: 'Gear Harness', type: 'armament_slot', cost: 3, description: 'Carry one more Field Gear.' },
  { id: 'reduce_rate', name: 'Optimize Kit', type: 'piece_weight_down', cost: 1, description: 'Reduce a piece spawn weight; 0 removes it.' },
];

const BASE_POOL: PiecePoolEntry[] = [
  { pieceId: 'sword', level: 1, weight: 3 },
  { pieceId: 'shield', level: 1, weight: 3 },
  { pieceId: 'staff', level: 1, weight: 3 },
];

const MIN_SPAWNABLE_PIECES = 3;

const FORM_BONUS: Partial<Record<AffinityType, ActionGemType>> = {
  feline: 'sword',
  ungulate: 'shield',
  insect: 'staff',
  primate: 'shield',
  reptile: 'staff',
  avian: 'shield',
  fish: 'staff',
  arachnid: 'sword',
  amphibian: 'shield',
  burrower: 'staff',
};

export function createInitialPiecePool(form: AffinityType | null): PiecePoolEntry[] {
  const pool = BASE_POOL.map((entry) => ({ ...entry }));
  const bonus = form ? FORM_BONUS[form] : null;
  if (bonus) {
    const existing = pool.find((entry) => entry.pieceId === bonus);
    if (existing) existing.weight += 1;
    else pool.push({ pieceId: bonus, level: 1, weight: 2 });
  }
  return pool;
}

export function countSpawnablePieces(pool: PiecePoolEntry[]): number {
  return pool.filter((entry) => entry.weight > 0 && MATCH_BATTLE_PIECE_IDS.includes(entry.pieceId as any)).length;
}

export function hasMinimumSpawnablePieces(pool: PiecePoolEntry[]): boolean {
  return countSpawnablePieces(pool) >= MIN_SPAWNABLE_PIECES;
}

/**
 * Guarantee at least MIN_SPAWNABLE_PIECES positive-weight entries by restoring starter pieces.
 * Repairs corrupt/legacy persisted pools so board generation cannot break. Valid pools pass through unchanged.
 */
export function ensureMinimumSpawnablePieces(pool: PiecePoolEntry[]): PiecePoolEntry[] {
  const next = normalizePiecePool(pool);
  for (const starter of BASE_POOL) {
    if (countSpawnablePieces(next) >= MIN_SPAWNABLE_PIECES) break;
    const existing = next.find((entry) => entry.pieceId === starter.pieceId);
    if (existing) {
      if (existing.weight <= 0) existing.weight = starter.weight;
    } else {
      next.push({ ...starter });
    }
  }
  return next;
}

function mapPieceId(pieceId: ActionGemType): typeof MATCH_BATTLE_PIECE_IDS[number] | null {
  if (MATCH_BATTLE_PIECE_IDS.includes(pieceId as any)) return pieceId as typeof MATCH_BATTLE_PIECE_IDS[number];
  return RETIRED_PIECE_MAP[pieceId] ?? null;
}

export function normalizePiecePool(pool: PiecePoolEntry[]): PiecePoolEntry[] {
  const merged = new Map<ActionGemType, PiecePoolEntry>();
  for (const entry of pool) {
    const pieceId = mapPieceId(entry.pieceId);
    if (!pieceId) continue;
    const existing = merged.get(pieceId);
    if (existing) {
      existing.weight += Math.max(0, entry.weight);
      existing.level = Math.max(existing.level, entry.level ?? 1);
    } else {
      merged.set(pieceId, { pieceId, level: entry.level ?? 1, weight: Math.max(0, entry.weight) });
    }
  }
  return MATCH_BATTLE_PIECE_IDS
    .map(pieceId => merged.get(pieceId))
    .filter((entry): entry is PiecePoolEntry => Boolean(entry));
}

export function createInitialMatchBattleState(
  form: AffinityType | null,
  nodeCount: number,
  partner: MatchBattlePartner | null = null,
): MatchBattleRunState {
  const hpBonus = partner?.passive.hpBonus ?? 0;
  return {
    schemaVersion: MATCH_BATTLE_SCHEMA_VERSION,
    enabled: true,
    form,
    routeNodes: createRouteMap(nodeCount),
    currentRouteNodeId: 'n0',
    piecePool: createInitialPiecePool(form),
    armaments: [],
    upgrades: [],
    credits: 40,
    markForm: 0,
    rerollCost: 40,
    maxGearSlots: 3,
    boardCols: 4,
    boardRows: 5,
    lootChance: MATCH_BATTLE_LOOT_CHANCE,
    partnerSpeciesId: partner?.speciesId ?? null,
    partner,
    snippetsEnabled: true,
    outcome: 'active',
    rewardDraft: [],
    combat: {
      playerHp: 60 + hpBonus,
      playerMaxHp: 60 + hpBonus,
      turn: 1,
      enemy: null,
      log: [],
    },
  };
}

export function normalizeMatchBattleRunState(
  raw: Partial<MatchBattleRunState> | null | undefined,
  form: AffinityType | null,
  nodeCount: number,
): MatchBattleRunState {
  const base = createInitialMatchBattleState(form, nodeCount);
  if (!raw) return base;

  // Persisted blob passes the API sanitizer (valid JSON) but its shape is not schema-checked;
  // guard every array/object field so a corrupt checkpoint falls back to defaults instead of crashing resume.
  const asArray = <T,>(value: unknown): T[] | null => (Array.isArray(value) && value.length ? (value as T[]) : null);
  const rawPiecePool = asArray<MatchBattleRunState['piecePool'][number]>(raw.piecePool);
  const rawArmaments = asArray<MatchBattleRunState['armaments'][number]>(raw.armaments);
  const rawCombat = raw.combat && typeof raw.combat === 'object' && !Array.isArray(raw.combat) ? raw.combat : undefined;
  const rawPartner = raw.partner && typeof raw.partner === 'object' && !Array.isArray(raw.partner)
    ? raw.partner as MatchBattlePartner
    : null;

  return {
    ...base,
    ...raw,
    schemaVersion: MATCH_BATTLE_SCHEMA_VERSION,
    routeNodes: asArray<MatchBattleRunState['routeNodes'][number]>(raw.routeNodes) ?? base.routeNodes,
    currentRouteNodeId: raw.currentRouteNodeId ?? base.currentRouteNodeId,
    piecePool: ensureMinimumSpawnablePieces(rawPiecePool ? rawPiecePool.map((entry) => ({ ...entry })) : base.piecePool),
    armaments: rawArmaments?.map((entry) => ARMAMENT_CATALOG.find((candidate) => candidate.id === entry.id) ?? { ...entry }) ?? base.armaments,
    upgrades: asArray<string>(raw.upgrades) ?? base.upgrades,
    credits: raw.credits ?? base.credits,
    markForm: raw.markForm ?? base.markForm,
    rerollCost: raw.rerollCost ?? base.rerollCost,
    maxGearSlots: raw.maxGearSlots ?? base.maxGearSlots,
    boardCols: raw.boardCols ?? base.boardCols,
    // Clamp to the current base so saves from before the board enlargement
    // don't resume on a too-small board (board_row upgrades only add rows).
    boardRows: Math.max(raw.boardRows ?? base.boardRows, base.boardRows),
    lootChance: typeof raw.lootChance === 'number' && Number.isFinite(raw.lootChance)
      ? Math.max(0, Math.min(1, raw.lootChance))
      : base.lootChance,
    partnerSpeciesId: typeof raw.partnerSpeciesId === 'number' && Number.isFinite(raw.partnerSpeciesId)
      ? raw.partnerSpeciesId
      : rawPartner?.speciesId ?? null,
    partner: rawPartner,
    snippetsEnabled: raw.snippetsEnabled ?? base.snippetsEnabled,
    rewardDraft: normalizeRewardDraft(asArray<MatchBattleRunState['rewardDraft'][number]>(raw.rewardDraft) ?? base.rewardDraft),
    combat: {
      ...base.combat,
      ...rawCombat,
      turn: 1,
      log: [],
      enemy: null,
    },
  };
}

function normalizeRewardDraft(options: RewardOption[]): RewardOption[] {
  return options
    .map((option): RewardOption | null => {
      if (option.kind !== 'piece') return option;
      const pieceId = mapPieceId(option.pieceId);
      if (!pieceId) return null;
      return {
        ...option,
        pieceId,
        label: PIECE_CATALOG[pieceId]!.label,
        description: PIECE_CATALOG[pieceId]!.description,
      };
    })
    .filter((option): option is RewardOption => Boolean(option));
}

// Explicit lane layouts for the opening depths of a run.
const EARLY_DEPTHS: MatchBattleNodeType[][] = [
  ['enemy'],
  ['enemy', 'event', 'trivia'],
  ['elite', 'shop', 'enemy'],
  ['treasure', 'gis_recon', 'repair'],
  ['repair', 'elite', 'enemy'],
];

// Rotating mix for extended runs (depthCount > EARLY_DEPTHS.length + 1).
// Cycled by (depth - EARLY_DEPTHS.length) % length so combats and utility stay
// interleaved instead of collapsing to a single repeated pattern. Never contains
// 'leader' — the final depth is the only leader.
const MIDDLE_CYCLE: MatchBattleNodeType[][] = [
  ['enemy', 'event', 'trivia'],
  ['elite', 'shop', 'enemy'],
  ['treasure', 'gis_recon', 'repair'],
  ['challenge', 'repair', 'enemy'],
  ['elite', 'event', 'enemy'],
];

export function createRouteMap(nodeCount: number): MatchBattleRouteNode[] {
  const depthCount = Math.max(6, nodeCount);
  const nodes: MatchBattleRouteNode[] = [];

  for (let depth = 0; depth < depthCount; depth++) {
    const isFinalDepth = depth === depthCount - 1;
    const types: MatchBattleNodeType[] = isFinalDepth
      ? ['leader']
      : depth < EARLY_DEPTHS.length
        ? EARLY_DEPTHS[depth]
        : MIDDLE_CYCLE[(depth - EARLY_DEPTHS.length) % MIDDLE_CYCLE.length];
    types.forEach((type, lane) => {
      nodes.push({
        id: `n${depth}_${lane}`,
        type,
        depth,
        lane,
        next: [],
        completed: false,
        available: depth === 0,
        sourceNodeIndex: Math.min(depth, Math.max(0, nodeCount - 1)),
        enemyId: type === 'elite' ? 'elite'
          : type === 'leader' ? 'leader'
          : type === 'challenge' ? 'challenge'
          : type === 'enemy' ? 'enemy'
          : undefined,
      });
    });
  }

  nodes.forEach((node) => {
    node.next = nodes
      .filter((candidate) => candidate.depth === node.depth + 1 && Math.abs(candidate.lane - node.lane) <= 1)
      .map((candidate) => candidate.id);
  });
  const first = nodes.find((node) => node.depth === 0);
  if (first) first.id = 'n0';
  return nodes;
}

export function createEnemy(type: MatchBattleNodeType, difficulty: number): MatchBattleEnemy | null {
  if (['shop', 'treasure', 'event', 'repair', 'trivia', 'gis_recon'].includes(type)) return null;
  const scale = Math.max(1, difficulty);
  const maxHp = type === 'leader' ? 36 + scale * 4 : type === 'elite' ? 26 + scale * 3 : type === 'challenge' ? 22 + scale * 2 : 16 + scale * 2;
  return {
    id: `${type}_${scale}`,
    name: type === 'leader' ? 'Apex Specimen' : type === 'elite' ? 'Elusive Specimen' : type === 'challenge' ? 'Field Trial' : 'Skittish Critter',
    maxHp,
    hp: maxHp,
    intent: nextIntent(type, 1, scale),
  };
}

export function nextIntent(type: MatchBattleNodeType, turn: number, difficulty: number): EnemyIntent {
  if (type === 'leader' && turn % 3 === 0) return { type: 'attack_debuff', amount: 14 + difficulty, debuffId: 'burn', label: 'Bolt + Glare' };
  if (type === 'elite' && turn % 2 === 0) return { type: 'debuff', amount: 0, debuffId: 'web', label: 'Tangle Board' };
  if (type === 'challenge' && turn % 2 === 1) return { type: 'attack', amount: 10 + difficulty, label: 'Sudden Bolt' };
  return { type: 'attack', amount: 7 + difficulty * 2, label: 'Startle' };
}

export function createRewardDraft(run: MatchBattleRunState): RewardOption[] {
  const owned = new Set(run.piecePool.map((entry) => entry.pieceId));
  const pieceIds = [...MATCH_BATTLE_PIECE_IDS];
  const candidates = pieceIds
    .filter((id) => !owned.has(id))
    .slice(0, 3);
  const fallback = run.piecePool.slice(0, 3).map((entry) => entry.pieceId);
  const chosenPieces = candidates.length >= 3 ? candidates : [...candidates, ...fallback].slice(0, 3);
  const arm = ARMAMENT_CATALOG.find((candidate) => !run.armaments.some((ownedArm) => ownedArm.id === candidate.id)) ?? ARMAMENT_CATALOG[0];

  return [
    ...chosenPieces.map((pieceId) => ({
      kind: 'piece' as const,
      pieceId,
      label: PIECE_CATALOG[pieceId]!.label,
      description: owned.has(pieceId) ? '+1 spawn weight for this piece.' : PIECE_CATALOG[pieceId]!.description,
    })),
    { kind: 'armament', armamentId: arm.id, label: arm.name, description: arm.description },
  ];
}
