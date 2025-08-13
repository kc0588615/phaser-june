import type { Species } from '@/types/database';

export type GroupedSpecies = Record<string, Record<string, Species[]>>;

export type JumpTarget =
  | { type: "category"; value: string }
  | { type: "genus"; value: { category: string; genus: string } | string }
  | { type: "family"; value: { category: string; family: string } | string }
  | { type: "ecoregion"; value: string }
  | { type: "realm"; value: string }
  | { type: "biome"; value: string }
  | { type: "species"; value: string }
  | { type: "order"; value: string }
  | { type: "class"; value: string };