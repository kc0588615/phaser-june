import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, A11y } from 'swiper/modules';
import type { RunState } from '@/types/expedition';
import type { DeductionClue, DeductionProfile, ProcessedClue, ReferenceAttempt } from '@/lib/deductionEngine';
import { filterCandidates, getProfileKeyForCategory, isFilteringCategory } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SpeciesGuessSelector } from '@/components/SpeciesGuessSelector';

import 'swiper/css';
import 'swiper/css/free-mode';

interface Props {
  runState: RunState;
  speciesId: number;
  hiddenSpeciesName: string;
  onPlaceReference: (referenceSpeciesId: number, clueId: number) => void;
  onGuess: (isCorrect: boolean, guessedName: string) => void;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  habitat: { label: 'Habitat', color: 'var(--ds-gem-camouflage)' },
  morphology: { label: 'Morphology', color: 'var(--ds-gem-pack)' },
  diet: { label: 'Diet', color: 'var(--ds-accent-amber)' },
  behavior: { label: 'Behavior', color: 'var(--ds-accent-amber)' },
  reproduction: { label: 'Reproduction', color: 'var(--ds-gem-notes)' },
  taxonomy: { label: 'Taxonomy', color: 'var(--ds-gem-observe)' },
  key_fact: { label: 'Key Fact', color: 'var(--ds-gem-focus)' },
  geography: { label: 'Geography', color: 'var(--ds-gem-scan)' },
  conservation: { label: 'Conservation', color: 'var(--ds-accent-rose)' },
};

