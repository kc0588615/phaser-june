import React, { useCallback, useEffect, useRef } from 'react';
import type { DeductionCampState, ClueCategoryKey } from '@/types/expedition';
import { getClueShopCost, getDeductionFinalScore, getGuessBonuses, CLUE_CATEGORY_KEYS } from '@/types/expedition';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { DenseClueGrid } from './DenseClueGrid';

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
      x: W / 2 + (Math.random() - 0.5) * 60,
      y: H * 0.4,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 10 - 4,
      r: Math.random() * 4 + 2,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      rv: (Math.random() - 0.5) * 0.3,
    });
  }
  let frame = 0;
  const loop = () => {
    if (frame++ > 120) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.rot += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - frame / 120);
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
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
    <div style={{
      height: '100%', width: '100%', overflowY: 'auto', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      color: 'var(--ds-text-primary)', fontFamily: 'inherit',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--ds-accent-cyan)', textAlign: 'center' }}>
        Deduction Camp
      </h2>

      {/* Score bar — glass pill */}
      <div className="glass-bg shadow-card" style={{
        display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', flexWrap: 'wrap',
        padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--ds-border-subtle)',
      }}>
        <div>
          <span style={{ color: 'var(--ds-text-secondary)' }}>Banked </span>
          <span style={{ color: 'var(--ds-accent-cyan)', fontWeight: 700 }}>{camp.bankedScore}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ds-text-secondary)' }}>Spent </span>
          <span style={{ color: 'var(--ds-accent-rose)', fontWeight: 700 }}>{camp.scoreSpent}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ds-text-secondary)' }}>Left </span>
          <span style={{ color: 'var(--ds-accent-emerald)', fontWeight: 700 }}>{availableScore}</span>
        </div>
        {camp.thoughtDiscountPct > 0 && (
          <div>
            <span style={{ color: 'var(--ds-text-secondary)' }}>Disc </span>
            <span style={{ color: 'var(--ds-gem-focus)', fontWeight: 700 }}>{Math.round(camp.thoughtDiscountPct * 100)}%</span>
          </div>
        )}
      </div>

      {/* Horizontal scrolling Clue Market */}
      <div>
        <div style={{ fontSize: '11px', color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
          Clue Market
        </div>
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0',
          scrollSnapType: 'x mandatory',
        }}>
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
                onClick={() => handleBuy(cat)}
                className="glass-bg"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  minWidth: '80px', flexShrink: 0, padding: '10px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${canBuy ? meta.color : 'var(--ds-border-subtle)'}`,
                  cursor: canBuy ? 'pointer' : 'default',
                  opacity: canBuy ? 1 : 0.5,
                  scrollSnapAlign: 'start',
                  transition: 'all 0.2s ease',
                  color: 'var(--ds-text-primary)',
                }}
              >
                <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: '9px', color: 'var(--ds-text-muted)' }}>
                  {entry.purchased} bought
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 700, marginTop: '2px',
                  padding: '2px 8px', borderRadius: '9999px',
                  background: canBuy ? 'linear-gradient(135deg, var(--ds-accent-cyan), #06b6d4)' : 'var(--ds-surface-elevated)',
                  color: canBuy ? 'var(--ds-background)' : 'var(--ds-text-muted)',
                }}>
                  {cost} pts
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Purchased clues display */}
      <div style={{ width: '100%' }}>
        <DenseClueGrid
          clues={camp.revealedClues}
          hasSelectedSpecies={true}
          emptyMessage="Buy clues to build your field notes before making a guess."
        />
      </div>

      {/* Species guess */}
      {!isCorrect && (
        <div style={{ width: '100%', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', marginBottom: '6px', textAlign: 'center' }}>
            Which species is it?
          </div>
          <SpeciesGuessSelector
            speciesId={speciesId}
            hiddenSpeciesName={hiddenSpeciesName}
            onGuessSubmitted={onGuessResult}
          />
        </div>
      )}

      {/* Correct result */}
      {isCorrect && (
        <div style={{ textAlign: 'center', padding: '12px', flexShrink: 0 }}>
          <div style={{ color: 'var(--ds-accent-emerald)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Correct!
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ds-text-secondary)', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <span>Guess bonus: +{guessBonus}</span>
            <span>Efficiency: +{efficiencyBonus}</span>
          </div>
          <div style={{ color: 'var(--ds-accent-cyan)', fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {finalScore} pts
          </div>
        </div>
      )}

      {/* Wrong guess */}
      {isWrong && (
        <div style={{ textAlign: 'center', padding: '8px', flexShrink: 0 }}>
          <div style={{ color: 'var(--ds-accent-rose)', fontSize: '14px', fontWeight: 600 }}>
            Not quite — buy a clue and try again (-25 pts)
          </div>
        </div>
      )}

      {/* Confetti canvas overlay */}
      <canvas ref={confettiRef} style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
      }} />

      {/* Return to Globe */}
      {isCorrect && (
        <button
          onClick={onFinish}
          style={{
            margin: '0 auto', padding: '12px 32px', fontSize: '14px', fontWeight: 700,
            background: 'linear-gradient(135deg, var(--ds-accent-cyan), #06b6d4)',
            color: 'var(--ds-background)', border: 'none', borderRadius: '9999px', cursor: 'pointer', flexShrink: 0,
            boxShadow: 'var(--ds-glow-cyan)',
          }}
        >
          Return to Globe
        </button>
      )}
    </div>
  );
};
