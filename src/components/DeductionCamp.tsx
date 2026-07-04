import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, A11y } from 'swiper/modules';
import type { DeductionCampState, ClueCategoryKey, ComparativeDeductionState } from '@/types/expedition';
import { getGuessBonuses, getDeductionFinalScore, CLUE_CATEGORY_KEYS, deductionCatToWalletKey } from '@/types/expedition';
import type { DeductionClue, ProcessedClue, DeductionProfile, ReferenceAttempt } from '@/lib/deductionEngine';
import { isFilteringCategory, filterCandidates, getProfileKeyForCategory } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import type { RunEvidenceBundle } from '@/types/gis';
import { SpeciesGuessSelector } from './SpeciesGuessSelector';
import { DenseClueGrid } from './DenseClueGrid';
import { GlassPanel } from '@/components/ui/glass-panel';
import { StatPill } from '@/components/ui/stat-pill';

import 'swiper/css';
import 'swiper/css/free-mode';

function getLegacyClueShopCost(purchased: number, fragmentCount: number, thoughtDiscountPct = 0): number {
  const baseCosts = [40, 70, 110, 160, 220];
  const base = baseCosts[Math.min(purchased, baseCosts.length - 1)];
  const discount = Math.floor(fragmentCount / 3) * 15;
  const discountedBase = Math.round((base - discount) * Math.max(0, 1 - thoughtDiscountPct));
  return Math.max(10, discountedBase);
}

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

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  habitat:        { label: 'Habitat',      icon: '\u{1F333}', color: 'var(--ds-gem-camouflage)' },
  morphology:     { label: 'Morphology',   icon: '\u{1F43E}', color: 'var(--ds-gem-pack)' },
  diet:           { label: 'Diet',         icon: '\u{1F969}', color: 'var(--ds-accent-amber)' },
  behavior:       { label: 'Behavior',     icon: '\u{1F4A8}', color: 'var(--ds-accent-amber)' },
  reproduction:   { label: 'Reproduction', icon: '\u{1F95A}', color: 'var(--ds-gem-notes)' },
  taxonomy:       { label: 'Taxonomy',     icon: '\u{1F9EC}', color: 'var(--ds-gem-observe)' },
  key_fact:       { label: 'Key Fact',     icon: '\u{1F52E}', color: 'var(--ds-gem-focus)' },
  geography:      { label: 'Geography',    icon: '\u{1F5FA}', color: 'var(--ds-gem-scan)' },
  conservation:   { label: 'Conservation', icon: '\u{1F6E1}', color: 'var(--ds-accent-rose)' },
};

// Legacy clue-shop category meta (for fallback)
const LEGACY_CATEGORY_META: Record<ClueCategoryKey, { label: string; icon: string; color: string }> = {
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
  comp: ComparativeDeductionState | null;
  speciesId: number;
  hiddenSpeciesName: string;
  evidenceBundle?: RunEvidenceBundle | null;
  onPurchase: (category: ClueCategoryKey, cost: number) => void;
  onGuessResult: (isCorrect: boolean) => void;
  onProcessClue: (clueId: number) => void;
  onPlaceReference: (referenceSpeciesId: number, clueId: number) => void;
  onComparativeGuess: (isCorrect: boolean) => void;
  onFinish: () => void;
}

