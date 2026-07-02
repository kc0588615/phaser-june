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

export const MATCH_BATTLE_SCHEMA_VERSION = 3;

export const PIECE_CATALOG: Record<ActionGemType, PieceDef> = {
  sword: {
    id: 'sword',
    label: 'Spotting Scope',
    trigger: 'match',
    role: 'Pressure',
    description: 'MATCH: +1 Data per level.',
    color: '#dc2626',
    effect: { stat: 'pressure', baseValue: 1, levelScaling: 1 },
  },
  shield: {
    id: 'shield',
    label: 'Camo Blind',
    trigger: 'match',
    role: 'Cover',
    description: 'MATCH: +1 Cover per level.',
    color: '#94a3b8',
    effect: { stat: 'cover', baseValue: 1, levelScaling: 1 },
  },
  staff: {
    id: 'staff',
    label: 'Telephoto Lens',
    trigger: 'match',
    role: 'Pierce',
    description: 'MATCH: deal Direct View per level (ignores Camouflage).',
    color: '#6366f1',
    effect: { stat: 'unblocked', baseValue: 1, levelScaling: 1 },
  },
  crate: {
    id: 'crate',
    label: 'Grant Cache',
    trigger: 'drop',
    role: 'Economy',
    description: 'DROP: earn Grants when it lands on the bottom row.',
    color: '#b45309',
    effect: { stat: 'supplies', baseValue: 5, levelScaling: 1 },
  },
  power: {
    id: 'power',
    label: 'Camera Trap',
    trigger: 'break',
    role: 'Charge',
    description: 'BREAK: adjacent matches discharge stored Focus as Data.',
    color: '#06b6d4',
    effect: { stat: 'unblocked', baseValue: 2, levelScaling: 1, chargeMultiplier: true, chargeCap: 5 },
  },
  thought: {
    id: 'thought',
    label: 'Field Guide',
    trigger: 'break',
    role: 'Support',
    description: 'BREAK: strengthens nearby match output.',
    color: '#10b981',
    effect: { stat: 'cover', baseValue: 1, levelScaling: 1 },
  },
  key: {
    id: 'key',
    label: 'Critter Track',
    trigger: 'drop',
    role: 'Transform',
    description: 'DROP: +1 Focus charge.',
    color: '#f59e0b',
    effect: { baseValue: 0, levelScaling: 0, transformCount: 1 },
  },
  multiplier: {
    id: 'multiplier',
    label: 'Camera Flash',
    trigger: 'break',
    role: 'Risk',
    description: 'BREAK: seed Glare interference.',
    color: '#ec4899',
    effect: { baseValue: 0, levelScaling: 0, spawnId: 'burn', spawnCount: 1 },
  },
  grenade: {
    id: 'grenade',
    label: 'Drone Scan',
    trigger: 'match',
    role: 'Area',
    description: 'MATCH: heavy Data on the target critter.',
    color: '#f97316',
    effect: { stat: 'damage_all', baseValue: 5, levelScaling: 1 },
  },
  blade_drive: {
    id: 'blade_drive',
    label: 'Trail Marker',
    trigger: 'drop',
    role: 'Pressure',
    description: 'DROP: +3 Data.',
    color: '#ef4444',
    effect: { stat: 'pressure', baseValue: 3, levelScaling: 1 },
  },
  caltrops: {
    id: 'caltrops',
    label: 'Off-Trail Scramble',
    trigger: 'match',
    role: 'Risk',
    description: 'MATCH: strong Data; spend 2 Stamina.',
    color: '#7f1d1d',
    effect: { stat: 'damage_all', baseValue: 4, levelScaling: 1 },
  },
  shield_unit: {
    id: 'shield_unit',
    label: 'Pop-up Hide',
    trigger: 'break',
    role: 'Cover',
    description: 'BREAK: gain Cover.',
    color: '#67e8f9',
    effect: { stat: 'cover', baseValue: 1, levelScaling: 1 },
  },
};

export const ARMAMENT_CATALOG: ArmamentDef[] = [
  { id: 'assault_potion', name: 'Trail Mix', kind: 'risk', trigger: 'turn_start', description: '+4 Approach each turn; spend 2 Stamina.' },
  { id: 'action_booster', name: 'Multi-Tool', kind: 'energy', description: '+1 max Action.' },
  { id: 'credit_ledger', name: 'Grant Ledger', kind: 'economy', trigger: 'combat_end', description: '+8 Grants after each encounter.' },
  { id: 'iron_jaw', name: 'Reinforced Blind', kind: 'defense', trigger: 'combat_start', description: 'Start each encounter with 6 Cover.' },
  { id: 'pain_transmitter', name: 'Endurance Log', kind: 'accel', trigger: 'on_hp_loss', description: 'Spent Stamina adds extra Focus.' },
  { id: 'crescendo_earrings', name: 'Smartwatch', kind: 'scaling', trigger: 'on_cascade', description: 'Every cascade adds +1 Approach this turn.' },
];

