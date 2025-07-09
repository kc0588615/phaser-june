import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { HighScore } from '@/types/database';
import SimpleLayout from '@/components/SimpleLayout';
import { Button } from '@/components/ui/button';

export default function HighScoresPage() {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScores();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('high-scores')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'high_scores' },
        (payload) => {
          console.log('New score added:', payload);
          fetchScores(); // Refetch when new score added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchScores = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(50);

      if (supabaseError) throw supabaseError;
      setScores(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching scores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <SimpleLayout 
      title="🏆 Top High Scores" 
      description="View the top scores in our Match 3 game"
    >
      <div className="bg-card/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-border">
        {isLoading && (
          <p className="text-center text-muted-foreground">Loading scores...</p>
        )}
        
        {error && (
          <p className="text-destructive text-center">
            Error fetching scores: {error}
          </p>
        )}
        
        {!isLoading && !error && scores.length === 0 && (
          <p className="text-center text-muted-foreground">
            No scores yet. Be the first to play!
          </p>
        )}
        
        {!isLoading && !error && scores.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="p-3 text-left font-semibold">Rank</th>
                  <th className="p-3 text-left font-semibold">Player</th>
                  <th className="p-3 text-right font-semibold">Score</th>
                  <th className="p-3 text-right font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`
                      border-b border-border/50 transition-colors
                      ${index === 0 ? 'bg-yellow-500/10' : ''}
                      ${index === 1 ? 'bg-gray-400/10' : ''}
                      ${index === 2 ? 'bg-orange-600/10' : ''}
                      hover:bg-accent/50
                    `}
                  >
                    <td className="p-3">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td className={`p-3 ${index < 3 ? 'font-bold' : ''}`}>
                      {entry.username}
                    </td>
                    <td className="p-3 text-right text-yellow-400 font-bold text-lg">
                      {entry.score.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-muted-foreground text-sm">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center mt-12">
        <Link href="/">
          <Button 
            variant="outline" 
            size="lg"
            className="border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-background transition-all"
          >
            ← Back to Game
          </Button>
        </Link>
      </div>
    </SimpleLayout>
  );
}