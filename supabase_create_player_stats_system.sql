-- ============================================
-- PLAYER STATISTICS SYSTEM - V2 (FIXED)
-- Comprehensive tracking for CritterConnect
-- Fixes based on Codex review
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PLAYER GAME SESSIONS
-- Track individual gameplay sessions with timestamps
CREATE TABLE IF NOT EXISTS public.player_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- FIXED: Added default
  player_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_moves INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  species_discovered_in_session INTEGER DEFAULT 0,
  clues_unlocked_in_session INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_player_game_sessions_player ON public.player_game_sessions(player_id);
CREATE INDEX idx_player_game_sessions_started ON public.player_game_sessions(started_at);

-- 2. PLAYER SPECIES DISCOVERIES
-- Track each species discovery with detailed metrics
CREATE TABLE IF NOT EXISTS public.player_species_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- FIXED: Added default
  player_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  species_id INTEGER REFERENCES public.icaa(ogc_fid) ON DELETE CASCADE,
  session_id UUID REFERENCES public.player_game_sessions(id) ON DELETE SET NULL,

  -- Discovery metrics
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  time_to_discover_seconds INTEGER, -- Time from game start to discovery
  clues_unlocked_before_guess INTEGER DEFAULT 0,
  incorrect_guesses_count INTEGER DEFAULT 0,
  score_earned INTEGER DEFAULT 0,

  -- REMOVED clues_revealed JSONB - single source of truth in player_clue_unlocks

  UNIQUE(player_id, species_id)
);

CREATE INDEX idx_player_species_discoveries_player ON public.player_species_discoveries(player_id);
CREATE INDEX idx_player_species_discoveries_species ON public.player_species_discoveries(species_id);
CREATE INDEX idx_player_species_discoveries_discovered_at ON public.player_species_discoveries(discovered_at);

-- 3. PLAYER CLUE UNLOCKS
-- Granular tracking of individual clue revelations (SINGLE SOURCE OF TRUTH)
CREATE TABLE IF NOT EXISTS public.player_clue_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- FIXED: Added default
  player_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  species_id INTEGER REFERENCES public.icaa(ogc_fid) ON DELETE CASCADE,
  discovery_id UUID REFERENCES public.player_species_discoveries(id) ON DELETE CASCADE,

  -- Clue details
  clue_category TEXT NOT NULL, -- 'classification', 'habitat', 'geographic', etc.
  clue_field TEXT NOT NULL, -- 'phylum', 'realm', 'color_prim', etc.
  clue_value TEXT, -- The actual value revealed

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(player_id, species_id, clue_category, clue_field)
);

CREATE INDEX idx_player_clue_unlocks_player ON public.player_clue_unlocks(player_id);
CREATE INDEX idx_player_clue_unlocks_category ON public.player_clue_unlocks(clue_category);
CREATE INDEX idx_player_clue_unlocks_discovered ON public.player_clue_unlocks(discovery_id);

-- 4. PLAYER AGGREGATE STATISTICS
-- Pre-computed stats for fast dashboard queries
CREATE TABLE IF NOT EXISTS public.player_stats (
  player_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- FIXED: player_id is now PK

  -- Overall metrics
  total_species_discovered INTEGER DEFAULT 0,
  total_clues_unlocked INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_moves_made INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  total_play_time_seconds INTEGER DEFAULT 0,

  -- Discovery efficiency
  average_clues_per_discovery NUMERIC(5,2) DEFAULT 0,
  fastest_discovery_clues INTEGER, -- Fewest clues needed
  slowest_discovery_clues INTEGER, -- Most clues needed
  average_time_per_discovery_seconds INTEGER,

  -- Taxonomic coverage (JSONB for dashboard only - consider normalizing later)
  species_by_order JSONB DEFAULT '{}', -- {"TESTUDINES": 5, "SQUAMATA": 3}
  species_by_family JSONB DEFAULT '{}',
  species_by_genus JSONB DEFAULT '{}',

  -- Geographic coverage
  species_by_realm JSONB DEFAULT '{}',
  species_by_biome JSONB DEFAULT '{}',
  species_by_bioregion JSONB DEFAULT '{}',

  -- Habitat distribution
  marine_species_count INTEGER DEFAULT 0,
  terrestrial_species_count INTEGER DEFAULT 0,
  freshwater_species_count INTEGER DEFAULT 0,
  aquatic_species_count INTEGER DEFAULT 0,

  -- Conservation awareness
  species_by_iucn_status JSONB DEFAULT '{}', -- {"EN": 2, "VU": 3}

  -- Clue category mastery
  clues_by_category JSONB DEFAULT '{}', -- {"classification": 45, "habitat": 32}
  favorite_clue_category TEXT,

  -- Timestamps
  first_discovery_at TIMESTAMPTZ,
  last_discovery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MATERIALIZED VIEW: Player Leaderboard
-- Fast queries for rankings and comparisons
CREATE MATERIALIZED VIEW IF NOT EXISTS public.player_leaderboard AS
SELECT
  p.user_id,
  p.username,
  ps.total_species_discovered,
  ps.total_score,
  ps.average_clues_per_discovery,
  ps.total_play_time_seconds,
  RANK() OVER (ORDER BY ps.total_species_discovered DESC, ps.total_score DESC) as rank_by_discoveries,
  RANK() OVER (ORDER BY ps.total_score DESC) as rank_by_score,
  RANK() OVER (ORDER BY ps.average_clues_per_discovery ASC NULLS LAST) as rank_by_efficiency
FROM public.profiles p
INNER JOIN public.player_stats ps ON p.user_id = ps.player_id -- FIXED: Changed to INNER JOIN
WHERE ps.total_species_discovered > 0
ORDER BY ps.total_species_discovered DESC, ps.total_score DESC;

-- FIXED: Add unique index for CONCURRENT refresh
CREATE UNIQUE INDEX idx_player_leaderboard_user ON public.player_leaderboard(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE public.player_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_species_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_clue_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can only see their own sessions
CREATE POLICY "player_game_sessions_select" ON public.player_game_sessions
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_game_sessions_insert" ON public.player_game_sessions
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_game_sessions_update" ON public.player_game_sessions
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = player_id)
WITH CHECK ((SELECT auth.uid()) = player_id);

-- Discoveries: Users can only see their own discoveries
CREATE POLICY "player_species_discoveries_select" ON public.player_species_discoveries
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_species_discoveries_insert" ON public.player_species_discoveries
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_species_discoveries_update" ON public.player_species_discoveries
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = player_id)
WITH CHECK ((SELECT auth.uid()) = player_id);