export const UPGRADE_CATALOG: UpgradeDef[] = [
  { id: 'board_col', name: 'Wider Viewfinder', type: 'board_col', cost: 3, description: 'Wider board, higher combo ceiling.' },
  { id: 'board_row', name: 'Deeper Range', type: 'board_row', cost: 3, description: 'Taller board, more drop setup.' },
  // 'snippet_row' upgrade removed: snippetsEnabled is true at MB init (createInitialMatchBattleState), so the purchase was a no-op.
  { id: 'max_energy', name: 'Stamina Training', type: 'energy', cost: 2, description: 'One extra paid swap each turn.' },
  { id: 'accel_cell', name: 'Focus Lens', type: 'accel', cost: 2, description: 'Lower Focus threshold needed to discharge.' },
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
  primate: 'crate',
  reptile: 'power',
  avian: 'thought',
  fish: 'key',
  arachnid: 'multiplier',
  amphibian: 'shield',
  burrower: 'key',
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
  return pool.filter((entry) => entry.weight > 0).length;
}

export function hasMinimumSpawnablePieces(pool: PiecePoolEntry[]): boolean {
  return countSpawnablePieces(pool) >= MIN_SPAWNABLE_PIECES;
}

/**
 * Guarantee at least MIN_SPAWNABLE_PIECES positive-weight entries by restoring starter pieces.
 * Repairs corrupt/legacy persisted pools so board generation cannot break. Valid pools pass through unchanged.
 */
export function ensureMinimumSpawnablePieces(pool: PiecePoolEntry[]): PiecePoolEntry[] {
  const next = pool.map((entry) => ({ ...entry }));
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

export function createInitialMatchBattleState(form: AffinityType | null, nodeCount: number): MatchBattleRunState {
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
    boardRows: 3,
    snippetsEnabled: true,
    outcome: 'active',
    rewardDraft: [],
    combat: {
      playerHp: 60,
      playerMaxHp: 60,
      guard: 0,
      attack: 0,
      energy: 4,
      maxEnergy: 4,
      maxAccel: 10,
      focusStored: 0,
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
  if (raw.schemaVersion !== MATCH_BATTLE_SCHEMA_VERSION) return base;

  // Persisted blob passes the API sanitizer (valid JSON) but its shape is not schema-checked;
  // guard every array/object field so a corrupt checkpoint falls back to defaults instead of crashing resume.
  const asArray = <T,>(value: unknown): T[] | null => (Array.isArray(value) && value.length ? (value as T[]) : null);
  const rawPiecePool = asArray<MatchBattleRunState['piecePool'][number]>(raw.piecePool);
  const rawArmaments = asArray<MatchBattleRunState['armaments'][number]>(raw.armaments);
  const rawCombat = raw.combat && typeof raw.combat === 'object' && !Array.isArray(raw.combat) ? raw.combat : undefined;

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
    boardRows: raw.boardRows ?? base.boardRows,
    snippetsEnabled: raw.snippetsEnabled ?? base.snippetsEnabled,
    rewardDraft: asArray<MatchBattleRunState['rewardDraft'][number]>(raw.rewardDraft) ?? base.rewardDraft,
    combat: {
      ...base.combat,
      ...rawCombat,
      guard: 0,
      attack: 0,
      energy: rawCombat?.maxEnergy ?? base.combat.maxEnergy,
      focusStored: rawCombat?.focusStored ?? (rawCombat as { accel?: number } | undefined)?.accel ?? 0,
      turn: 1,
      log: [],
      enemy: null,
    },
  };
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
    guard: type === 'elite' ? 6 : 0,
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
  const pieceIds = Object.keys(PIECE_CATALOG) as ActionGemType[];
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
      label: PIECE_CATALOG[pieceId].label,
      description: owned.has(pieceId) ? '+1 spawn weight for this piece.' : PIECE_CATALOG[pieceId].description,
    })),
    { kind: 'armament', armamentId: arm.id, label: arm.name, description: arm.description },
  ];
}
