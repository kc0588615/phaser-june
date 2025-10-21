"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  Target,
  Zap,
  Globe,
  Leaf,
  Shield,
  TrendingUp,
  Award,
  MapPin,
  Dna,
  Calendar,
  Star,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlayerStats } from "./types"

interface PlayerStatsDashboardProps {
  stats: PlayerStats
  playerName: string
  onBack: () => void
}

export function PlayerStatsDashboard({ stats, playerName, onBack }: PlayerStatsDashboardProps) {
  // ===== HELPER FUNCTIONS =====

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    } catch (error) {
      return "—"
    }
  }

  const getTopThree = (obj: Record<string, number> | undefined) => {
    if (!obj || Object.keys(obj).length === 0) return []
    return Object.entries(obj)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
  }

  // ===== SAFE AVATAR LETTER =====

  const avatarLetter = useMemo(() => {
    // Trim whitespace to handle "  Alex" edge case
    const trimmed = playerName?.trim()
    if (!trimmed || trimmed.length === 0) return "?"
    return trimmed.charAt(0).toUpperCase()
  }, [playerName])

  // Safe display name (trimmed or fallback)
  const displayName = useMemo(() => {
    const trimmed = playerName?.trim()
    return trimmed && trimmed.length > 0 ? trimmed : "Anonymous Player"
  }, [playerName])

  // ===== COMPUTED STATS (MEMOIZED) =====

  const computedStats = useMemo(() => {
    // Guard all divisions by zero
    const discoveryRate = stats.totalPlayTimeSeconds > 0
      ? (stats.totalSpeciesDiscovered / (stats.totalPlayTimeSeconds / 3600)).toFixed(1)
      : "0.0"

    const avgScorePerSpecies = stats.totalSpeciesDiscovered > 0
      ? Math.round(stats.totalScore / stats.totalSpeciesDiscovered)
      : 0

    const avgSessionLength = stats.totalGamesPlayed > 0
      ? stats.totalPlayTimeSeconds / stats.totalGamesPlayed
      : 0

    // Pre-compute top 3s for all JSONB fields (with null guards)
    const topOrders = getTopThree(stats.speciesByOrder)
    const topFamilies = getTopThree(stats.speciesByFamily)
    const topRealms = getTopThree(stats.speciesByRealm)
    const topBiomes = getTopThree(stats.speciesByBiome)

    // Top 5 clue categories sorted
    const topClueCategories = stats.cluesByCategory
      ? Object.entries(stats.cluesByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
      : []

    // IUCN status sorted
    const iucnStatusSorted = stats.speciesByIucnStatus
      ? Object.entries(stats.speciesByIucnStatus)
          .sort(([, a], [, b]) => b - a)
      : []

    // Counts for coverage calculations
    const orderCount = Object.keys(stats.speciesByOrder || {}).length
    const familyCount = Object.keys(stats.speciesByFamily || {}).length
    const genusCount = Object.keys(stats.speciesByGenus || {}).length
    const realmCount = Object.keys(stats.speciesByRealm || {}).length
    const biomeCount = Object.keys(stats.speciesByBiome || {}).length
    const bioregionCount = Object.keys(stats.speciesByBioregion || {}).length

    return {
      discoveryRate,
      avgScorePerSpecies,
      avgSessionLength,
      topOrders,
      topFamilies,
      topRealms,
      topBiomes,
      topClueCategories,
      iucnStatusSorted,
      orderCount,
      familyCount,
      genusCount,
      realmCount,
      biomeCount,
      bioregionCount,
    }
  }, [stats])

  // ===== ACTIVITY CHECK =====

  const hasActivity = stats.totalSpeciesDiscovered > 0

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-[#0f1729] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0f1729]/95 backdrop-blur border-b border-slate-700/50">
        <div className="flex items-center justify-between px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-bold">Player Stats</h1>
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Player Header Card */}
        <Card className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-blue-700/50 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
              {avatarLetter}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{displayName}</h2>
              <p className="text-xs text-slate-300">
                Member since {formatDate(stats.createdAt)} • {stats.totalGamesPlayed} sessions played
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-cyan-400">{stats.totalSpeciesDiscovered}</div>
              <div className="text-[10px] text-slate-400 uppercase">Species</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-purple-400">{stats.totalScore.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 uppercase">Score</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-green-400">{formatTime(stats.totalPlayTimeSeconds)}</div>
              <div className="text-[10px] text-slate-400 uppercase">Playtime</div>
            </div>
          </div>
        </Card>

        {/* Empty State */}
        {!hasActivity && (
          <Card className="bg-slate-800/40 border-slate-700/50 p-8 text-center">
            <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Discoveries Yet</h3>
            <p className="text-sm text-slate-400 mb-4">
              Start playing to discover species, unlock clues, and climb the leaderboard!
            </p>
            <Button
              onClick={onBack}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Start Exploring
            </Button>
          </Card>
        )}

        {/* Tabs for Different Stat Categories */}
        {hasActivity && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 mb-3">
              <TabsTrigger value="overview" className="text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="mastery" className="text-xs">
                Mastery
              </TabsTrigger>
              <TabsTrigger value="world" className="text-xs">
                World
              </TabsTrigger>
              <TabsTrigger value="ranks" className="text-xs">
                Ranks
              </TabsTrigger>
            </TabsList>

            {/* ===== OVERVIEW TAB ===== */}
            <TabsContent value="overview" className="space-y-3 mt-0">
              {/* Efficiency Stats */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-yellow-500/20 rounded flex items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h3 className="text-sm font-semibold">Efficiency & Performance</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Avg Clues per Discovery</span>
                    <span className="text-sm font-bold text-yellow-400">
                      {Number.isFinite(stats.averageCluesPerDiscovery)
                        ? stats.averageCluesPerDiscovery.toFixed(1)
                        : "0.0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Discovery Rate</span>
                    <span className="text-sm font-bold text-green-400">{computedStats.discoveryRate} /hour</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Avg Score per Species</span>
                    <span className="text-sm font-bold text-purple-400">{computedStats.avgScorePerSpecies}</span>
                  </div>
                  {stats.fastestDiscoveryClues != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Fastest Discovery</span>
                      <Badge className="bg-green-900/30 text-green-300 border-green-700/30 text-xs">
                        {stats.fastestDiscoveryClues} clues
                      </Badge>
                    </div>
                  )}
                  {stats.slowestDiscoveryClues != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Most Challenging</span>
                      <Badge className="bg-orange-900/30 text-orange-300 border-orange-700/30 text-xs">
                        {stats.slowestDiscoveryClues} clues
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>

              {/* Activity Timeline */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold">Activity</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">First Discovery</span>
                    <span className="text-slate-200">{formatDate(stats.firstDiscoveryAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Latest Discovery</span>
                    <span className="text-slate-200">{formatDate(stats.lastDiscoveryAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Moves</span>
                    <span className="text-slate-200">{stats.totalMovesMade.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Avg Session Length</span>
                    <span className="text-slate-200">{formatTime(computedStats.avgSessionLength)}</span>
                  </div>
                </div>
              </Card>

              {/* Clue Stats */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Clue Collection</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Total Clues Unlocked</span>
                      <span className="text-lg font-bold text-purple-400">{stats.totalCluesUnlocked}</span>
                    </div>

                    {computedStats.topClueCategories.length > 0 ? (
                      <>
                        <div className="space-y-1.5">
                          {computedStats.topClueCategories.map(([category, count]) => (
                            <div key={category}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-slate-300 capitalize">{category}</span>
                                <span className="text-xs text-slate-400">{count}</span>
                              </div>
                              <Progress
                                value={Math.min(100, (count / Math.max(1, stats.totalCluesUnlocked || 0)) * 100)}
                                className="h-1.5"
                              />
                            </div>
                          ))}
                        </div>

                        {stats.favoriteClueCategory && (
                          <div className="mt-3 pt-2 border-t border-slate-700">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-400">Favorite Category</span>
                              <Badge className="bg-purple-900/30 text-purple-300 border-purple-700/30 capitalize text-xs">
                                {stats.favoriteClueCategory}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-xs text-slate-400">
                          No clue category data available yet
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
            </TabsContent>

            {/* ===== MASTERY TAB ===== */}
            <TabsContent value="mastery" className="space-y-3 mt-0">
              {/* Taxonomic Coverage */}
              {computedStats.orderCount > 0 && (
                <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-red-500/20 rounded flex items-center justify-center">
                      <Dna className="w-4 h-4 text-red-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-red-300">Taxonomic Mastery</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Orders Discovered</span>
                        <span className="text-sm font-bold text-red-300">{computedStats.orderCount}</span>
                      </div>
                      {computedStats.topOrders.length > 0 && (
                        <div className="space-y-1">
                          {computedStats.topOrders.map(([order, count], index) => (
                            <div key={order} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-900/20 text-red-300 text-[10px] px-1.5 py-0">
                                  #{index + 1}
                                </Badge>
                                <span className="text-slate-300">{order}</span>
                              </div>
                              <span className="text-slate-400">{count} species</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Families Discovered</span>
                        <span className="text-sm font-bold text-red-300">{computedStats.familyCount}</span>
                      </div>
                      {computedStats.topFamilies.length > 0 && (
                        <div className="space-y-1">
                          {computedStats.topFamilies.map(([family, count], index) => (
                            <div key={family} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-900/20 text-red-300 text-[10px] px-1.5 py-0">
                                  #{index + 1}
                                </Badge>
                                <span className="text-slate-300">{family}</span>
                              </div>
                              <span className="text-slate-400">{count} species</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Taxonomic Diversity</span>
                        <span className="text-xs text-red-300">
                          {computedStats.genusCount} unique genera
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Habitat Distribution */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500/20 rounded flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-green-300">Habitat Mastery</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-2">
                    <div className="text-xs text-blue-300 mb-1">Marine</div>
                    <div className="text-xl font-bold text-blue-400">{stats.marineSpeciesCount}</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-2">
                    <div className="text-xs text-green-300 mb-1">Terrestrial</div>
                    <div className="text-xl font-bold text-green-400">{stats.terrestrialSpeciesCount}</div>
                  </div>
                  <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-2">
                    <div className="text-xs text-cyan-300 mb-1">Freshwater</div>
                    <div className="text-xl font-bold text-cyan-400">{stats.freshwaterSpeciesCount}</div>
                  </div>
                  <div className="bg-teal-900/20 border border-teal-700/30 rounded-lg p-2">
                    <div className="text-xs text-teal-300 mb-1">Aquatic</div>
                    <div className="text-xl font-bold text-teal-400">{stats.aquaticSpeciesCount}</div>
                  </div>
                </div>
              </Card>

              {/* Conservation Awareness */}
              {computedStats.iucnStatusSorted.length > 0 && (
                <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center">
                      <Shield className="w-4 h-4 text-orange-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-orange-300">Conservation Awareness</h3>
                  </div>

                  <div className="space-y-2">
                    {computedStats.iucnStatusSorted.map(([status, count]) => {
                      const statusColors: Record<string, { bg: string; text: string; bar: string }> = {
                        EX: { bg: "bg-black/40", text: "text-slate-200", bar: "bg-slate-600" },
                        EW: { bg: "bg-slate-900/40", text: "text-slate-300", bar: "bg-slate-500" },
                        CR: { bg: "bg-red-900/20", text: "text-red-300", bar: "bg-red-500" },
                        EN: { bg: "bg-red-800/20", text: "text-red-400", bar: "bg-red-400" },
                        VU: { bg: "bg-orange-900/20", text: "text-orange-300", bar: "bg-orange-500" },
                        NT: { bg: "bg-yellow-900/20", text: "text-yellow-300", bar: "bg-yellow-500" },
                        LC: { bg: "bg-green-900/20", text: "text-green-300", bar: "bg-green-500" },
                        DD: { bg: "bg-slate-800/20", text: "text-slate-400", bar: "bg-slate-400" },
                        NE: { bg: "bg-slate-700/20", text: "text-slate-400", bar: "bg-slate-500" },
                      }
                      const colors = statusColors[status] || { bg: "bg-slate-800/20", text: "text-slate-400", bar: "bg-slate-400" }

                      return (
                        <div key={status}>
                          <div className="flex justify-between items-center mb-1">
                            <Badge className={`${colors.bg} ${colors.text} border-0 text-xs`}>{status}</Badge>
                            <span className="text-xs text-slate-400">{count} species</span>
                          </div>
                          <Progress
                            value={Math.min(100, (count / Math.max(1, stats.totalSpeciesDiscovered || 1)) * 100)}
                            className="h-1.5"
                            indicatorClassName={colors.bar}
                          />
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ===== WORLD TAB ===== */}
            <TabsContent value="world" className="space-y-3 mt-0">
              {/* Geographic Coverage */}
              {computedStats.realmCount > 0 && (
                <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center">
                      <Globe className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-blue-300">Geographic Exploration</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Realms Explored</span>
                        <span className="text-sm font-bold text-blue-300">{computedStats.realmCount}</span>
                      </div>
                      {computedStats.topRealms.length > 0 && (
                        <div className="space-y-1">
                          {computedStats.topRealms.map(([realm, count], index) => (
                            <div key={realm} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-900/20 text-blue-300 text-[10px] px-1.5 py-0">
                                  #{index + 1}
                                </Badge>
                                <span className="text-slate-300">{realm}</span>
                              </div>
                              <span className="text-slate-400">{count} species</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400">Biomes Explored</span>
                        <span className="text-sm font-bold text-blue-300">{computedStats.biomeCount}</span>
                      </div>
                      {computedStats.topBiomes.length > 0 && (
                        <div className="space-y-1">
                          {computedStats.topBiomes.map(([biome, count], index) => (
                            <div key={biome} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-900/20 text-blue-300 text-[10px] px-1.5 py-0">
                                  #{index + 1}
                                </Badge>
                                <span className="text-slate-300">{biome}</span>
                              </div>
                              <span className="text-slate-400">{count} species</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Bioregions Visited</span>
                        <span className="text-xs text-blue-300">{computedStats.bioregionCount}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* World Coverage Progress */}
              {computedStats.realmCount > 0 && (
                <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-purple-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-purple-300">World Coverage</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Realm Coverage</span>
                        <span className="text-xs text-purple-300">{computedStats.realmCount}/8 realms</span>
                      </div>
                      <Progress
                        value={Math.min(100, (computedStats.realmCount / 8) * 100)}
                        className="h-2"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Biome Diversity</span>
                        <span className="text-xs text-purple-300">{computedStats.biomeCount} biomes</span>
                      </div>
                      <Progress
                        value={Math.min(100, (computedStats.biomeCount / 14) * 100)}
                        className="h-2"
                      />
                    </div>

                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-2 mt-3">
                      <div className="text-xs text-purple-200">
                        <strong>Geographic Diversity Score:</strong> You've explored species from{" "}
                        {computedStats.realmCount} different realms and{" "}
                        {computedStats.bioregionCount} unique bioregions!
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* ===== RANKS TAB ===== */}
            <TabsContent value="ranks" className="space-y-3 mt-0">
              {/* Leaderboard Position - use != null to handle rank 0 */}
              {(stats.rankByDiscoveries != null || stats.rankByScore != null || stats.rankByEfficiency != null) && (
                <Card className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-700/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-yellow-300">Leaderboard Rankings</h3>
                  </div>

                  <div className="space-y-2">
                    {stats.rankByDiscoveries != null && (
                      <div className="bg-slate-800/50 rounded-lg p-2 flex justify-between items-center">
                        <span className="text-xs text-slate-300">Rank by Discoveries</span>
                        <Badge className="bg-yellow-500 text-black font-bold">#{stats.rankByDiscoveries}</Badge>
                      </div>
                    )}
                    {stats.rankByScore != null && (
                      <div className="bg-slate-800/50 rounded-lg p-2 flex justify-between items-center">
                        <span className="text-xs text-slate-300">Rank by Score</span>
                        <Badge className="bg-purple-500 text-white font-bold">#{stats.rankByScore}</Badge>
                      </div>
                    )}
                    {stats.rankByEfficiency != null && (
                      <div className="bg-slate-800/50 rounded-lg p-2 flex justify-between items-center">
                        <span className="text-xs text-slate-300">Rank by Efficiency</span>
                        <Badge className="bg-green-500 text-white font-bold">#{stats.rankByEfficiency}</Badge>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Empty state for ranks - use == null checks */}
              {stats.rankByDiscoveries == null && stats.rankByScore == null && stats.rankByEfficiency == null && (
                <Card className="bg-slate-800/40 border-slate-700/50 p-4 text-center">
                  <p className="text-sm text-slate-400">
                    Complete more discoveries to appear on the leaderboard!
                  </p>
                </Card>
              )}

              {/* Achievements */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-pink-500/20 rounded flex items-center justify-center">
                    <Award className="w-4 h-4 text-pink-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-pink-300">Achievements</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Achievement badges - calculate from stats */}
                  {stats.totalSpeciesDiscovered >= 10 && (
                    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/30 rounded-lg p-2">
                      <Star className="w-4 h-4 text-green-400 mb-1" />
                      <div className="text-xs font-semibold text-green-300">First Steps</div>
                      <div className="text-[10px] text-green-400">Discovered 10+ species</div>
                    </div>
                  )}

                  {computedStats.realmCount >= 5 && (
                    <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-700/30 rounded-lg p-2">
                      <Globe className="w-4 h-4 text-blue-400 mb-1" />
                      <div className="text-xs font-semibold text-blue-300">Explorer</div>
                      <div className="text-[10px] text-blue-400">Visited 5+ realms</div>
                    </div>
                  )}

                  {computedStats.iucnStatusSorted.filter(([status]) => ["CR", "EN", "VU"].includes(status)).reduce((sum, [, count]) => sum + count, 0) >= 5 && (
                    <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-700/30 rounded-lg p-2">
                      <Shield className="w-4 h-4 text-orange-400 mb-1" />
                      <div className="text-xs font-semibold text-orange-300">Conservationist</div>
                      <div className="text-[10px] text-orange-400">Found 5+ threatened</div>
                    </div>
                  )}

                  {stats.averageCluesPerDiscovery < 5 && (
                    <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 border border-yellow-700/30 rounded-lg p-2">
                      <Zap className="w-4 h-4 text-yellow-400 mb-1" />
                      <div className="text-xs font-semibold text-yellow-300">Speed Demon</div>
                      <div className="text-[10px] text-yellow-400">{"< 5 avg clues"}</div>
                    </div>
                  )}
                </div>

                {/* Empty state if no achievements */}
                {stats.totalSpeciesDiscovered < 10 &&
                  computedStats.realmCount < 5 &&
                  stats.averageCluesPerDiscovery >= 5 &&
                  computedStats.iucnStatusSorted.filter(([status]) => ["CR", "EN", "VU"].includes(status)).reduce((sum, [, count]) => sum + count, 0) < 5 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">
                      Keep playing to unlock achievements!
                    </p>
                  </div>
                )}
              </Card>

              {/* Personal Records */}
              <Card className="bg-slate-800/40 border-slate-700/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500/20 rounded flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-green-300">Personal Records</h3>
                </div>

                <div className="space-y-2 text-xs">
                  {stats.fastestDiscoveryClues != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Best Discovery Speed</span>
                      <Badge className="bg-green-900/30 text-green-300 border-green-700/30">
                        {stats.fastestDiscoveryClues} clues
                      </Badge>
                    </div>
                  )}
                  {stats.slowestDiscoveryClues != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Most Challenging</span>
                      <Badge className="bg-orange-900/30 text-orange-300 border-orange-700/30">
                        {stats.slowestDiscoveryClues} clues
                      </Badge>
                    </div>
                  )}
                  {stats.favoriteClueCategory && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Favorite Clue Type</span>
                      <Badge className="bg-purple-900/30 text-purple-300 border-purple-700/30 capitalize">
                        {stats.favoriteClueCategory}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