export const DeductionCamp: React.FC<Props> = ({
  camp, comp, speciesId, hiddenSpeciesName, evidenceBundle,
  onPurchase, onGuessResult, onProcessClue, onPlaceReference, onComparativeGuess, onFinish,
}) => {
  const availableScore = camp.bankedScore - camp.scoreSpent - (comp?.scoreSpent ?? 0);
  const isCorrect = camp.guessResult === 'correct' || comp?.guessResult === 'correct';
  const isWrong = camp.guessResult === 'wrong' || comp?.guessResult === 'wrong';

  const confettiRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    if (isCorrect && !firedRef.current && confettiRef.current) {
      firedRef.current = true;
      fireConfetti(confettiRef.current);
    }
  }, [isCorrect]);

  // If comparative deduction data is loaded, render the new UI.
  // The comparative UI handles route evidence inline (in its sticky context bar).
  if (comp) {
    return (
      <ComparativeDeductionUI
        camp={camp}
        comp={comp}
        speciesId={speciesId}
        hiddenSpeciesName={hiddenSpeciesName}
        evidenceBundle={evidenceBundle ?? null}
        availableScore={availableScore}
        isCorrect={isCorrect}
        isWrong={isWrong}
        onProcessClue={onProcessClue}
        onPlaceReference={onPlaceReference}
        onGuessResult={onComparativeGuess}
        onFinish={onFinish}
        confettiRef={confettiRef}
      />
    );
  }

  // Fallback: legacy clue-shop UI (if comparative data hasn't loaded yet)
  const legacyEvidence = evidenceBundle && evidenceBundle.fingerprints.length > 0 ? (
    <div className="mb-3 px-3 py-2 rounded-md bg-[rgba(14,165,233,0.08)] border border-[rgba(14,165,233,0.2)]">
      <div className="text-ds-caption font-bold text-ds-cyan uppercase tracking-wider mb-1.5">Route Evidence</div>
      <div className="flex flex-wrap gap-1.5">
        {evidenceBundle.uniqueProtectedAreas.slice(0, 3).map((name, i) => (
          <span key={`pa-${i}`} className="text-[10px] bg-ds-surface px-1.5 py-0.5 rounded text-ds-text-secondary">{name}</span>
        ))}
        {Object.entries(evidenceBundle.featureClassCounts).map(([fc, count]) => (
          <span key={fc} className="text-[10px] bg-ds-surface px-1.5 py-0.5 rounded text-ds-text-secondary">{fc.replace(/_/g, ' ')} x{count}</span>
        ))}
      </div>
    </div>
  ) : null;
  return <>{legacyEvidence}<LegacyClueShop camp={camp} speciesId={speciesId} hiddenSpeciesName={hiddenSpeciesName}
    availableScore={availableScore} isCorrect={isCorrect} isWrong={isWrong}
    onPurchase={onPurchase} onGuessResult={onGuessResult} onFinish={onFinish} confettiRef={confettiRef} /></>;
};

// ---------------------------------------------------------------------------
// Comparative Deduction UI (new Phase 3)
// ---------------------------------------------------------------------------

interface CompUIProps {
  camp: DeductionCampState;
  comp: ComparativeDeductionState;
  speciesId: number;
  hiddenSpeciesName: string;
  evidenceBundle: RunEvidenceBundle | null;
  availableScore: number;
  isCorrect: boolean;
  isWrong: boolean;
  onProcessClue: (clueId: number) => void;
  onPlaceReference: (referenceSpeciesId: number, clueId: number) => void;
  onGuessResult: (isCorrect: boolean) => void;
  onFinish: () => void;
  confettiRef: React.RefObject<HTMLCanvasElement>;
}

