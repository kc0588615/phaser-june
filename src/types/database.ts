export interface HighScore {
  id: string;
  player_id?: string; // Optional FK to profiles for authenticated players
  username: string;
  score: number;
  created_at: string;
}

export interface Profile {
  user_id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerGameSession {
  id: string;
  player_id: string; // Required FK to profiles
  started_at: string;
  ended_at?: string;
  total_moves: number;
  total_score: number;
  species_discovered_in_session: number;
  clues_unlocked_in_session: number;
  created_at: string;
}

export interface PlayerSpeciesDiscovery {
  id: string;
  player_id: string; // Required FK to profiles
  species_id: number; // Required FK to icaa
  session_id?: string; // Optional FK to player_game_sessions
  discovered_at: string;
  time_to_discover_seconds?: number;
  clues_unlocked_before_guess: number;
  incorrect_guesses_count: number;
  score_earned: number;
  // Note: clues_revealed removed - use player_clue_unlocks as single source of truth
}

export interface PlayerClueUnlock {
  id: string;
  player_id: string; // Required FK to profiles
  species_id: number; // Required FK to icaa
  discovery_id?: string; // Optional FK to player_species_discoveries (linked after guess)
  clue_category: string;
  clue_field: string;
  clue_value?: string;
  unlocked_at: string;
}

export interface PlayerStats {
  player_id: string; // Primary key (no separate id field)
  total_species_discovered: number;
  total_clues_unlocked: number;
  total_score: number;
  total_moves_made: number;
  total_games_played: number;
  total_play_time_seconds: number;
  average_clues_per_discovery: number | null;
  fastest_discovery_clues?: number;
  slowest_discovery_clues?: number;
  average_time_per_discovery_seconds?: number;
  species_by_order: Record<string, number>;
  species_by_family: Record<string, number>;
  species_by_genus: Record<string, number>;
  species_by_realm: Record<string, number>;
  species_by_biome: Record<string, number>;
  species_by_bioregion: Record<string, number>;
  marine_species_count: number;
  terrestrial_species_count: number;
  freshwater_species_count: number;
  aquatic_species_count: number;
  species_by_iucn_status: Record<string, number>;
  clues_by_category: Record<string, number>;
  favorite_clue_category?: string;
  first_discovery_at?: string;
  last_discovery_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerLeaderboard {
  user_id: string;
  username?: string;
  total_species_discovered: number;
  total_score: number;
  average_clues_per_discovery: number;
  total_play_time_seconds: number;
  rank_by_discoveries: number;
  rank_by_score: number;
  rank_by_efficiency: number;
}

export interface Bioregion {
  ogc_fid: number;
  bioregion?: string;
  realm?: string;
  subrealm?: string;
  biome?: string;
  wkb_geometry?: any;
}

export interface Species {
  ogc_fid: number;
  common_name?: string;
  scientific_name?: string;
  iucn_url?: string | null;

  // Classification fields
  genus?: string;
  family?: string;
  taxon_order?: string;
  class?: string;
  phylum?: string;
  kingdom?: string;
  taxonomic_comment?: string;

  // Habitat fields (boolean)
  habitat_description?: string;
  aquatic?: boolean;
  freshwater?: boolean;
  terrestrial?: boolean;
  marine?: boolean;
  habitat_tags?: string;

  // Geographic fields
  geographic_description?: string;
  distribution_comment?: string;
  island?: boolean;
  origin?: number;

  // Bioregion fields (from oneearth_bioregion)
  bioregion?: string;
  realm?: string;
  subrealm?: string;
  biome?: string;

  // Morphology fields
  pattern?: string;
  color_primary?: string;
  color_secondary?: string;
  shape_description?: string;
  size_min_cm?: number;
  size_max_cm?: number;
  weight_kg?: number;

  // Diet fields
  diet_type?: string;
  diet_prey?: string;
  diet_flora?: string;

  // Behavior fields
  behavior_1?: string;
  behavior_2?: string;

  // Life cycle fields
  life_description_1?: string;
  life_description_2?: string;
  lifespan?: string;
  maturity?: string;
  reproduction_type?: string;
  clutch_size?: string;

  // Conservation fields
  conservation_text?: string;
  conservation_code?: string;
  category?: string;
  threats?: string;

  // Key facts fields
  key_fact_1?: string;
  key_fact_2?: string;
  key_fact_3?: string;

  // Spatial geometry field (PostGIS)
  wkb_geometry?: any;
}

export interface Database {
  public: {
    Tables: {
      high_scores: {
        Row: HighScore;
        Insert: Omit<HighScore, 'id' | 'created_at'>;
        Update: Partial<Omit<HighScore, 'id' | 'created_at'>>;
      };
      icaa: {
        Row: Species;
        Insert: Omit<Species, 'ogc_fid'>;
        Update: Partial<Omit<Species, 'ogc_fid'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>;
      };
      player_game_sessions: {
        Row: PlayerGameSession;
        Insert: Omit<PlayerGameSession, 'id' | 'created_at'>;
        Update: Partial<Omit<PlayerGameSession, 'id' | 'player_id' | 'created_at'>>;
      };
      player_species_discoveries: {
        Row: PlayerSpeciesDiscovery;
        Insert: Omit<PlayerSpeciesDiscovery, 'id' | 'discovered_at'>;
        Update: Partial<Omit<PlayerSpeciesDiscovery, 'id' | 'player_id' | 'species_id' | 'discovered_at'>>;
      };
      player_clue_unlocks: {
        Row: PlayerClueUnlock;
        Insert: Omit<PlayerClueUnlock, 'id' | 'unlocked_at'>;
        Update: Partial<Omit<PlayerClueUnlock, 'id' | 'player_id' | 'unlocked_at'>>;
      };
      player_stats: {
        Row: PlayerStats;
        Insert: Omit<PlayerStats, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PlayerStats, 'player_id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: {
      top_scores: {
        Row: HighScore & { rank: number };
      };
      player_leaderboard: {
        Row: PlayerLeaderboard;
      };
    };
  };
}