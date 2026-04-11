import React, { useCallback, useEffect, useRef } from 'react';
import type { DeductionCampState, ClueCategoryKey } from '@/types/expedition';
import { getClueShopCost, getDeductionFinalScore, getGuessBonuses, CLUE_CATEGORY_KEYS } from '@/types/expedition';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { DenseClueGrid } from './DenseClueGrid';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatPill } from '@/components/ui/stat-pill';

/* Lightweight canvas confetti — no deps */
function fireConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width = canvas.parentElement!.clientWidth;
  const H = canvas.height = canvas.parentElement!.clientHeight;
  const COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#f43f5e', '#a78bfa', '#ffffff'];
  const pieces: { x: number; y: number; vx: number; vy: number; r: number; c: string; rot: number; rv: number }[] = [];
  for (let i = 0; i < 80; i++) {
    pieces.push({
      x: W / 2 + (Math.random() - 0.5) * 60, y: H * 0.4,
      vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 10 - 4,
      r: Math.random() * 4 + 2, c: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2, rv: (Math.random() - 0.5) * 0.3,
    });
  }
  let frame = 0;
  const loop = () => {
    if (frame++ > 120) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.rot += p.rv;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - frame / 120);
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const CATEGORY_META: Record<ClueCategoryKey, { label: string; icon: string; color: string }> = {
  classification: { label: 'Class',   icon: '\u{1F9EC}', color: 'var(--ds-gem-observe)' },
  habitat:        { label: 'Habitat', icon: '\u{1F333}', color: 'var(--ds-gem-camouflage)' },
  geographic:     { label: 'Geo',     icon: '\u{1F5FA}', color: 'var(--ds-gem-scan)' },
  morphology:     { label: 'Morph',   icon: '\u{1F43E}', color: 'var(--ds-gem-pack)' },
  behavior:       { label: 'Behav',   icon: '\u{1F4A8}', color: 'var(--ds-accent-amber)' },
  life_cycle:     { label: 'Life',    icon: '\u{23F3}',  color: 'var(--ds-text-muted)' },
  conservation:   { label: 'Conserv', icon: '\u{1F6E1}', color: 'var(--ds-gem-notes)' },
  key_facts:      { label: 'Facts',   icon: '\u{1F52E}', color: 'var(--ds-gem-focus)' },
};

interface Props {
  camp: DeductionCampState;
  speciesId: number;
  hiddenSpeciesName: string;
  onPurchase: (category: ClueCategoryKey, cost: number) => void;
  onGuessResult: (isCorrect: boolean) => void;
  onFinish: () => void;
}