function ComparativeDeductionUI({
  camp, comp, speciesId, hiddenSpeciesName, evidenceBundle, availableScore,
  isCorrect, isWrong, onProcessClue, onPlaceReference, onGuessResult, onFinish, confettiRef,
}: CompUIProps) {
  const [selectedClueId, setSelectedClueId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ReferenceAttempt | null>(null);

  // Group clues by category
  const cluesByCategory = useMemo(() => {
    const map = new Map<DeductionClueCategory, DeductionClue[]>();
    for (const c of comp.mysteryClues) {
      const arr = map.get(c.category) ?? [];
      arr.push(c);
      map.set(c.category, arr);
    }
    return map;
  }, [comp.mysteryClues]);

  // Track processed clue IDs
  const processedIds = useMemo(() => new Set(comp.processedClues.map(pc => pc.clueId)), [comp.processedClues]);

  // Selected clue info
  const selectedClue = useMemo(() => {
    if (!selectedClueId) return null;
    return comp.processedClues.find(pc => pc.clueId === selectedClueId) ?? null;
  }, [selectedClueId, comp.processedClues]);

  // Narrowed candidate pool — actually constrains the final guess list,
  // so the player's deduction work pays off.
  const candidateNames = useMemo(() => {
    const eliminated = new Set(comp.eliminatedSpeciesIds);
    const pool = filterCandidates(comp.albumProfiles, comp.confirmedTags, eliminated);
    const names = pool.map(p => p.commonName);
    // The mystery is not in the album profiles; ensure it remains a guessable option.
    if (hiddenSpeciesName && hiddenSpeciesName !== 'Unknown Species' && !names.includes(hiddenSpeciesName)) {
      names.push(hiddenSpeciesName);
    }
    return names;
  }, [comp.albumProfiles, comp.confirmedTags, comp.eliminatedSpeciesIds, hiddenSpeciesName]);

  // Handle tapping an album card — compare against selected clue
  const handleReferenceSelect = useCallback((refId: number) => {
    if (!selectedClueId || !selectedClue) return;
    if (selectedClue.status !== 'processed') return;
    if (!isFilteringCategory(selectedClue.category)) return;
    onPlaceReference(refId, selectedClueId);
    // Find the result that was just created
    setSelectedClueId(null);
  }, [selectedClueId, selectedClue, onPlaceReference]);

  // Watch for new reference attempts to show result
  useEffect(() => {
    if (comp.referenceHistory.length > 0) {
      setLastResult(comp.referenceHistory[comp.referenceHistory.length - 1]);
    }
  }, [comp.referenceHistory.length]);

  const totalProcessed = comp.processedClues.length;
  const { guessBonus, efficiencyBonus } = isCorrect
    ? getGuessBonuses(totalProcessed, true)
    : { guessBonus: 0, efficiencyBonus: 0 };

  // Active filtering category (drives reference-card tag previews)
  const activeCategory = selectedClue && isFilteringCategory(selectedClue.category) ? selectedClue.category : null;

  return (
    <div className="h-full w-full flex flex-col text-ds-text-primary box-border">
      {/* Sticky context bar: header + stat pills + compact evidence/confirmed-traits strip */}
      <div className="shrink-0 px-ds-md pt-ds-md pb-ds-xs space-y-ds-xs">
        <h2 className="m-0 text-lg font-semibold text-ds-cyan text-center">Comparative Deduction</h2>
        <GlassPanel pill className="flex justify-center gap-ds-lg text-ds-body flex-wrap px-ds-lg py-ds-sm">
          <StatPill label="Score" value={availableScore} color="var(--ds-accent-emerald)" />
          <StatPill label="Clues" value={`${totalProcessed}/${comp.mysteryClues.length}`} />
          <StatPill label="Candidates" value={comp.candidateCount} color="var(--ds-accent-amber)" />
          {comp.referenceHistory.length > 0 && (
            <StatPill label="Refs" value={comp.referenceHistory.length} color="var(--ds-gem-observe)" />
          )}
        </GlassPanel>
        <ContextStrip evidenceBundle={evidenceBundle} confirmedTags={comp.confirmedTags} />
      </div>

      {/* Main content — scrollable */}
      <div className="flex-1 overflow-y-auto px-ds-md pb-ds-xs flex flex-col gap-ds-sm">
        {/* Step 1: Reveal / select a clue */}
        <div>
          <StepHeader n={1} title="Reveal a clue" active={!selectedClue} />
          <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1">Mystery Clues</div>
          <div className="flex flex-col gap-ds-xs">
            {Array.from(cluesByCategory.entries()).map(([category, clues]) => {
              const meta = CATEGORY_META[category] ?? { label: category, icon: '?', color: 'var(--ds-text-muted)' };
              const catKey = deductionCatToWalletKey(category);
              const fragCount = camp.clueFragments[catKey] ?? 0;
              const filtering = isFilteringCategory(category);
              return (
                <div key={category}>
                  <div className="flex items-center gap-ds-xs mb-0.5">
                    <span className="text-sm">{meta.icon}</span>
                    <span className="text-ds-caption font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                    {filtering && <span className="text-[9px] text-ds-text-muted ml-auto">comparative</span>}
                    {!filtering && <span className="text-[9px] text-ds-text-muted ml-auto">info</span>}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {clues.sort((a, b) => a.revealOrder - b.revealOrder).map(clue => {
                      const pc = comp.processedClues.find(p => p.clueId === clue.id);
                      const isProcessed = !!pc;
                      const isSelected = selectedClueId === clue.id;
                      const status = pc?.status ?? 'locked';

                      return (
                        <ClueRow
                          key={clue.id}
                          clue={clue}
                          status={status}
                          label={pc?.label ?? clue.label}
                          isSelected={isSelected}
                          isFiltering={filtering}
                          fragmentCount={fragCount}
                          thoughtDiscount={camp.thoughtDiscountPct}
                          availableScore={availableScore}
                          onProcess={() => {
                            if (!isProcessed) onProcessClue(clue.id);
                          }}
                          onSelect={() => {
                            if (isProcessed && status === 'processed' && filtering) {
                              setSelectedClueId(isSelected ? null : clue.id);
                            }
                          }}
                          metaColor={meta.color}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison Result Flash */}
        {lastResult && (
          <GlassPanel
            borderColor={lastResult.result.matched ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)'}
            className="p-ds-sm rounded-xl"
          >
            <div className={`text-ds-caption font-bold mb-0.5 ${lastResult.result.matched ? 'text-ds-emerald' : 'text-ds-rose'}`}>
              {lastResult.result.matched ? 'MATCH' : 'NO MATCH'} — {lastResult.referenceName}
            </div>
            <div className="text-[11px] text-ds-text-secondary leading-snug">{lastResult.result.message}</div>
          </GlassPanel>
        )}

        {/* Active comparison prompt */}
        {selectedClue && selectedClue.status === 'processed' && (
          <GlassPanel borderColor="var(--ds-accent-cyan)" className="p-ds-sm rounded-xl text-center">
            <div className="text-ds-caption text-ds-cyan font-semibold">Select a reference card below to compare</div>
            <div className="text-[10px] text-ds-text-muted mt-0.5">
              Comparing: <span className="font-semibold text-ds-text-primary">{selectedClue.label}</span>
            </div>
          </GlassPanel>
        )}

        {/* Step 2: Compare references */}
        <div>
          <StepHeader n={2} title="Compare references" active={!!activeCategory} />
          <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1">
            Field Album ({comp.albumProfiles.length} cards)
          </div>
          <AlbumSwiper
            profiles={comp.albumProfiles}
            eliminatedIds={comp.eliminatedSpeciesIds}
            confirmedTags={comp.confirmedTags}
            activeReferenceId={comp.activeReferenceId}
            activeCategory={activeCategory}
            selectable={!!selectedClue && selectedClue.status === 'processed' && isFilteringCategory(selectedClue.category)}
            onSelect={handleReferenceSelect}
          />
        </div>

        {/* Step 3: Guess from narrowed candidates */}
        {!isCorrect && (
          <div className="w-full shrink-0">
            <StepHeader n={3} title="Guess the species" active={!activeCategory && totalProcessed > 0} />
            <div className="text-ds-body text-ds-text-secondary mb-1.5 text-center">
              Which species is it? <span className="text-ds-text-muted">({candidateNames.length} candidate{candidateNames.length === 1 ? '' : 's'})</span>
            </div>
            <SpeciesGuessSelector
              speciesId={speciesId}
              hiddenSpeciesName={hiddenSpeciesName}
              candidateNames={candidateNames}
              onGuessSubmitted={onGuessResult}
            />
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
            <div className="text-3xl font-bold text-ds-cyan mt-ds-sm">{availableScore + guessBonus + efficiencyBonus} pts</div>
          </div>
        )}

        {isWrong && !isCorrect && (
          <div role="alert" className="text-center p-ds-sm shrink-0">
            <div className="text-ds-body font-semibold text-ds-rose">Not quite — reveal more clues and try again (-25 pts)</div>
          </div>
        )}
      </div>

      {/* Confetti */}
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none z-confetti" />

      {/* Return to Globe */}
      {isCorrect && (
        <div className="shrink-0 px-ds-md pb-ds-md pt-ds-xs flex justify-center">
          <button
            onClick={onFinish}
            className="py-ds-md px-8 text-ds-body font-bold text-ds-bg border-none rounded-full cursor-pointer shadow-glow-cyan"
            style={{ background: 'var(--ds-gradient-cta)' }}
          >
            Return to Globe
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clue Row — single clue item
// ---------------------------------------------------------------------------

interface ClueRowProps {
  clue: DeductionClue;
  status: ProcessedClue['status'] | 'locked';
  label: string;
  isSelected: boolean;
  isFiltering: boolean;
  fragmentCount: number;
  thoughtDiscount: number;
  availableScore: number;
  onProcess: () => void;
  onSelect: () => void;
  metaColor: string;
}

function ClueRow({ clue, status, label, isSelected, isFiltering, fragmentCount, thoughtDiscount, availableScore, onProcess, onSelect, metaColor }: ClueRowProps) {
  if (status === 'locked') {
    // Show cost + unlock button
    const cost = clue.baseCost;
    const currency = clue.unlockMode === 'fragment' ? 'frag' : 'pts';
    const canAfford = clue.unlockMode === 'fragment'
      ? fragmentCount >= cost
      : availableScore >= cost;
    return (
      <button
        onClick={onProcess}
        disabled={!canAfford}
        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] flex items-center gap-2 ${canAfford ? 'glass-bg cursor-pointer opacity-90 hover:opacity-100' : 'bg-white/3 cursor-default opacity-40'}`}
        style={{ borderLeft: `2px solid ${metaColor}40` }}
      >
        <span className="text-ds-text-muted flex-1 italic">Locked clue</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${canAfford ? 'bg-white/15 text-ds-text-primary' : 'bg-white/5 text-ds-text-muted'}`}>
          {cost} {currency}
        </span>
      </button>
    );
  }

  // Processed / confirmed / rejected
  const statusIcon = status === 'confirmed' ? '\u2714' : status === 'rejected' ? '\u2718' : '\u25CB';
  const statusColor = status === 'confirmed' ? 'text-ds-emerald' : status === 'rejected' ? 'text-ds-rose' : 'text-ds-text-secondary';
  const canCompare = status === 'processed' && isFiltering;

  return (
    <button
      onClick={onSelect}
      disabled={!canCompare}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] flex items-center gap-2 ${isSelected ? 'ring-1 ring-ds-cyan glass-bg' : canCompare ? 'glass-bg cursor-pointer hover:bg-white/10' : 'bg-white/3 cursor-default'}`}
      style={{ borderLeft: `2px solid ${status === 'confirmed' ? 'var(--ds-accent-emerald)' : status === 'rejected' ? 'var(--ds-accent-rose)' : metaColor}` }}
    >
      <span className={`text-sm ${statusColor}`}>{statusIcon}</span>
      <span className="flex-1 text-ds-text-primary">{label}</span>
      {canCompare && (
        <span className="text-[9px] text-ds-cyan font-semibold">{isSelected ? 'SELECTED' : 'TAP'}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Album Reference Swiper
// ---------------------------------------------------------------------------

interface AlbumSwiperProps {
  profiles: DeductionProfile[];
  eliminatedIds: number[];
  confirmedTags: Partial<Record<DeductionClueCategory, string[]>>;
  activeReferenceId: number | null;
  activeCategory: DeductionClueCategory | null;
  selectable: boolean;
  onSelect: (speciesId: number) => void;
}

function AlbumSwiper({ profiles, eliminatedIds, confirmedTags, activeReferenceId, activeCategory, selectable, onSelect }: AlbumSwiperProps) {
  const eliminatedSet = useMemo(() => new Set(eliminatedIds), [eliminatedIds]);

  return (
    <Swiper
      modules={[FreeMode, A11y]}
      slidesPerView="auto"
      spaceBetween={8}
      freeMode={{ enabled: true, sticky: false }}
      a11y={{ prevSlideMessage: 'Previous card', nextSlideMessage: 'Next card' }}
      className="!overflow-visible"
    >
      {profiles.map(profile => {
        const isEliminated = eliminatedSet.has(profile.speciesId);
        const isActive = profile.speciesId === activeReferenceId;
        return (
          <SwiperSlide key={profile.speciesId} style={{ width: 'auto' }}>
            <ReferenceCard
              profile={profile}
              eliminated={isEliminated}
              active={isActive}
              activeCategory={activeCategory}
              selectable={selectable && !isEliminated}
              onSelect={() => onSelect(profile.speciesId)}
            />
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}

// ---------------------------------------------------------------------------
// Reference Card — mini album card
// ---------------------------------------------------------------------------

interface ReferenceCardProps {
  profile: DeductionProfile;
  eliminated: boolean;
  active: boolean;
  activeCategory: DeductionClueCategory | null;
  selectable: boolean;
  onSelect: () => void;
}

function ReferenceCard({ profile, eliminated, active, activeCategory, selectable, onSelect }: ReferenceCardProps) {
  // When comparing, show this reference's tags for the active category so the
  // player can reason about whether to risk a comparison. Otherwise, total count.
  const categoryTags: string[] | null = useMemo(() => {
    if (!activeCategory) return null;
    const key = getProfileKeyForCategory(activeCategory);
    if (!key) return null;
    const arr = profile[key] as string[] | undefined;
    return Array.isArray(arr) ? arr : [];
  }, [profile, activeCategory]);

  const totalTagCount = profile.habitatTags.length + profile.morphologyTags.length + profile.dietTags.length
    + profile.behaviorTags.length + profile.reproductionTags.length + profile.taxonomyTags.length;

  const meta = activeCategory ? CATEGORY_META[activeCategory] : null;

  return (
    <button
      onClick={onSelect}
      disabled={!selectable}
      className={`
        flex flex-col items-stretch gap-0.5 px-2.5 py-2 rounded-xl text-center transition-all min-w-[110px] max-w-[150px]
        ${eliminated ? 'opacity-30 cursor-default line-through' : ''}
        ${active ? 'ring-2 ring-ds-cyan' : ''}
        ${selectable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
        ${selectable ? 'glass-bg border border-ds-cyan/30' : 'glass-bg border border-ds-subtle'}
      `}
    >
      <span className="text-[11px] font-semibold text-ds-text-primary leading-tight truncate">
        {profile.commonName}
      </span>
      <span className="text-[9px] text-ds-text-muted italic leading-tight truncate">
        {profile.scientificName}
      </span>
      {categoryTags ? (
        <div className="mt-1 flex flex-wrap justify-center gap-0.5">
          {categoryTags.length === 0 ? (
            <span className="text-[9px] text-ds-text-muted italic">no {activeCategory} tags</span>
          ) : (
            categoryTags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="inline-block px-1 py-[1px] rounded-full text-[9px] bg-white/10 leading-tight"
                style={meta ? { borderLeft: `2px solid ${meta.color}` } : undefined}
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))
          )}
          {categoryTags.length > 4 && (
            <span className="text-[9px] text-ds-text-muted">+{categoryTags.length - 4}</span>
          )}
        </div>
      ) : (
        <span className="text-[9px] text-ds-text-muted mt-0.5">{totalTagCount} tags</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compact context strip — route evidence + confirmed traits, single row
// ---------------------------------------------------------------------------

interface ContextStripProps {
  evidenceBundle: RunEvidenceBundle | null;
  confirmedTags: Partial<Record<DeductionClueCategory, string[]>>;
}

function ContextStrip({ evidenceBundle, confirmedTags }: ContextStripProps) {
  const hasEvidence = !!evidenceBundle && evidenceBundle.fingerprints.length > 0;
  const confirmedEntries = Object.entries(confirmedTags).filter(([, tags]) => (tags?.length ?? 0) > 0);
  if (!hasEvidence && confirmedEntries.length === 0) return null;
  return (
    <div className="rounded-md bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] px-2 py-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
      {hasEvidence && (
        <>
          <span className="text-[9px] font-bold text-ds-cyan uppercase tracking-wider">Route</span>
          {evidenceBundle!.uniqueProtectedAreas.slice(0, 2).map((name, i) => (
            <span key={`pa-${i}`} className="text-[10px] bg-ds-surface px-1.5 py-0.5 rounded text-ds-text-secondary">{name}</span>
          ))}
          {Object.entries(evidenceBundle!.featureClassCounts).slice(0, 4).map(([fc, count]) => (
            <span key={fc} className="text-[10px] bg-ds-surface px-1.5 py-0.5 rounded text-ds-text-secondary">{fc.replace(/_/g, ' ')} x{count}</span>
          ))}
        </>
      )}
      {confirmedEntries.length > 0 && (
        <>
          {hasEvidence && <span className="text-ds-text-muted">|</span>}
          <span className="text-[9px] font-bold text-ds-emerald uppercase tracking-wider">Confirmed</span>
          {confirmedEntries.flatMap(([cat, tags]) => {
            const meta = CATEGORY_META[cat] ?? { icon: '?', color: 'var(--ds-text-muted)' };
            return (tags ?? []).map(tag => (
              <span key={`${cat}-${tag}`} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10"
                style={{ borderLeft: `2px solid ${meta.color}` }}>
                {meta.icon} {tag.replace(/_/g, ' ')}
              </span>
            ));
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step header — numbered marker for the 3-step deduction flow
// ---------------------------------------------------------------------------

function StepHeader({ n, title, active }: { n: number; title: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${active ? 'bg-ds-cyan text-ds-bg' : 'bg-white/10 text-ds-text-muted'}`}
      >
        {n}
      </span>
      <span className={`text-ds-caption font-semibold uppercase tracking-wider ${active ? 'text-ds-cyan' : 'text-ds-text-muted'}`}>
        {title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy Clue Shop (fallback while comp data loads)
// ---------------------------------------------------------------------------

interface LegacyProps {
  camp: DeductionCampState;
  speciesId: number;
  hiddenSpeciesName: string;
  availableScore: number;
  isCorrect: boolean;
  isWrong: boolean;
  onPurchase: (category: ClueCategoryKey, cost: number) => void;
  onGuessResult: (isCorrect: boolean) => void;
  onFinish: () => void;
  confettiRef: React.RefObject<HTMLCanvasElement>;
}

function LegacyClueShop({ camp, speciesId, hiddenSpeciesName, availableScore, isCorrect, isWrong, onPurchase, onGuessResult, onFinish, confettiRef }: LegacyProps) {
  const totalPaid = camp.clueShop.reduce((sum, e) => sum + e.purchased, 0);

  const handleBuy = useCallback((cat: ClueCategoryKey) => {
    const entry = camp.clueShop.find(e => e.category === cat);
    if (!entry) return;
    const cost = getLegacyClueShopCost(entry.purchased, entry.fragmentCount, camp.thoughtDiscountPct);
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
            const meta = LEGACY_CATEGORY_META[cat];
            const entry = camp.clueShop.find(e => e.category === cat);
            if (!entry) return null;
            const cost = getLegacyClueShopCost(entry.purchased, entry.fragmentCount, camp.thoughtDiscountPct);
            const canBuy = cost <= availableScore && !isCorrect;
            return (
              <button
                key={cat}
                disabled={!canBuy}
                onClick={() => handleBuy(cat)}
                className={`glass-bg flex flex-col items-center gap-ds-xs min-w-[80px] shrink-0 py-2.5 px-ds-sm rounded-xl snap-start transition-all duration-200 text-ds-text-primary ${canBuy ? 'cursor-pointer opacity-100' : 'cursor-default opacity-50'}`}
                style={{ border: `1px solid ${canBuy ? meta.color : 'var(--ds-border-subtle)'}` }}
              >
                <span className="text-xl">{meta.icon}</span>
                <span className="text-ds-caption font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[9px] text-ds-text-muted">{entry.purchased} bought</span>
                <span className={`text-ds-caption font-bold mt-0.5 px-ds-sm py-0.5 rounded-full ${canBuy ? 'text-ds-bg' : 'bg-ds-surface-elevated text-ds-text-muted'}`}
                  style={canBuy ? { background: 'var(--ds-gradient-cta)' } : undefined}>{cost} pts</span>
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

      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none z-confetti" />

      {isCorrect && (
        <button onClick={onFinish}
          className="mx-auto py-ds-md px-8 text-ds-body font-bold text-ds-bg border-none rounded-full cursor-pointer shrink-0 shadow-glow-cyan"
          style={{ background: 'var(--ds-gradient-cta)' }}>Return to Globe</button>
      )}
    </div>
  );
}
