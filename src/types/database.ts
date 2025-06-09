export interface HighScore {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

export interface Species {
  ogc_fid: number;
  comm_name?: string;
  sci_name?: string;
  
  // Classification fields
  genus?: string;
  family?: string;
  order_?: string;
  class?: string;
  phylum?: string;
  kingdom?: string;
  tax_comm?: string;
  
  // Habitat fields
  hab_desc?: string;
  aquatic?: boolean;
  freshwater?: boolean;
  terrestr?: boolean;
  terrestria?: boolean;
  marine?: boolean;
  hab_tags?: string;
  
  // Geographic fields
  geo_desc?: string;
  dist_comm?: string;
  island?: boolean;
  origin?: number;
  
  // Morphology fields
  pattern?: string;
  color_prim?: string;
  color_sec?: string;
  shape_desc?: string;
  size_min?: number;
  size_max?: number;
  weight_kg?: number;
  
  // Diet fields
  diet_type?: string;
  diet_prey?: string;
  diet_flora?: string;
  
  // Behavior fields
  behav_1?: string;
  behav_2?: string;
  
  // Life cycle fields
  life_desc1?: string;
  life_desc2?: string;
  lifespan?: string;
  maturity?: string;
  repro_type?: string;
  clutch_sz?: string;
  
  // Conservation fields
  cons_text?: string;
  cons_code?: string;
  category?: string;
  threats?: string;
  
  // Key facts fields
  key_fact1?: string;
  key_fact2?: string;
  key_fact3?: string;
  
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
    };
    Views: {
      top_scores: {
        Row: HighScore & { rank: number };
      };
    };
  };
}