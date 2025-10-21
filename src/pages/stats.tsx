'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PlayerStatsDashboard } from '@/components/PlayerStatsDashboard';
import type { PlayerStats } from '@/components/PlayerStatsDashboard';
import { fetchPlayerStats, getPlayerDisplayName } from '@/lib/playerStatsService';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [playerName, setPlayerName] = useState<string>('Player');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = supabaseBrowser();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Fetch player stats and display name in parallel
        const [fetchedStats, displayName] = await Promise.all([
          fetchPlayerStats({ includeRankings: true }),
          getPlayerDisplayName()
        ]);

        setStats(fetchedStats);
        setPlayerName(displayName);

        // If no stats, user might be new
        if (!fetchedStats) {
          console.log('No stats found - new player or no discoveries yet');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading stats:', err);
        setError('Failed to load player statistics. Please try again.');
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const handleBack = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Head>
          <title>Player Stats - Loading...</title>
        </Head>
        <div className="min-h-screen bg-[#0f1729] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Loading your stats...</p>
          </div>
        </div>
      </>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Player Stats - Sign In Required</title>
        </Head>
        <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
          <Card className="bg-slate-800/40 border-slate-700/50 p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-slate-300 mb-6">
              You need to be signed in to view your player statistics. Sign in to track your discoveries, view rankings, and more!
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleBack}
                variant="outline"
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              >
                Back to Game
              </Button>
              <Button
                onClick={handleLogin}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Head>
          <title>Player Stats - Error</title>
        </Head>
        <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
          <Card className="bg-slate-800/40 border-slate-700/50 p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Stats</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleBack}
                variant="outline"
                className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
              >
                Back to Game
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  // No stats found (new player with 0 discoveries)
  if (!stats) {
    // Create minimal stats object for new players
    const newPlayerStats: PlayerStats = {
      playerId: '',
      totalSpeciesDiscovered: 0,
      totalCluesUnlocked: 0,
      totalScore: 0,
      totalMovesMade: 0,
      totalGamesPlayed: 0,
      totalPlayTimeSeconds: 0,
      averageCluesPerDiscovery: 0,
      speciesByOrder: {},
      speciesByFamily: {},
      speciesByGenus: {},
      speciesByRealm: {},
      speciesByBiome: {},
      speciesByBioregion: {},
      marineSpeciesCount: 0,
      terrestrialSpeciesCount: 0,
      freshwaterSpeciesCount: 0,
      aquaticSpeciesCount: 0,
      speciesByIucnStatus: {},
      cluesByCategory: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return (
      <>
        <Head>
          <title>Player Stats - {playerName}</title>
        </Head>
        <PlayerStatsDashboard
          stats={newPlayerStats}
          playerName={playerName}
          onBack={handleBack}
        />
      </>
    );
  }

  // Success - show stats
  return (
    <>
      <Head>
        <title>Player Stats - {playerName}</title>
      </Head>
      <PlayerStatsDashboard
        stats={stats}
        playerName={playerName}
        onBack={handleBack}
      />
    </>
  );
}
