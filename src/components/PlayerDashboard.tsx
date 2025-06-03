"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  TreePine,
  Fish,
  Bird,
  Bug,
  Flower,
  Mountain,
  Waves,
  Trees,
  Trophy,
  Target,
  Clock,
  Zap,
  Star,
  Award,
  TrendingUp,
  Calendar
} from "lucide-react"

interface PlayerStats {
  speciesDiscovered: number
  totalSpecies: number
  habitatsDiscovered: number
  totalHabitats: number
  gamesPlayed: number
  totalScore: number
  averageScore: number
  bestScore: number
  timePlayed: string
  level: number
  xp: number
  xpToNextLevel: number
  achievements: Achievement[]
  recentDiscoveries: Discovery[]
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  unlocked: boolean
  unlockedAt?: string
}

interface Discovery {
  id: string
  name: string
  type: 'species' | 'habitat'
  icon: React.ComponentType<{ className?: string }>
  discoveredAt: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

// Mock data - in a real app this would come from your game state/backend
const mockPlayerStats: PlayerStats = {
  speciesDiscovered: 24,
  totalSpecies: 120,
  habitatsDiscovered: 8,
  totalHabitats: 15,
  gamesPlayed: 47,
  totalScore: 892450,
  averageScore: 18988,
  bestScore: 45230,
  timePlayed: "12h 34m",
  level: 7,
  xp: 2840,
  xpToNextLevel: 1160,
  achievements: [
    {
      id: "first_species",
      name: "First Discovery",
      description: "Discover your first species",
      icon: Star,
      unlocked: true,
      unlockedAt: "2024-01-15"
    },
    {
      id: "habitat_explorer",
      name: "Habitat Explorer",
      description: "Discover 5 different habitats",
      icon: Mountain,
      unlocked: true,
      unlockedAt: "2024-01-20"
    },
    {
      id: "species_master",
      name: "Species Master",
      description: "Discover 50 different species",
      icon: Trophy,
      unlocked: false
    }
  ],
  recentDiscoveries: [
    {
      id: "arctic_fox",
      name: "Arctic Fox",
      type: "species",
      icon: Fish,
      discoveredAt: "2024-01-25",
      rarity: "rare"
    },
    {
      id: "coral_reef",
      name: "Coral Reef",
      type: "habitat",
      icon: Waves,
      discoveredAt: "2024-01-24",
      rarity: "uncommon"
    },
    {
      id: "hummingbird",
      name: "Ruby-throated Hummingbird",
      type: "species",
      icon: Bird,
      discoveredAt: "2024-01-23",
      rarity: "common"
    }
  ]
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
    case 'rare': return 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
    case 'uncommon': return 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

export function PlayerDashboard() {
  const stats = mockPlayerStats
  const speciesProgress = (stats.speciesDiscovered / stats.totalSpecies) * 100
  const habitatProgress = (stats.habitatsDiscovered / stats.totalHabitats) * 100
  const xpProgress = (stats.xp / (stats.xp + stats.xpToNextLevel)) * 100

  return (
    <div className="p-6 space-y-6">
      {/* Player Level & XP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Level {stats.level} Explorer
              </CardTitle>
              <p className="text-muted-foreground">
                {stats.xp.toLocaleString()} XP / {(stats.xp + stats.xpToNextLevel).toLocaleString()} XP
              </p>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              <Zap className="h-4 w-4 mr-1" />
              {stats.xpToNextLevel} XP to next level
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={xpProgress} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="discoveries" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discoveries">Discoveries</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="discoveries" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Species Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-green-600" />
                  Species Discovered
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-2xl font-bold">
                  <span>{stats.speciesDiscovered}</span>
                  <span className="text-muted-foreground">/ {stats.totalSpecies}</span>
                </div>
                <Progress value={speciesProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {speciesProgress.toFixed(1)}% of all species discovered
                </p>
              </CardContent>
            </Card>

            {/* Habitat Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mountain className="h-5 w-5 text-blue-600" />
                  Habitats Explored
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-2xl font-bold">
                  <span>{stats.habitatsDiscovered}</span>
                  <span className="text-muted-foreground">/ {stats.totalHabitats}</span>
                </div>
                <Progress value={habitatProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {habitatProgress.toFixed(1)}% of all habitats explored
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Games Played
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.gamesPlayed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Best Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.bestScore.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Total Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalScore.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Played
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.timePlayed}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Average Score</span>
                <span className="text-lg font-bold">{stats.averageScore.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Discovery Rate</span>
                <span className="text-lg font-bold">
                  {((stats.speciesDiscovered + stats.habitatsDiscovered) / stats.gamesPlayed).toFixed(1)} per game
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.achievements.map((achievement) => (
              <Card key={achievement.id} className={`${achievement.unlocked ? 'border-primary' : 'opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${achievement.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <achievement.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <p className="text-xs text-primary mt-1">
                          Unlocked on {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {achievement.unlocked && (
                      <Badge variant="secondary">
                        <Trophy className="h-3 w-3 mr-1" />
                        Unlocked
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Discoveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentDiscoveries.map((discovery, index) => (
                  <div key={discovery.id}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <discovery.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{discovery.name}</h4>
                          <Badge variant="outline" className={getRarityColor(discovery.rarity)}>
                            {discovery.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {discovery.type === 'species' ? 'Species' : 'Habitat'} • 
                          Discovered on {new Date(discovery.discoveredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {index < stats.recentDiscoveries.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}