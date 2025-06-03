# Two-Screen React Application Design Specification

## Overview
This document outlines the design and architecture for a two-screen React application integrating Cesium 3D globe and Phaser 3 match-3 game with shadcn/ui components.

## Application Screens

### Screen 1: Main Game Interface
**Layout**: Split-screen with Cesium globe (top 50%) and Phaser game (bottom 50%)
- **Cesium Globe**: Interactive 3D earth with location selection
- **Phaser Game**: Match-3 puzzle game with habitat/species themes
- **Minimize Feature**: Cesium globe can be minimized to expand game area

### Screen 2: Player Statistics Dashboard
**Layout**: Full-screen statistics and progress tracking
- **Species Discovery**: Grid/list of discovered species with images and details
- **Habitat Discovery**: Map visualization of discovered habitats
- **Player Stats**: Progress bars, achievements, scores, and analytics

## Architecture Overview

### Core Technology Stack
- **React 18** with Next.js 15.3.1
- **TypeScript** for type safety
- **shadcn/ui** components with Tailwind CSS
- **Cesium** for 3D globe visualization
- **Phaser 3.90.0** for game engine
- **EventBus** for component communication

### Component Hierarchy
```
App
├── ThemeProvider (shadcn theme support)
├── SidebarProvider (shadcn navigation)
├── AppSidebar
├── MainLayout
│   ├── Screen1: GameInterface
│   │   ├── CesiumSection (resizable)
│   │   └── PhaserSection
│   └── Screen2: PlayerDashboard
│       ├── SpeciesGrid
│       ├── HabitatMap
│       └── StatsCards
```

## Detailed Component Design

### 1. Theme Provider Setup
```typescript
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "phaser-june-theme",
}: ThemeProviderProps) {
  // Implementation as per shadcn documentation
}
```

### 2. Application Layout with Sidebar
```typescript
// src/components/AppSidebar.tsx
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Home, Map, BarChart3, Settings } from "lucide-react"

const menuItems = [
  { title: "Game", url: "/game", icon: Home },
  { title: "Statistics", url: "/stats", icon: BarChart3 },
  { title: "Map", url: "/map", icon: Map },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### 3. Screen 1: Game Interface Layout
```typescript
// src/components/GameInterface.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ChevronUp, ChevronDown } from "lucide-react"
import CesiumMap from "./CesiumMap"
import { PhaserGame } from "../PhaserGame"

export function GameInterface() {
  const [cesiumMinimized, setCesiumMinimized] = useState(false)
  const [cesiumSize, setCesiumSize] = useState(50) // Percentage

  return (
    <div className="h-screen w-full">
      <ResizablePanelGroup direction="vertical">
        {/* Cesium Globe Section */}
        <ResizablePanel 
          defaultSize={cesiumMinimized ? 10 : 50}
          minSize={cesiumMinimized ? 5 : 20}
          maxSize={80}
        >
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Global Habitat Explorer</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCesiumMinimized(!cesiumMinimized)}
                  className="h-8 w-8 p-0"
                >
                  {cesiumMinimized ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              {!cesiumMinimized && (
                <div className="h-full w-full">
                  <CesiumMap />
                </div>
              )}
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        {/* Phaser Game Section */}
        <ResizablePanel defaultSize={cesiumMinimized ? 90 : 50} minSize={20}>
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Species Discovery Game</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-4rem)]">
              <div className="h-full w-full bg-black">
                <PhaserGame />
              </div>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
```

### 4. Screen 2: Player Statistics Dashboard
```typescript
// src/components/PlayerDashboard.tsx
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PlayerStats {
  speciesDiscovered: number
  totalSpecies: number
  habitatsExplored: number
  totalHabitats: number
  currentScore: number
  level: number
  achievements: Achievement[]
}

interface Species {
  id: string
  name: string
  habitat: string
  discovered: boolean
  imageUrl?: string
  rarity: 'common' | 'rare' | 'legendary'
}

interface Habitat {
  id: string
  name: string
  coordinates: [number, number]
  explored: boolean
  speciesCount: number
}

