import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { HighScore } from '@/types/database';
import styles from '@/styles/Home.module.css';

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
    <>
      <Head>
        <title>High Scores - Match 3 Game</title>
        <meta name="description" content="View the top scores in our Match 3 game" />
        <link rel="icon" href="/favicon.png" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>🏆 Top High Scores</h1>
          
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto', 
            background: 'rgba(26, 26, 46, 0.9)', 
            padding: '2rem', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
          }}>
            {isLoading && (
              <p style={{ textAlign: 'center', color: '#888' }}>Loading scores...</p>
            )}
            
            {error && (
              <p style={{ color: '#ff4444', textAlign: 'center' }}>
                Error fetching scores: {error}
              </p>
            )}
            
            {!isLoading && !error && scores.length === 0 && (
              <p style={{ textAlign: 'center', color: '#888' }}>
                No scores yet. Be the first to play!
              </p>
            )}
            
            {!isLoading && !error && scores.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  color: 'white'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #444' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Rank</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Player</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Score</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((entry, index) => (
                      <tr 
                        key={entry.id} 
                        style={{ 
                          borderBottom: '1px solid #333',
                          backgroundColor: index === 0 ? 'rgba(255, 215, 0, 0.1)' : 
                                         index === 1 ? 'rgba(192, 192, 192, 0.1)' : 
                                         index === 2 ? 'rgba(205, 127, 50, 0.1)' : 
                                         'transparent'
                        }}
                      >
                        <td style={{ padding: '10px' }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </td>
                        <td style={{ padding: '10px', fontWeight: index < 3 ? 'bold' : 'normal' }}>
                          {entry.username}
                        </td>
                        <td style={{ 
                          padding: '10px', 
                          textAlign: 'right', 
                          color: '#ffff00',
                          fontWeight: 'bold',
                          fontSize: '1.1rem'
                        }}>
                          {entry.score.toLocaleString()}
                        </td>
                        <td style={{ 
                          padding: '10px', 
                          textAlign: 'right',
                          color: '#888',
                          fontSize: '0.9rem'
                        }}>
                          {formatDate(entry.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/" style={{ 
              color: '#00bcd4', 
              textDecoration: 'none', 
              fontSize: '1.2rem',
              padding: '10px 20px',
              border: '2px solid #00bcd4',
              borderRadius: '8px',
              display: 'inline-block',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00bcd4';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#00bcd4';
            }}>
              ← Back to Game
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}