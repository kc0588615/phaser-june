import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GameSidebar } from '@/components/game/GameSidebar';

// Mock data for now - will be replaced with real data from Zustand store
const mockData = {
  playerStats: {
    highScore: 12500,
    gamesPlayed: 47,
    totalScore: 245000,
  },
  discoveries: {
    species: [
      { id: 1, name: 'African Lion', imageUrl: '/assets/species/lion.png', discoveredAt: '2024-06-01' },
      { id: 2, name: 'Blue Whale', imageUrl: '/assets/species/whale.png', discoveredAt: '2024-06-02' },
    ],
    habitats: [
      { id: 1, name: 'Tropical Rainforest', code: 'TRF' },
      { id: 2, name: 'Coral Reef', code: 'CRF' },
    ]
  }
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-background">
      <GameSidebar />
      <main className="flex-1 pb-20 lg:pb-0 overflow-hidden">
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl h-full overflow-y-auto">
          <div className="flex items-center gap-4 mb-8">
            <Avatar className="h-20 w-20">
              <AvatarImage src="/placeholder-avatar.png" />
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Welcome Back!</h1>
              <p className="text-muted-foreground">
                Continue your journey of discovery
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Species Discovered</span>
                      <span className="text-sm font-medium">{mockData.discoveries.species.length}/150</span>
                    </div>
                    <Progress value={(mockData.discoveries.species.length / 150) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Habitats Explored</span>
                      <span className="text-sm font-medium">{mockData.discoveries.habitats.length}/50</span>
                    </div>
                    <Progress value={(mockData.discoveries.habitats.length / 50) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Game Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm">High Score</dt>
                    <dd className="text-sm font-semibold">{mockData.playerStats.highScore.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm">Games Played</dt>
                    <dd className="text-sm font-semibold">{mockData.playerStats.gamesPlayed}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm">Total Score</dt>
                    <dd className="text-sm font-semibold">{mockData.playerStats.totalScore.toLocaleString()}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle>Recent Discoveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.discoveries.species.map((species) => (
                    <div key={species.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <span className="text-xs">🦁</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{species.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Discovered {new Date(species.discoveredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}