export function PlayerDashboard() {
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [species, setSpecies] = useState<Species[]>([])
  const [habitats, setHabitats] = useState<Habitat[]>([])

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src="/api/placeholder/80/80" />
            <AvatarFallback>PL</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Player Dashboard</h1>
            <p className="text-muted-foreground">Level {stats?.level || 1} Explorer</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Species Discovered</CardDescription>
              <CardTitle className="text-2xl">
                {stats?.speciesDiscovered || 0} / {stats?.totalSpecies || 100}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={(stats?.speciesDiscovered || 0) / (stats?.totalSpecies || 100) * 100} 
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Habitats Explored</CardDescription>
              <CardTitle className="text-2xl">
                {stats?.habitatsExplored || 0} / {stats?.totalHabitats || 50}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress 
                value={(stats?.habitatsExplored || 0) / (stats?.totalHabitats || 50) * 100} 
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Score</CardDescription>
              <CardTitle className="text-2xl">{stats?.currentScore?.toLocaleString() || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Next level at {((stats?.level || 1) * 1000).toLocaleString()} points
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="species" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="species">Species Collection</TabsTrigger>
            <TabsTrigger value="habitats">Habitat Map</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="species" className="space-y-4">
            <SpeciesGrid species={species} />
          </TabsContent>

          <TabsContent value="habitats" className="space-y-4">
            <HabitatMap habitats={habitats} />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <AchievementsList achievements={stats?.achievements || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Species Grid Component
function SpeciesGrid({ species }: { species: Species[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {species.map((animal) => (
        <Card key={animal.id} className={`cursor-pointer transition-all hover:scale-105 ${!animal.discovered ? 'opacity-50' : ''}`}>
          <CardContent className="p-4">
            <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
              {animal.discovered ? (
                <img 
                  src={animal.imageUrl || "/api/placeholder/100/100"} 
                  alt={animal.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  ?
                </div>
              )}
            </div>
            <h3 className="font-medium text-sm truncate">
              {animal.discovered ? animal.name : "???"}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {animal.discovered ? animal.habitat : "Unknown"}
              </p>
              {animal.discovered && (
                <Badge variant={
                  animal.rarity === 'legendary' ? 'default' : 
                  animal.rarity === 'rare' ? 'secondary' : 'outline'
                }>
                  {animal.rarity}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

## State Management Architecture

### EventBus Integration
Enhanced EventBus for cross-component communication:

```typescript
// src/game/EventBus.ts (Enhanced)
export interface EventPayloads {
  'cesium-location-selected': {
    lon: number;
    lat: number;
    habitats: string[];
    species: string[];
  };
  'species-discovered': {
    speciesId: string;
    name: string;
    habitat: string;
    rarity: 'common' | 'rare' | 'legendary';
  };
  'habitat-explored': {
    habitatId: string;
    name: string;
    coordinates: [number, number];
  };
  'score-updated': {
    newScore: number;
    pointsEarned: number;
  };
  'achievement-unlocked': {
    achievementId: string;
    title: string;
    description: string;
  };
}
```

### Local Storage for Persistence
```typescript
// src/lib/gameStorage.ts
export interface GameSaveData {
  playerStats: PlayerStats;
  discoveredSpecies: string[];
  exploredHabitats: string[];
  achievements: string[];
  settings: GameSettings;
}

export const saveGameData = (data: Partial<GameSaveData>) => {
  const existing = loadGameData();
  const updated = { ...existing, ...data };
  localStorage.setItem('phaser-june-save', JSON.stringify(updated));
}

export const loadGameData = (): GameSaveData => {
  // Implementation with fallback defaults
}
```

## Navigation & Routing

### Route Structure
```
/game          - Screen 1: Main game interface
/stats         - Screen 2: Player dashboard
/map           - Cesium-only full screen view
/settings      - Game and UI settings
```

### Navigation Component
Using shadcn/ui Sidebar for consistent navigation across screens.

## Responsive Design Considerations

### Breakpoints
- **Mobile (sm)**: Stack Cesium and Phaser vertically, simplified dashboard
- **Tablet (md)**: Side-by-side layout with smaller panels
- **Desktop (lg+)**: Full resizable panel experience

### Mobile-Specific Adaptations
- Touch-optimized Cesium controls
- Simplified statistics cards
- Collapsible navigation sidebar

## Integration with Existing Components

### Cesium Map Integration
- Wrap existing `CesiumMap.tsx` with shadcn Card components
- Add minimize/maximize functionality
- Maintain existing EventBus communication

### Phaser Game Integration
- Wrap existing `PhaserGame.tsx` with shadcn Card components
- Ensure proper cleanup on component unmount
- Maintain existing scene management

## Implementation Priority

### Phase 1: Core Layout
1. Install required shadcn components
2. Create basic two-screen layout
3. Implement navigation sidebar
4. Add theme provider

### Phase 2: Enhanced UI
1. Create player dashboard components
2. Implement statistics tracking
3. Add responsive design
4. Create species/habitat grids

### Phase 3: Integration
1. Connect EventBus to dashboard updates
2. Implement data persistence
3. Add achievements system
4. Polish animations and transitions

## Required shadcn Components

```bash
npx shadcn@latest add sidebar
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add resizable
npx shadcn@latest add progress
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add avatar
npx shadcn@latest add separator
```

This architecture provides a clean, maintainable foundation that leverages shadcn/ui's design system while integrating seamlessly with the existing Cesium and Phaser components.