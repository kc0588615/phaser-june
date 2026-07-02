// Lightweight Match Battle tuning readout. All output is gated behind the
// `mbDebug` localStorage flag (set `localStorage.mbDebug = '1'`), so it stays
// silent in normal play. Per-combat stats are accumulated in the Phaser scene;
// run-level events (reward/reroll/upgrade) are logged from the React reducers.

export interface MatchBattleCombatStats {
  damageDealt: number;
  damageTaken: number;
  focusGained: number;
  focusUsed: number;
  lootMatches: number;
  cluesRevealed: number;
  debuffsSeeded: number;
  debuffsCleansed: number;
}

export function createMatchBattleCombatStats(): MatchBattleCombatStats {
  return {
    damageDealt: 0,
    damageTaken: 0,
    focusGained: 0,
    focusUsed: 0,
    lootMatches: 0,
    cluesRevealed: 0,
    debuffsSeeded: 0,
    debuffsCleansed: 0,
  };
}

export function isMatchBattleDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('mbDebug') === '1';
  } catch {
    return false;
  }
}

export function logMatchBattleCombatEnd(
  outcome: 'won' | 'lost',
  turns: number,
  stats: MatchBattleCombatStats,
  lootChance?: number,
): void {
  if (!isMatchBattleDebug()) return;
  const lootLabel = lootChance == null ? '' : ` · loot ${Math.round(lootChance * 100)}%`;
  console.groupCollapsed(`[MB] combat ${outcome} · ${turns} turn${turns === 1 ? '' : 's'}${lootLabel}`);
  console.table({ turns, lootChance, ...stats });
  console.groupEnd();
}

export function logMatchBattleRunEvent(event: 'reward' | 'reroll' | 'upgrade', detail: string): void {
  if (!isMatchBattleDebug()) return;
  console.log(`[MB] ${event}: ${detail}`);
}

export function logMatchBattleRunSummary(
  outcome: 'won' | 'lost',
  lootChance: number,
  cluesRevealed: number,
): void {
  if (!isMatchBattleDebug()) return;
  console.table({
    outcome,
    lootChance,
    lootPercent: `${Math.round(lootChance * 100)}%`,
    cluesRevealed,
  });
}
