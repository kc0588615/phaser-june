import React, { useCallback } from 'react';
import type { DeductionCampState, ClueCategoryKey } from '@/types/expedition';
import { getClueShopCost, getDeductionFinalScore, getGuessBonuses, CLUE_CATEGORY_KEYS } from '@/types/expedition';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { DenseClueGrid } from './DenseClueGrid';

const CATEGORY_META: Record<ClueCategoryKey, { label: string; icon: string; color: string }> = {
  classification: { label: 'Classification', icon: '\u{1F9EC}', color: '#ef4444' },
  habitat:        { label: 'Habitat',        icon: '\u{1F333}', color: '#22c55e' },
  geographic:     { label: 'Geographic',     icon: '\u{1F5FA}', color: '#3b82f6' },
  morphology:     { label: 'Morphology',     icon: '\u{1F43E}', color: '#f97316' },
  behavior:       { label: 'Behavior',       icon: '\u{1F4A8}', color: '#eab308' },
  life_cycle:     { label: 'Life Cycle',     icon: '\u{23F3}',  color: '#1e293b' },
  conservation:   { label: 'Conservation',   icon: '\u{1F6E1}', color: '#e2e8f0' },
  key_facts:      { label: 'Key Facts',      icon: '\u{1F52E}', color: '#a855f7' },
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
      display: 'flex', flexDirection: 'column', gap: '10px',
      color: '#e2e8f0', fontFamily: 'sans-serif',
      boxSizing: 'border-box',
    }}>
      <h2 style={{ margin: 0, fontSize: '16px', color: '#67e8f9', textAlign: 'center' }}>
        Deduction Camp
      </h2>

      {/* Score bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ color: '#94a3b8' }}>Banked: </span>
          <span style={{ color: '#22d3ee', fontWeight: 700 }}>{camp.bankedScore}</span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Spent: </span>
          <span style={{ color: '#f87171', fontWeight: 700 }}>{camp.scoreSpent}</span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Available: </span>
          <span style={{ color: '#4ade80', fontWeight: 700 }}>{availableScore}</span>
        </div>
        {camp.thoughtDiscountPct > 0 && (
          <div>
            <span style={{ color: '#94a3b8' }}>Thought Discount: </span>
            <span style={{ color: '#c084fc', fontWeight: 700 }}>{Math.round(camp.thoughtDiscountPct * 100)}%</span>
          </div>
        )}
      </div>

      {/* Clue Market */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px', maxWidth: '520px', margin: '0 auto', width: '100%',
        flexShrink: 0,
      }}>
        {CLUE_CATEGORY_KEYS.map(cat => {
          const meta = CATEGORY_META[cat];
          const entry = camp.clueShop.find(e => e.category === cat);
          if (!entry) return null;
          const cost = getClueShopCost(entry.purchased, entry.fragmentCount, camp.thoughtDiscountPct);
          const canBuy = cost <= availableScore && !isCorrect;
          return (
            <div key={cat} style={{
              background: 'rgba(30,41,59,0.8)', border: '1px solid #334155',
              borderRadius: '6px', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '18px' }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: meta.color }}>{meta.label}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  {entry.fragmentCount} frags · {entry.purchased} bought
                </div>
              </div>
              <button
                disabled={!canBuy}
                onClick={() => handleBuy(cat)}
                style={{
                  padding: '4px 10px', fontSize: '11px', fontWeight: 700,
                  background: canBuy ? 'linear-gradient(135deg, #0ea5e9, #06b6d4)' : '#334155',
                  color: canBuy ? 'white' : '#64748b',
                  border: 'none', borderRadius: '4px', cursor: canBuy ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                }}
              >
                {cost} pts
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchased clues display */}
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%' }}>
        <DenseClueGrid
          clues={camp.revealedClues}
          hasSelectedSpecies={true}
          emptyMessage="Buy clues to build your field notes before making a guess."
        />
      </div>

      {/* Species guess — reuse existing dropdown */}
      {!isCorrect && (
        <div style={{ maxWidth: '420px', margin: '4px auto 0', width: '100%', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px', textAlign: 'center' }}>
            Which species is it?
          </div>
          <SpeciesGuessSelector
            speciesId={speciesId}
            hiddenSpeciesName={hiddenSpeciesName}
            onGuessSubmitted={onGuessResult}
          />
        </div>
      )}

      {/* Result display */}
      {isCorrect && (
        <div style={{ textAlign: 'center', padding: '12px', flexShrink: 0 }}>
          <div style={{ color: '#4ade80', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Correct!
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <span>Guess bonus: +{guessBonus}</span>
            <span>Efficiency: +{efficiencyBonus}</span>
          </div>
          <div style={{ color: '#22d3ee', fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {finalScore} pts
          </div>
        </div>
      )}

      {isWrong && (
        <div style={{ textAlign: 'center', padding: '8px', flexShrink: 0 }}>
          <div style={{ color: '#f87171', fontSize: '14px', fontWeight: 600 }}>
            Not quite — buy a clue and try again (-25 pts)
          </div>
        </div>
      )}

      {/* Finish button */}
      {isCorrect && (
        <button
          onClick={onFinish}
          style={{
            margin: '0 auto', padding: '10px 32px', fontSize: '14px', fontWeight: 700,
            background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
          }}
        >
          New Expedition
        </button>
      )}
    </div>
  );
};
