import { describe, expect, it } from 'vitest';
import {
  compareReference,
  filterCandidates,
  getNextClue,
  type DeductionClue,
  type DeductionProfile,
} from '@/lib/deductionEngine';

const profile = (overrides: Partial<DeductionProfile>): DeductionProfile => ({
  speciesId: 1,
  commonName: 'Mystery',
  scientificName: 'Species mystery',
  habitatTags: [],
  morphologyTags: [],
  dietTags: [],
  behaviorTags: [],
  reproductionTags: [],
  taxonomyTags: [],
  ...overrides,
});

const clue = (overrides: Partial<DeductionClue>): DeductionClue => ({
  id: 1,
  speciesId: 1,
  category: 'habitat',
  label: 'Habitat',
  compareTags: null,
  revealOrder: 1,
  unlockMode: 'fragment',
  baseCost: 3,
  isFiltering: true,
  ...overrides,
});

describe('deductionEngine', () => {
  it('compares matching reference tags within a category', () => {
    const mystery = profile({ habitatTags: ['wetland', 'forest'] });
    const reference = profile({ commonName: 'Reference', habitatTags: ['wetland', 'grassland'] });

    const result = compareReference(mystery, reference, 'habitat');

    expect(result.matched).toBe(true);
    expect(result.matchedTags).toEqual(['wetland']);
    expect(result.message).toContain('HABITAT CONFIRMED');
  });

  it('reports mismatch for disjoint tag sets', () => {
    const mystery = profile({ dietTags: ['insectivore'] });
    const reference = profile({ commonName: 'Reference', dietTags: ['herbivore'] });

    const result = compareReference(mystery, reference, 'diet');

    expect(result.matched).toBe(false);
    expect(result.matchedTags).toEqual([]);
    expect(result.message).toContain('does not match on DIET');
  });

  it('restricts comparison to clue compareTags when supplied', () => {
    const mystery = profile({ habitatTags: ['wetland', 'forest'] });
    const reference = profile({ habitatTags: ['forest'] });

    const result = compareReference(mystery, reference, 'habitat', ['wetland']);

    expect(result.matched).toBe(false);
    expect(result.matchedTags).toEqual([]);
  });

  it('filters empty candidate pools without throwing', () => {
    expect(filterCandidates([], { habitat: ['wetland'] }, new Set())).toEqual([]);
  });

  it('filters candidates by confirmed tags and eliminated ids', () => {
    const wetland = profile({ speciesId: 1, habitatTags: ['wetland'] });
    const forest = profile({ speciesId: 2, habitatTags: ['forest'] });
    const eliminated = profile({ speciesId: 3, habitatTags: ['wetland'] });

    const result = filterCandidates([wetland, forest, eliminated], { habitat: ['wetland'] }, new Set([3]));

    expect(result.map((candidate) => candidate.speciesId)).toEqual([1]);
  });

  it('selects the next unprocessed clue by reveal order within the category', () => {
    const clues = [
      clue({ id: 1, category: 'habitat', revealOrder: 2 }),
      clue({ id: 2, category: 'habitat', revealOrder: 1 }),
      clue({ id: 3, category: 'diet', revealOrder: 0 }),
    ];

    expect(getNextClue(clues, 'habitat', new Set())?.id).toBe(2);
    expect(getNextClue(clues, 'habitat', new Set([2]))?.id).toBe(1);
    expect(getNextClue(clues, 'diet', new Set([3]))).toBeNull();
  });
});
