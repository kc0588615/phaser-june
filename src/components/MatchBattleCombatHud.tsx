import React from 'react';
import { useGameBridge } from '@/contexts/GameBridgeContext';
import { EventBus } from '@/game/EventBus';
import type { CluePayload } from '@/game/clueConfig';
import type { MatchBattleRunState } from '@/game/matchBattle/types';
import { PIECE_CATALOG } from '@/game/matchBattle/catalog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Props {
  matchBattle: MatchBattleRunState | null;
  bankedScore: number;
  cluesGathered?: CluePayload[];
}

export function MatchBattleCombatHud({ matchBattle, bankedScore, cluesGathered = [] }: Props) {
  const { matchBattleCombat } = useGameBridge();
  const combat = matchBattleCombat ?? matchBattle?.combat ?? null;
  if (!matchBattle || !combat) return null;

  const enemyPct = combat.enemy ? (combat.enemy.hp / combat.enemy.maxHp) * 100 : 0;
  const playerPct = (combat.playerHp / combat.playerMaxHp) * 100;
  const clueIcons = Array.from(new Map(cluesGathered.map((clue) => [clue.category, clue.icon])).values()).slice(0, 4);
  const canBreakCamp = cluesGathered.length > 0;

  return (
    <section className="absolute left-1.5 top-1.5 right-1.5 z-hud grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1.5 pointer-events-none">
      <div className="glass-bg border border-ds-subtle rounded-md p-2 min-w-0">
        <div className="flex items-center justify-between text-[10px] font-bold text-ds-text-primary">
          <span>Stamina</span>
          <span>{combat.playerHp}/{combat.playerMaxHp}</span>
        </div>
        <Progress value={playerPct} className="h-1.5 mt-1" />
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-ds-text-secondary">
          <span>Turn {combat.turn}</span>
          <span className="inline-flex items-center gap-0.5 rounded border border-ds-subtle bg-ds-bg/50 px-1 py-0.5 text-ds-text-primary">
            {clueIcons.map((icon, index) => (
              <span key={`${icon}-${index}`} aria-hidden="true">{icon}</span>
            ))}
            <span>{cluesGathered.length} clue{cluesGathered.length === 1 ? '' : 's'}</span>
          </span>
          {matchBattle.partner && (
            <span className="text-ds-emerald truncate max-w-full">
              {matchBattle.partner.commonName}: {matchBattle.partner.passive.description}
            </span>
          )}
        </div>
      </div>

      <div className="glass-bg border border-ds-subtle rounded-md px-2 py-1 min-w-[92px] text-center">
        <div className="text-[9px] uppercase tracking-wider text-ds-text-muted">Banked</div>
        <div className="text-lg font-black text-ds-amber">{bankedScore}</div>
        <div className="text-[9px] text-ds-text-secondary">Score</div>
      </div>

      <div className="glass-bg border border-ds-subtle rounded-md p-2 min-w-0">
        {combat.enemy ? (
          <>
            <div className="flex items-center justify-between text-[10px] font-bold text-ds-text-primary">
              <span className="truncate">{combat.enemy.name}</span>
              <span>Wariness {combat.enemy.hp}/{combat.enemy.maxHp}</span>
            </div>
            <Progress value={enemyPct} className="h-1.5 mt-1" />
            <div className="mt-1 text-[10px] text-ds-rose">
              Next: {combat.enemy.intent.label} {combat.enemy.intent.amount > 0 ? combat.enemy.intent.amount : ''}
            </div>
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto mt-1 h-auto min-h-6 max-w-full whitespace-normal px-2 py-1 text-[10px] font-bold leading-tight"
              disabled={!canBreakCamp}
              title={canBreakCamp ? 'Break Camp' : 'Match clue gems first'}
              onClick={() => EventBus.emit('match-battle-break-camp-requested', {})}
            >
              {canBreakCamp ? 'Break Camp' : 'Match clue gems first'}
            </Button>
          </>
        ) : (
          <div className="text-[10px] text-ds-text-secondary">Route node</div>
        )}
      </div>

      <div className="col-span-3 grid grid-cols-[minmax(0,1fr)_160px] gap-1.5">
        <div className="glass-bg border border-ds-subtle rounded-md p-1.5 overflow-x-auto">
          <div className="flex gap-1.5">
            {matchBattle.piecePool.map((entry) => {
              const def = PIECE_CATALOG[entry.pieceId];
              if (!def) return null;
              return (
                <div key={entry.pieceId} className="min-w-[72px] rounded border border-ds-subtle bg-ds-bg/50 px-1.5 py-1">
                  <div className="text-[10px] font-bold" style={{ color: def.color }}>{def.label}</div>
                  <div className="text-[9px] text-ds-text-secondary">{def.trigger.toUpperCase()} · w{entry.weight}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-bg border border-ds-subtle rounded-md p-1.5 overflow-hidden">
          {combat.log.slice(0, 3).map((line, index) => (
            <div key={`${line}-${index}`} className="truncate text-[9px] text-ds-text-secondary">{line}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
