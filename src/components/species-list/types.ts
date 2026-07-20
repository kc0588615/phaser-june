export interface SpeciesCardSummary {
  completionPct?: number;
  rarityTier?: string;
  cardVariant?: string | null;
  bestRunScore?: number | null;
}

export type AlbumSortMode = 'recent' | 'completion' | 'rarity' | 'best';
export type CasesGroupMode = 'biome' | 'realm' | 'bioregion';
