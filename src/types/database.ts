export interface HighScore {
  id: string;
  username: string;
  score: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      high_scores: {
        Row: HighScore;
        Insert: Omit<HighScore, 'id' | 'created_at'>;
        Update: Partial<Omit<HighScore, 'id' | 'created_at'>>;
      };
    };
    Views: {
      top_scores: {
        Row: HighScore & { rank: number };
      };
    };
  };
}