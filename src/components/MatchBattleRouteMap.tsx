import React from 'react';
import type { MatchBattleRunState, MatchBattleNodeType } from '@/game/matchBattle/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  matchBattle: MatchBattleRunState;
  onSelect: (routeNodeId: string) => void;
}

const NODE_LABELS: Record<MatchBattleNodeType, string> = {
  enemy: 'Encounter',
  elite: 'Rare Sighting',
  leader: 'Apex Encounter',
  shop: 'Shop',
  treasure: 'Treasure',
  event: 'Event',
  repair: 'Repair',
  challenge: 'Challenge',
  trivia: 'Fact/Fiction',
  gis_recon: 'Route Recon',
};

export function MatchBattleRouteMap({ matchBattle, onSelect }: Props) {
  const depths = Array.from(new Set(matchBattle.routeNodes.map((node) => node.depth))).sort((a, b) => a - b);

  return (
    <div className="absolute inset-0 z-deduction glass-bg backdrop-blur-xl overflow-auto p-4">
      <section className="mx-auto flex min-h-full max-w-4xl flex-col justify-center">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="m-0 text-2xl font-black text-ds-text-primary">Route Map</h2>
            <p className="m-0 mt-1 text-ds-body text-ds-text-secondary">Pick your next sighting. Warier animals pay better.</p>
          </div>
          <div className="rounded-md border border-ds-subtle px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-ds-text-muted">Build</div>
            <div className="text-sm font-bold text-ds-cyan">{matchBattle.armaments.length} arm · {matchBattle.piecePool.length} pieces</div>
          </div>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${depths.length}, minmax(92px, 1fr))` }}>
          {depths.map((depth) => (
            <div key={depth} className="flex min-h-[260px] flex-col justify-around gap-2">
              {matchBattle.routeNodes.filter((node) => node.depth === depth).map((node) => (
                <Button
                  key={node.id}
                  variant={node.available ? 'default' : 'secondary'}
                  disabled={!node.available}
                  onClick={() => onSelect(node.id)}
                  className={cn(
                    'h-14 rounded-md text-xs font-black',
                    node.completed && 'opacity-55',
                    node.type === 'elite' && node.available && 'border border-ds-amber',
                    node.type === 'leader' && node.available && 'border border-ds-rose'
                  )}
                >
                  {node.completed ? 'Done' : NODE_LABELS[node.type]}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