export const DeductionCamp: React.FC<Props> = ({ camp, speciesId, hiddenSpeciesName, onPurchase, onGuessResult, onFinish }) => {
  const availableScore = camp.bankedScore - camp.scoreSpent;
  const totalPaid = camp.clueShop.reduce((sum, e) => sum + e.purchased, 0);
  const isCorrect = camp.guessResult === 'correct';
  const isWrong = camp.guessResult === 'wrong';

  const confettiRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    if (isCorrect && !firedRef.current && confettiRef.current) {
      firedRef.current = true;
      fireConfetti(confettiRef.current);
    }
  }, [isCorrect]);

  const handleBuy = useCallback((cat: ClueCategoryKey) => {
    const entry = camp.clueShop.find(e => e.category === cat);
    if (!entry) return;
    const cost = getClueShopCost(entry.purchased, entry.fragmentCount, camp.thoughtDiscountPct);
    if (cost > availableScore) return;
    onPurchase(cat, cost);
  }, [camp, availableScore, onPurchase]);

  const { guessBonus, efficiencyBonus } = isCorrect
    ? getGuessBonuses(totalPaid, true)
    : { guessBonus: 0, efficiencyBonus: 0 };

  const finalScore = getDeductionFinalScore(camp);

  return (
    <div className="h-full w-full overflow-y-auto p-ds-lg flex flex-col gap-ds-md text-ds-text-primary box-border">
      <h2 className="m-0 text-lg font-semibold text-ds-cyan text-center">Deduction Camp</h2>

      {/* Score bar */}
      <GlassPanel pill className="flex justify-center gap-ds-lg text-ds-body flex-wrap px-ds-lg py-ds-sm">
        <StatPill label="Banked" value={camp.bankedScore} />
        <StatPill label="Spent" value={camp.scoreSpent} color="var(--ds-accent-rose)" />
        <StatPill label="Left" value={availableScore} color="var(--ds-accent-emerald)" />
        {camp.thoughtDiscountPct > 0 && (
          <StatPill label="Disc" value={`${Math.round(camp.thoughtDiscountPct * 100)}%`} color="var(--ds-gem-focus)" />
        )}
      </GlassPanel>

      {/* Clue Market */}
      <div>
        <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1.5">Clue Market</div>
        <div className="flex gap-ds-sm overflow-x-auto py-ds-xs snap-x snap-mandatory">
          {CLUE_CATEGORY_KEYS.map(cat => {
            const meta = CATEGORY_META[cat];
            const entry = camp.clueShop.find(e => e.category === cat);
            if (!entry) return null;
            const cost = getClueShopCost(entry.purchased, entry.fragmentCount, camp.thoughtDiscountPct);
            const canBuy = cost <= availableScore && !isCorrect;
            return (
              <button
                key={cat}
                disabled={!canBuy}
                aria-label={`Buy ${meta.label} clue for ${cost} points${!canBuy ? ' (insufficient points)' : ''}`}
                onClick={() => handleBuy(cat)}
                className={`
                  glass-bg flex flex-col items-center gap-ds-xs min-w-[80px] shrink-0
                  py-2.5 px-ds-sm rounded-xl snap-start transition-all duration-200 text-ds-text-primary
                  ${canBuy ? 'cursor-pointer opacity-100' : 'cursor-default opacity-50'}
                `}
                style={{ border: `1px solid ${canBuy ? meta.color : 'var(--ds-border-subtle)'}` }}
              >
                <span className="text-xl">{meta.icon}</span>
                <span className="text-ds-caption font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[9px] text-ds-text-muted">{entry.purchased} bought</span>
                <span
                  className={`text-ds-caption font-bold mt-0.5 px-ds-sm py-0.5 rounded-full ${
                    canBuy ? 'text-ds-bg' : 'bg-ds-surface-elevated text-ds-text-muted'
                  }`}
                  style={canBuy ? { background: 'var(--ds-gradient-cta)' } : undefined}
                >
                  {cost} pts
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchased clues */}
      <div className="w-full">
        <DenseClueGrid clues={camp.revealedClues} hasSelectedSpecies={true} emptyMessage="Buy clues to build your field notes before making a guess." />
      </div>

      {/* Species guess */}
      {!isCorrect && (
        <div className="w-full shrink-0">
          <div className="text-ds-body text-ds-text-secondary mb-1.5 text-center">Which species is it?</div>
          <SpeciesGuessSelector speciesId={speciesId} hiddenSpeciesName={hiddenSpeciesName} onGuessSubmitted={onGuessResult} />
        </div>
      )}

      {/* Correct result */}
      {isCorrect && (
        <div role="status" aria-live="polite" className="text-center p-ds-md shrink-0">
          <div className="text-xl font-bold text-ds-emerald mb-ds-sm">Correct!</div>
          <div className="text-ds-body text-ds-text-secondary flex justify-center gap-ds-lg">
            <span>Guess bonus: +{guessBonus}</span>
            <span>Efficiency: +{efficiencyBonus}</span>
          </div>
          <div className="text-3xl font-bold text-ds-cyan mt-ds-sm">{finalScore} pts</div>
        </div>
      )}

      {isWrong && (
        <div role="alert" className="text-center p-ds-sm shrink-0">
          <div className="text-ds-body font-semibold text-ds-rose">Not quite — buy a clue and try again (-25 pts)</div>
        </div>
      )}

      {/* Confetti */}
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none z-confetti" />

      {/* Return to Globe */}
      {isCorrect && (
        <button
          onClick={onFinish}
          className="mx-auto py-ds-md px-8 text-ds-body font-bold text-ds-bg border-none rounded-full cursor-pointer shrink-0 shadow-glow-cyan"
          style={{ background: 'var(--ds-gradient-cta)' }}
        >
          Return to Globe
        </button>
      )}
    </div>
  );
};