export function FieldNotebook({ runState, speciesId, hiddenSpeciesName, onPlaceReference, onGuess }: Props) {
  const comp = runState.comparativeDeduction;
  const [selectedClueId, setSelectedClueId] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ReferenceAttempt | null>(null);

  useEffect(() => {
    if (comp?.referenceHistory.length) {
      setLastResult(comp.referenceHistory[comp.referenceHistory.length - 1]);
    }
  }, [comp?.referenceHistory]);

  const processedIds = useMemo(() => new Set(comp?.processedClues.map(clue => clue.clueId) ?? []), [comp?.processedClues]);
  const selectedClue = useMemo(() => {
    if (!comp || !selectedClueId) return null;
    return comp.processedClues.find(clue => clue.clueId === selectedClueId) ?? null;
  }, [comp, selectedClueId]);
  const activeCategory = selectedClue && isFilteringCategory(selectedClue.category) ? selectedClue.category : null;

  const candidateNames = useMemo(() => {
    if (!comp) return hiddenSpeciesName ? [hiddenSpeciesName] : [];
    const eliminatedSet = new Set(comp.eliminatedSpeciesIds);
    const pool = filterCandidates(comp.albumProfiles, comp.confirmedTags, eliminatedSet);
    const names = pool.map(profile => profile.commonName);
    if (hiddenSpeciesName && hiddenSpeciesName !== 'Unknown Species' && !names.includes(hiddenSpeciesName)) {
      names.push(hiddenSpeciesName);
    }
    return names;
  }, [comp, hiddenSpeciesName]);

  const handleReferenceSelect = useCallback((referenceSpeciesId: number) => {
    if (!selectedClueId || !selectedClue || selectedClue.status !== 'processed') return;
    if (!isFilteringCategory(selectedClue.category)) return;
    onPlaceReference(referenceSpeciesId, selectedClueId);
    setSelectedClueId(null);
  }, [onPlaceReference, selectedClue, selectedClueId]);

  if (!comp) return null;

  const revealedClues = comp.processedClues.length;
  const guessFeedback = comp.lastWrongGuessFeedback;

  return (
    <div className="absolute left-0 right-0 bottom-0 z-panel pointer-events-none">
      <GlassPanel className="pointer-events-auto rounded-t-lg rounded-b-none border-x-0 border-b-0 p-ds-md max-h-[54vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-ds-sm mb-ds-sm">
          <div>
            <div className="text-ds-caption font-bold uppercase tracking-wider text-ds-cyan">Field notebook</div>
            <div className="text-ds-badge text-ds-text-muted">Reveal clues, compare suspects, then identify the mystery.</div>
          </div>
          <div className="flex gap-2 text-ds-badge text-ds-text-secondary">
            <span>{revealedClues} clues</span>
            <span>{candidateNames.length} candidates</span>
          </div>
        </div>

        <div className="grid gap-ds-sm lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1fr)_320px]">
          <div className="min-w-0">
            <SectionLabel label="Revealed clues" />
            <div className="flex flex-col gap-1.5">
              {comp.mysteryClues.sort((a, b) => a.revealOrder - b.revealOrder).map(clue => {
                const processed = comp.processedClues.find(item => item.clueId === clue.id);
                const meta = CATEGORY_META[clue.category] ?? { label: clue.category, color: 'var(--ds-text-muted)' };
                return (
                  <ClueRow
                    key={clue.id}
                    clue={clue}
                    status={processed?.status ?? 'locked'}
                    label={processed?.label ?? clue.label}
                    isSelected={selectedClueId === clue.id}
                    isFiltering={isFilteringCategory(clue.category)}
                    onSelect={() => {
                      if (processed && processed.status === 'processed' && isFilteringCategory(processed.category)) {
                        setSelectedClueId(selectedClueId === clue.id ? null : clue.id);
                      }
                    }}
                    metaLabel={meta.label}
                    metaColor={meta.color}
                  />
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <SectionLabel label="Suspects" />
            {selectedClue && (
              <GlassPanel borderColor="var(--ds-accent-cyan)" className="p-2 rounded-lg mb-2">
                <div className="text-ds-caption text-ds-cyan font-semibold">Tap a suspect card to compare</div>
                <div className="text-[10px] text-ds-text-muted mt-0.5">{selectedClue.label}</div>
              </GlassPanel>
            )}
            {lastResult && (
              <GlassPanel
                borderColor={lastResult.result.matched ? 'var(--ds-accent-emerald)' : 'var(--ds-accent-rose)'}
                className="p-2 rounded-lg mb-2"
              >
                <div className={`text-ds-caption font-bold ${lastResult.result.matched ? 'text-ds-emerald' : 'text-ds-rose'}`}>
                  {lastResult.result.matched ? 'MATCH' : 'NO MATCH'} - {lastResult.referenceName}
                </div>
                <div className="text-[11px] text-ds-text-secondary leading-snug">{lastResult.result.message}</div>
              </GlassPanel>
            )}
            <AlbumSwiper
              profiles={comp.albumProfiles}
              eliminatedIds={comp.eliminatedSpeciesIds}
              activeReferenceId={comp.activeReferenceId}
              activeCategory={activeCategory}
              selectable={!!selectedClue && selectedClue.status === 'processed' && isFilteringCategory(selectedClue.category)}
              onSelect={handleReferenceSelect}
            />
          </div>

          <div className="min-w-0">
            <SectionLabel label="Guess" />
            <SpeciesGuessSelector
              speciesId={speciesId}
              hiddenSpeciesName={hiddenSpeciesName}
              candidateNames={candidateNames}
              onGuessSubmitted={onGuess}
            />
            {guessFeedback && (
              <WrongGuessFeedback feedback={guessFeedback} />
            )}
            {processedIds.size === 0 && (
              <div className="mt-2 text-ds-caption text-ds-text-secondary">
                Match category gems to reveal facts before guessing.
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div className="text-ds-caption text-ds-text-secondary uppercase tracking-wider mb-1">{label}</div>;
}

interface ClueRowProps {
  clue: DeductionClue;
  status: ProcessedClue['status'] | 'locked';
  label: string;
  isSelected: boolean;
  isFiltering: boolean;
  onSelect: () => void;
  metaLabel: string;
  metaColor: string;
}

function ClueRow({ clue, status, label, isSelected, isFiltering, onSelect, metaLabel, metaColor }: ClueRowProps) {
  if (status === 'locked') {
    return (
      <div
        className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] flex items-center gap-2 bg-white/3 opacity-45"
        style={{ borderLeft: `2px solid ${metaColor}40` }}
      >
        <span className="flex-1 text-ds-text-muted italic">{metaLabel} clue locked</span>
        <span className="text-[9px] text-ds-text-muted">match gem</span>
      </div>
    );
  }

  const canCompare = status === 'processed' && isFiltering;
  const statusIcon = status === 'confirmed' ? 'OK' : status === 'rejected' ? 'NO' : '...';
  const statusColor = status === 'confirmed' ? 'text-ds-emerald' : status === 'rejected' ? 'text-ds-rose' : 'text-ds-text-secondary';

  return (
    <button
      onClick={onSelect}
      disabled={!canCompare}
      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all text-[12px] flex items-center gap-2 ${isSelected ? 'ring-1 ring-ds-cyan glass-bg' : canCompare ? 'glass-bg cursor-pointer hover:bg-white/10' : 'bg-white/3 cursor-default'}`}
      style={{ borderLeft: `2px solid ${status === 'confirmed' ? 'var(--ds-accent-emerald)' : status === 'rejected' ? 'var(--ds-accent-rose)' : metaColor}` }}
    >
      <span className={`text-[10px] font-bold ${statusColor}`}>{statusIcon}</span>
      <span className="flex-1 text-ds-text-primary">{label}</span>
      <span className="text-[9px] text-ds-text-muted">{clue.category.replace(/_/g, ' ')}</span>
      {canCompare && <span className="text-[9px] text-ds-cyan font-semibold">{isSelected ? 'SELECTED' : 'TAP'}</span>}
    </button>
  );
}

interface AlbumSwiperProps {
  profiles: DeductionProfile[];
  eliminatedIds: number[];
  activeReferenceId: number | null;
  activeCategory: DeductionClueCategory | null;
  selectable: boolean;
  onSelect: (speciesId: number) => void;
}

function AlbumSwiper({ profiles, eliminatedIds, activeReferenceId, activeCategory, selectable, onSelect }: AlbumSwiperProps) {
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
        const eliminated = eliminatedSet.has(profile.speciesId);
        return (
          <SwiperSlide key={profile.speciesId} style={{ width: 'auto' }}>
            <ReferenceCard
              profile={profile}
              eliminated={eliminated}
              active={profile.speciesId === activeReferenceId}
              activeCategory={activeCategory}
              selectable={selectable && !eliminated}
              onSelect={() => onSelect(profile.speciesId)}
            />
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}

interface ReferenceCardProps {
  profile: DeductionProfile;
  eliminated: boolean;
  active: boolean;
  activeCategory: DeductionClueCategory | null;
  selectable: boolean;
  onSelect: () => void;
}

function ReferenceCard({ profile, eliminated, active, activeCategory, selectable, onSelect }: ReferenceCardProps) {
  const categoryTags: string[] | null = useMemo(() => {
    if (!activeCategory) return null;
    const key = getProfileKeyForCategory(activeCategory);
    if (!key) return null;
    const value = profile[key] as string[] | undefined;
    return Array.isArray(value) ? value : [];
  }, [activeCategory, profile]);

  const totalTagCount = profile.habitatTags.length + profile.morphologyTags.length + profile.dietTags.length
    + profile.behaviorTags.length + profile.reproductionTags.length + profile.taxonomyTags.length;
  const meta = activeCategory ? CATEGORY_META[activeCategory] : null;

  return (
    <button
      onClick={onSelect}
      disabled={!selectable}
      className={`
        flex flex-col items-stretch gap-0.5 px-2.5 py-2 rounded-lg text-center transition-all min-w-[110px] max-w-[150px]
        ${eliminated ? 'opacity-30 cursor-default line-through' : ''}
        ${active ? 'ring-2 ring-ds-cyan' : ''}
        ${selectable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
        ${selectable ? 'glass-bg border border-ds-cyan/30' : 'glass-bg border border-ds-subtle'}
      `}
    >
      <span className="text-[11px] font-semibold text-ds-text-primary leading-tight truncate">{profile.commonName}</span>
      <span className="text-[9px] text-ds-text-muted italic leading-tight truncate">{profile.scientificName}</span>
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
          {categoryTags.length > 4 && <span className="text-[9px] text-ds-text-muted">+{categoryTags.length - 4}</span>}
        </div>
      ) : (
        <span className="text-[9px] text-ds-text-muted mt-0.5">{totalTagCount} tags</span>
      )}
    </button>
  );
}

function WrongGuessFeedback({ feedback }: { feedback: NonNullable<RunState['comparativeDeduction']>['lastWrongGuessFeedback'] }) {
  if (!feedback || feedback.length === 0) {
    return (
      <div className="mt-2 text-ds-caption text-ds-amber">
        Wrong guess. Confirm a clue with a suspect card to see category-level contrast.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md bg-ds-surface-elevated border border-ds-subtle p-2">
      <div className="text-ds-caption font-semibold text-ds-amber mb-1">Wrong guess contrast</div>
      <div className="flex flex-col gap-1">
        {feedback.map(result => (
          <div key={result.category} className="text-[11px] text-ds-text-secondary">
            <span className={result.matched ? 'text-ds-emerald' : 'text-ds-rose'}>
              {result.matched ? 'Match' : 'Conflict'}
            </span>
            {' '}on {result.category.replace(/_/g, ' ')}: {result.matchedTags.length > 0 ? result.matchedTags.map(tag => tag.replace(/_/g, ' ')).join(', ') : 'no shared confirmed tags'}
          </div>
        ))}
      </div>
    </div>
  );
}
