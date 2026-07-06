import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import type { DeductionClue, DeductionProfile, ProcessedClue, ReferenceAttempt } from '@/lib/deductionEngine';
import { filterCandidates, getProfileKeyForCategory, isFilteringCategory } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SpeciesGuessSelector } from '@/components/SpeciesGuessSelector';

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

export function FieldNotebook(props: Props) {
  const comp = props.runState.comparativeDeduction;
  const notebookRunId = useMemo(() => {
    const mysteryId = comp?.mysteryProfile.speciesId ?? props.speciesId;
    const routeStart = props.runState.expedition?.routePolyline?.[0];
    return `${mysteryId}:${routeStart?.lon ?? 'x'}:${routeStart?.lat ?? 'x'}`;
  }, [comp?.mysteryProfile.speciesId, props.runState.expedition?.routePolyline, props.speciesId]);

  return <FieldNotebookContent {...props} key={notebookRunId} />;
}

function FieldNotebookContent({ runState, speciesId, hiddenSpeciesName, onPlaceReference, onGuess }: Props) {
  const comp = runState.comparativeDeduction;
  const [selectedClueId, setSelectedClueId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [flashLabel, setFlashLabel] = useState<string | null>(null);
  const prevProcessedCountRef = useRef(comp?.processedClues.length ?? 0);
  const lastResult = useMemo<ReferenceAttempt | null>(() => (
    comp?.referenceHistory.length ? comp.referenceHistory[comp.referenceHistory.length - 1] : null
  ), [comp?.referenceHistory]);

  useEffect(() => {
    const count = comp?.processedClues.length ?? 0;
    const prevCount = prevProcessedCountRef.current;
    if (!comp || count <= prevCount) {
      prevProcessedCountRef.current = count;
      return;
    }

    const newest = comp.processedClues[count - 1];
    if (!expanded && newest) {
      setFlashLabel(newest.label);
      const timer = window.setTimeout(() => {
        setFlashLabel(null);
      }, 4000);
      prevProcessedCountRef.current = count;
      return () => window.clearTimeout(timer);
    }

    prevProcessedCountRef.current = count;
  }, [comp, comp?.processedClues.length, expanded]);

  const processedIds = useMemo(() => new Set(comp?.processedClues.map(clue => clue.clueId) ?? []), [comp?.processedClues]);
  const selectedClue = useMemo(() => {
    if (!comp || !selectedClueId) return null;
    return comp.processedClues.find(clue => clue.clueId === selectedClueId) ?? null;
  }, [comp, selectedClueId]);
  const activeCategory = selectedClue?.isFiltering && isFilteringCategory(selectedClue.category) ? selectedClue.category : null;

  const candidateNames = useMemo(() => {
    if (!comp) return hiddenSpeciesName ? [hiddenSpeciesName] : [];
    const eliminatedSet = new Set(comp.eliminatedSpeciesIds);
    const pool = filterCandidates(comp.albumProfiles, comp.confirmedClues, eliminatedSet);
    const names = pool.map(profile => profile.commonName);
    if (hiddenSpeciesName && hiddenSpeciesName !== 'Unknown Species' && !names.includes(hiddenSpeciesName)) {
      names.push(hiddenSpeciesName);
    }
    return names;
  }, [comp, hiddenSpeciesName]);

  const handleReferenceSelect = useCallback((referenceSpeciesId: number) => {
    if (!selectedClueId || !selectedClue || selectedClue.status !== 'processed') return;
    if (!selectedClue.isFiltering || !isFilteringCategory(selectedClue.category)) return;
    onPlaceReference(referenceSpeciesId, selectedClueId);
    setSelectedClueId(null);
  }, [onPlaceReference, selectedClue, selectedClueId]);

  if (!comp) return null;

  const revealedClues = comp.processedClues.length;
  const guessFeedback = comp.lastWrongGuessFeedback;
  const revealedSurvey = comp.habitatSurvey.filter(entry => entry.revealed);
  const hiddenSurveyCount = comp.habitatSurvey.length - revealedSurvey.length;
  const sortedMysteryClues = [...comp.mysteryClues].sort((a, b) => a.revealOrder - b.revealOrder);
  const processedById = new Map(comp.processedClues.map(clue => [clue.clueId, clue]));
  const revealedMysteryClues = sortedMysteryClues
    .map(clue => ({ clue, processed: processedById.get(clue.id) ?? null }))
    .filter((item): item is { clue: DeductionClue; processed: ProcessedClue } => item.processed !== null);
  const lockedCount = Math.max(0, sortedMysteryClues.length - revealedMysteryClues.length);

  if (!expanded) {
    return (
      <div className="absolute left-0 right-0 bottom-0 z-panel pointer-events-none">
        <style>{`
          @keyframes field-notebook-pulse {
            0%, 100% { box-shadow: 0 0 0 rgba(34, 211, 238, 0); border-color: var(--ds-border-subtle); }
            50% { box-shadow: 0 0 18px rgba(34, 211, 238, 0.55); border-color: var(--ds-accent-cyan); }
          }
          .field-notebook-pulse { animation: field-notebook-pulse 1s ease-in-out 4; }
        `}</style>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`glass-strip pointer-events-auto w-full h-10 px-ds-md border-x-0 border-b-0 border-t border-ds-subtle text-ds-text-primary flex items-center justify-between gap-ds-sm ${flashLabel ? 'field-notebook-pulse' : ''}`}
          aria-label="Open field notebook"
        >
          <span className="glass-strip-chip rounded-md px-2 py-0.5 text-ds-caption font-bold uppercase tracking-wider text-ds-cyan whitespace-nowrap">Field notebook</span>
          <span className="glass-strip-text min-w-0 flex-1 truncate text-center text-ds-caption text-ds-text-primary">
            {flashLabel ?? `${revealedClues} clues · ${candidateNames.length} candidates`}
          </span>
          <ChevronUp className="h-4 w-4 shrink-0 text-ds-text-primary" />
        </button>
      </div>
    );
  }

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
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-ds-subtle text-ds-text-secondary hover:text-ds-text-primary"
              aria-label="Collapse field notebook"
              title="Collapse field notebook"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-ds-sm lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1fr)_320px]">
          <div className="min-w-0">
            <SectionLabel label="Revealed clues" />
            {comp.habitatSurvey.length > 0 && (
              <div className="mb-2 rounded-lg border border-ds-subtle bg-white/3 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-ds-text-muted mb-1">Habitat survey</div>
                <div className="flex flex-wrap gap-1">
                  {revealedSurvey.map(entry => (
                    <span
                      key={entry.habitatType}
                      className="rounded-full bg-[rgba(34,197,94,0.14)] border border-[rgba(34,197,94,0.25)] px-2 py-0.5 text-[10px] text-ds-text-primary"
                    >
                      {entry.habitatType} {entry.percentage}%
                    </span>
                  ))}
                  {hiddenSurveyCount > 0 && (
                    <span className="rounded-full bg-ds-surface-elevated border border-ds-subtle px-2 py-0.5 text-[10px] text-ds-text-muted">
                      {hiddenSurveyCount} more - match green gems
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {revealedMysteryClues.map(({ clue, processed }) => {
                const meta = CATEGORY_META[clue.category] ?? { label: clue.category, color: 'var(--ds-text-muted)' };
                return (
                  <ClueRow
                    key={clue.id}
                    clue={clue}
                    status={processed.status}
                    label={processed.label}
                    isSelected={selectedClueId === clue.id}
                    isFiltering={processed.isFiltering && isFilteringCategory(clue.category)}
                    onSelect={() => {
                      if (processed.status === 'processed' && processed.isFiltering && isFilteringCategory(processed.category)) {
                        setSelectedClueId(selectedClueId === clue.id ? null : clue.id);
                      }
                    }}
                    metaColor={meta.color}
                  />
                );
              })}
              {lockedCount > 0 && (
                <div className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/3 text-ds-text-muted italic">
                  {lockedCount} clues locked - match gems to reveal
                </div>
              )}
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
            <SuspectCardGrid
              profiles={comp.albumProfiles}
              eliminatedIds={comp.eliminatedSpeciesIds}
              activeReferenceId={comp.activeReferenceId}
              activeCategory={activeCategory}
              selectable={!!selectedClue && selectedClue.status === 'processed' && selectedClue.isFiltering && isFilteringCategory(selectedClue.category)}
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
  status: ProcessedClue['status'];
  label: string;
  isSelected: boolean;
  isFiltering: boolean;
  onSelect: () => void;
  metaColor: string;
}

function ClueRow({ clue, status, label, isSelected, isFiltering, onSelect, metaColor }: ClueRowProps) {
  const canCompare = status === 'processed' && isFiltering;
  const statusIcon = status === 'confirmed' ? 'OK' : status === 'rejected' ? 'NO' : '...';
  const statusColor = status === 'confirmed' ? 'text-ds-emerald' : status === 'rejected' ? 'text-ds-rose' : 'text-ds-text-secondary';

  return (
    <button
      type="button"
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

interface SuspectCardGridProps {
  profiles: DeductionProfile[];
  eliminatedIds: number[];
  activeReferenceId: number | null;
  activeCategory: DeductionClueCategory | null;
  selectable: boolean;
  onSelect: (speciesId: number) => void;
}

function SuspectCardGrid({ profiles, eliminatedIds, activeReferenceId, activeCategory, selectable, onSelect }: SuspectCardGridProps) {
  const eliminatedSet = useMemo(() => new Set(eliminatedIds), [eliminatedIds]);

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Suspect reference cards">
      {profiles.map(profile => {
        const eliminated = eliminatedSet.has(profile.speciesId);
        return (
          <div key={profile.speciesId} role="listitem">
            <ReferenceCard
              profile={profile}
              eliminated={eliminated}
              active={profile.speciesId === activeReferenceId}
              activeCategory={activeCategory}
              selectable={selectable && !eliminated}
              onSelect={() => onSelect(profile.speciesId)}
            />
          </div>
        );
      })}
    </div>
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
      type="button"
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
