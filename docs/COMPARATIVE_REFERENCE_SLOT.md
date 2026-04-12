# Comparative Reference Slot — Implementation Summary

Replaces static clue shop with active comparative analysis puzzle. Players unblur mystery clues, then place album reference cards into a comparison slot to confirm/reject tag matches, progressively narrowing candidates.

## Files Changed

### Phase 1: Schema + Data (2026-04-11)

| File | Change |
|------|--------|
| `src/db/schema/species.ts` | Added `speciesDeductionProfiles` and `speciesDeductionClues` Drizzle tables. Exported `DeductionClueCategory` (9-value union) and `DeductionUnlockMode` (`fragment` \| `score`) types with `.$type<>()` narrowing. |
| DB: `species_deduction_profiles` | 22 rows, PK `species_id` FK to `icaa(ogc_fid)`. 6 `text[]` tag columns (`habitat_tags`, `morphology_tags`, `diet_tags`, `behavior_tags`, `reproduction_tags`, `taxonomy_tags`) with GIN indexes. 5 authored note columns + `reference_summary`. NOT NULL defaults on all arrays (no content-level CHECKs). |
| DB: `species_deduction_clues` | ~320 rows, FK `species_id`. Columns: `category` (CHECK 9 values), `label`, `compare_tags text[]` (GIN indexed), `reveal_order smallint`, `unlock_mode` (CHECK `fragment`\|`score`), `base_cost`. UNIQUE on `(species_id, category, reveal_order)`. |
| DB: `icaa` (source fixes) | Corrected clutch_size typos (Giant Tortoise, Softshell, Spurred, Radiated), lifespan values, `??` encoding to proper accents. |

### Phase 2: Engine + Wiring (2026-04-12)

| File | Change |
|------|--------|
| `src/lib/deductionEngine.ts` | **New file.** Core comparison engine. Exports: `compareReference()` (tag array intersection), `filterCandidates()` (filter by confirmed tags), `getNextClue()`, `getEffectiveClueCost()`, `isFilteringCategory()`. Types: `DeductionProfile`, `DeductionClue`, `ComparisonResult`, `ReferenceAttempt`, `ProcessedClue`. Constants: `CATEGORY_TO_PROFILE_KEY`, `FILTERING_CATEGORIES`. |
| `src/types/expedition.ts` | Added `ComparativeDeductionState` interface (mysteryProfile, mysteryClues, processedClues, albumProfiles, activeReferenceId, referenceHistory, confirmedTags, eliminatedSpeciesIds, candidateCount, fragmentsSpent, scoreSpent, guessResult, guessBonusAwarded). Added `createEmptyComparativeState()` factory. Added `deductionCatToWalletKey()` mapping function (diet->behavior, reproduction->life_cycle, taxonomy->classification). Added `comparativeDeduction: ComparativeDeductionState \| null` to `RunState`. |
| `src/app/api/species/deduction/route.ts` | **New file.** GET endpoint. Params: `mysteryId`, `albumIds`. Parallel queries for profiles, clues, names from `species_deduction_profiles`, `species_deduction_clues`, `icaa`. Returns `{ mysteryProfile, mysteryClues, albumProfiles }`. |
| `src/hooks/useExpeditionRun.ts` | Added `comparativeDeduction: null` to initial state. Added fetch useEffect on `phase === 'deduction'`. Added `handleProcessClue` (validates cost via `deductionCatToWalletKey`, creates ProcessedClue, deducts fragments/score into `comp.scoreSpent` only), `handlePlaceReference` (runs `compareReference`, updates confirmedTags, reruns `filterCandidates`), `handleComparativeGuessResult` (calculates bonuses, persists via PATCH, transitions phase). All three exported in return object. |
| `src/contexts/ExpeditionContext.tsx` | Mirrored all three handlers + fetch useEffect from hook. Added handler signatures to `ExpeditionContextValue` interface. Wired into `value` useMemo and dependency array. |

### Phase 3: UI + Fixes (2026-04-12)

