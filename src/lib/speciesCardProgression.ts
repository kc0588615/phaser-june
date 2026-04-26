import type { FeatureClass } from '@/types/gis';

const CLUE_CATEGORY_COUNT = 8;
const MAX_FACT_SLOTS = 3;
const REPEAT_ENCOUNTER_TARGET = 3;
const GIS_STAMP_CLASSES: FeatureClass[] = ['river', 'lake', 'protected_area', 'bioregion', 'ramsar_site'];

export type SpeciesCardRarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type SpeciesCardVariant = 'foil';

export interface SpeciesCardProgressInput {
  discovered: boolean;
  timesEncountered: number;
  factsUnlocked: unknown;
  clueCategoriesUnlocked: unknown;
  gisStamps: unknown;
}

export function getSpeciesCardRarityTier(conservationCode: string | null | undefined): SpeciesCardRarityTier {
  switch (conservationCode?.toUpperCase()) {
    case 'CR':
      return 'legendary';
    case 'EN':
      return 'epic';
    case 'VU':
      return 'rare';
    case 'NT':
      return 'uncommon';
    default:
      return 'common';
  }
}

export function calculateSpeciesCardCompletion(input: SpeciesCardProgressInput): number {
  const encounterPoints = getEncounterPoints(input);
  const factPoints = ratioPoints(getStringValues(input.factsUnlocked).length, MAX_FACT_SLOTS, 30);
  const cluePoints = ratioPoints(getStringValues(input.clueCategoriesUnlocked).length, CLUE_CATEGORY_COUNT, 25);
  const stampPoints = ratioPoints(getKnownStampCount(input.gisStamps), GIS_STAMP_CLASSES.length, 20);

  return Math.min(100, Math.round(encounterPoints + factPoints + cluePoints + stampPoints));
}

export function getSpeciesCardVariant(completionPct: number): SpeciesCardVariant | null {
  return completionPct >= 100 ? 'foil' : null;
}

function ratioPoints(count: number, max: number, points: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, count) / max) * points;
}

function getEncounterPoints(input: SpeciesCardProgressInput): number {
  const count = Math.max(input.timesEncountered, input.discovered ? 1 : 0);
  if (count <= 0) return 0;
  return 15 + ratioPoints(count - 1, REPEAT_ENCOUNTER_TARGET - 1, 10);
}

function getKnownStampCount(value: unknown): number {
  const stamps = new Set(getStringValues(value));
  return GIS_STAMP_CLASSES.filter((stamp) => stamps.has(stamp)).length;
}

function getStringValues(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
    : [];
}
