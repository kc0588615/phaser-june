import type { Species } from '@/types/database';

export type GroupedSpecies = Record<string, Record<string, Species[]>>;

export type JumpTarget =
  | { type: "category"; value: string }
  | { type: "genus"; value: { category: string; genus: string } }
  | { type: "ecoregion"; value: string }
  | { type: "realm"; value: string }
  | { type: "biome"; value: string }
  | { type: "species"; value: string };