| File | Change |
|------|--------|
| `src/components/DeductionCamp.tsx` | **Full rewrite.** Two render paths: `ComparativeDeductionUI` (when `comp` exists) and `LegacyClueShop` (fallback on null/fetch failure). |
| `src/MainAppLayout.tsx` | Destructures `handleProcessClue`, `handlePlaceReference`, `handleComparativeGuessResult` from `useExpedition()`. Passes `comp={runState.comparativeDeduction}` + three new handler props to `DeductionCamp`. |

## DeductionCamp UI Components

### ComparativeDeductionUI
- **Header bar**: Score (available), clue progress (processed/total), candidate count, reference attempt count.
- **Mystery Clues Panel**: Grouped by 9 categories. Each clue is a `ClueRow` with states: locked (show cost + unlock button), processed (selectable for comparison if filtering), confirmed (green check), rejected (red X).
- **Comparison Result Flash**: GlassPanel showing MATCH/NO MATCH with reference name and message after each comparison.
- **Active Comparison Prompt**: Cyan-bordered panel when a processed filtering clue is selected, prompting user to pick a reference card.
- **Album Swiper**: Swiper FreeMode carousel (`slidesPerView: 'auto'`, `spaceBetween: 8`). Each slide is a `ReferenceCard` (name, scientific name, tag count). Eliminated cards dimmed. Selectable cards get cyan border + scale animation.
- **Confirmed Tags Summary**: Flex-wrap pills showing confirmed trait tags by category with colored left borders.
- **Species Guess**: Standard `SpeciesGuessSelector` component.
- **Results**: Correct (confetti + bonuses + final score) / Wrong (penalty message). Return to Globe button.

### LegacyClueShop (fallback)
Full working original clue shop: score bar, clue market grid (8 categories), `DenseClueGrid` for purchased clues, guess selector, result display, confetti, return button.

## Data Flow

```
Player enters deduction phase
  -> useEffect fires fetch to /api/species/deduction
  -> API returns mysteryProfile + mysteryClues + albumProfiles
  -> createEmptyComparativeState() builds initial ComparativeDeductionState
  -> comp stored in runState.comparativeDeduction

Tap locked clue -> handleProcessClue(clueId)
  -> deductionCatToWalletKey maps category to wallet key
  -> getEffectiveClueCost computes cost with fragment/thought discount
  -> validates affordability, creates ProcessedClue, deducts from fragments or comp.scoreSpent

Select processed filtering clue -> local state: selectedClueId
  -> UI shows comparison prompt + enables album card selection

Tap album reference card -> handlePlaceReference(refId, clueId)
  -> compareReference() intersects mystery + reference tag arrays for that category
  -> Updates confirmedTags on match, runs filterCandidates() to recount
  -> Updates clue status to confirmed/rejected

Guess species -> handleComparativeGuessResult(isCorrect)
  -> Correct: calculates guessBonus + efficiencyBonus, persists via PATCH, phase -> complete
  -> Wrong: adds 25 to camp.scoreSpent as penalty
```

## Key Design Decisions

- **Tag intersection as comparison primitive**: simple, fast, works with GIN indexes
- **Score tracked in comp.scoreSpent only**: avoids double-subtraction with camp.scoreSpent (which only holds wrong-guess penalties)
- **deductionCatToWalletKey()**: bridges 9 deduction categories to 8 wallet keys (diet->behavior, reproduction->life_cycle, taxonomy->classification)
- **LegacyClueShop as fallback**: if API fetch fails, player gets full original clue shop experience instead of being trapped
- **Separate tables from icaa**: deduction profiles/clues are derived from icaa but stored independently, decoupling GIS imports from game design iteration
- **DB CHECK constraints**: category and unlock_mode validated at write time; `.$type<>()` for compile-time narrowing

## Codex Review Summary

- Phase 1: 2 review rounds, 7 findings resolved (duplicate tags, corrupted data, vocabulary normalization, asymmetric contracts)
- Phase 2: verified clean (schema types correct, tsc passes, 0 duplicate tags in DB)
- Phase 3: 3 HIGH findings caught and fixed (double score subtraction, fallback loading trap, category key mismatch)