-- Clue Unlocks: Users can only see their own clues
CREATE POLICY "player_clue_unlocks_select" ON public.player_clue_unlocks
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_clue_unlocks_insert" ON public.player_clue_unlocks
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = player_id);

-- Stats: Users can see their own stats
CREATE POLICY "player_stats_select" ON public.player_stats
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_stats_insert" ON public.player_stats
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = player_id);

CREATE POLICY "player_stats_update" ON public.player_stats
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = player_id)
WITH CHECK ((SELECT auth.uid()) = player_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- FIXED: Function to initialize player_stats row if needed
CREATE OR REPLACE FUNCTION public.ensure_player_stats_exists(p_player_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.player_stats (player_id)
  VALUES (p_player_id)
  ON CONFLICT (player_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public; -- FIXED: Set search_path

-- FIXED: Update player_stats when new discovery is added
CREATE OR REPLACE FUNCTION public.update_player_stats_on_discovery()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure stats row exists (UPSERT style)
  INSERT INTO public.player_stats (
    player_id,
    total_species_discovered,
    first_discovery_at,
    last_discovery_at
  )
  VALUES (
    NEW.player_id,
    1,
    NEW.discovered_at,
    NEW.discovered_at
  )
  ON CONFLICT (player_id) DO UPDATE
  SET
    total_species_discovered = player_stats.total_species_discovered + 1,
    last_discovery_at = NEW.discovered_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public; -- FIXED: Set search_path

DROP TRIGGER IF EXISTS on_species_discovery_created ON public.player_species_discoveries;
CREATE TRIGGER on_species_discovery_created
  AFTER INSERT ON public.player_species_discoveries
  FOR EACH ROW EXECUTE FUNCTION public.update_player_stats_on_discovery();

-- FIXED: Update player_stats when clue is unlocked (UPSERT style)
CREATE OR REPLACE FUNCTION public.update_player_stats_on_clue_unlock()
RETURNS TRIGGER AS $$
BEGIN
  -- UPSERT: Ensure stats row exists before updating
  INSERT INTO public.player_stats (
    player_id,
    total_clues_unlocked,
    clues_by_category
  )
  VALUES (
    NEW.player_id,
    1,
    jsonb_build_object(NEW.clue_category, 1)
  )
  ON CONFLICT (player_id) DO UPDATE
  SET
    total_clues_unlocked = player_stats.total_clues_unlocked + 1,
    clues_by_category = jsonb_set(
      COALESCE(player_stats.clues_by_category, '{}'::jsonb),
      ARRAY[NEW.clue_category],
      to_jsonb(COALESCE((player_stats.clues_by_category->>NEW.clue_category)::integer, 0) + 1)
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public; -- FIXED: Set search_path

DROP TRIGGER IF EXISTS on_clue_unlock_created ON public.player_clue_unlocks;
CREATE TRIGGER on_clue_unlock_created
  AFTER INSERT ON public.player_clue_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_player_stats_on_clue_unlock();

-- Function: Refresh materialized view (call periodically or after bulk updates)
CREATE OR REPLACE FUNCTION public.refresh_player_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.player_leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public; -- FIXED: Set search_path

-- NOTE: For production, consider a pg_cron job to refresh leaderboard every 5 minutes:
-- SELECT cron.schedule('refresh-leaderboard', '*/5 * * * *', 'SELECT public.refresh_player_leaderboard();');
