// PlayerStats type definition
// Matches the database schema from player_stats table + player_leaderboard view

export interface PlayerStats {
  // Primary key
  playerId: string;

  // Overview metrics
  totalSpeciesDiscovered: number;
  totalCluesUnlocked: number;
  totalScore: number;
  totalMovesMade: number;
  totalGamesPlayed: number;
  totalPlayTimeSeconds: number;

  // Efficiency metrics
  averageCluesPerDiscovery: number;
  fastestDiscoveryClues?: number;
  slowestDiscoveryClues?: number;
  averageTimePerDiscoverySeconds?: number;

  // Taxonomic coverage (JSONB)
  speciesByOrder: Record<string, number>;
  speciesByFamily: Record<string, number>;
  speciesByGenus: Record<string, number>;

  // Geographic coverage (JSONB)
  speciesByRealm: Record<string, number>;
  speciesByBiome: Record<string, number>;
  speciesByBioregion: Record<string, number>;

  // Habitat distribution
  marineSpeciesCount: number;
  terrestrialSpeciesCount: number;
  freshwaterSpeciesCount: number;
  aquaticSpeciesCount: number;

  // Conservation awareness (JSONB)
  speciesByIucnStatus: Record<string, number>;

  // Clue mastery (JSONB)
  cluesByCategory: Record<string, number>;
  favoriteClueCategory?: string;

  // Timestamps
  firstDiscoveryAt?: string;
  lastDiscoveryAt?: string;
  createdAt: string;
  updatedAt: string;

  // Leaderboard rankings (from player_leaderboard view - optional)
  rankByDiscoveries?: number;
  rankByScore?: number;
  rankByEfficiency?: number;
}
