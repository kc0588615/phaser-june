import type { Species } from '@/types/database';

export type GroupedSpecies = Record<string, Record<string, Species[]>>;

export type TaxonomyHierarchy = Record<
  string,
  Record<string, Record<string, Record<string, Species[]>>>
>;

export type JumpTarget =
  | { type: "genus"; value: string }
  | { type: "family"; value: string }
  | { type: "ecoregion"; value: string }
  | { type: "realm"; value: string }
  | { type: "biome"; value: string }
  | { type: "species"; value: string }
  | { type: "order"; value: string }
  | { type: "class"; value: string };
