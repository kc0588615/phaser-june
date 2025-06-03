# Mobile-First Sidebar Navigation Implementation

## Overview
This guide provides step-by-step instructions for implementing the mobile-first sidebar navigation that will allow users to switch between Cesium globe, Phaser game, and home/statistics views.

## Component Structure

### 1. GameSidebar Component
```tsx
// src/components/game/GameSidebar.tsx
'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  Globe, 
  Gamepad2, 
  BarChart3, 
  Menu, 
  Settings,
  X 
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'map',
    label: 'World Map',
    icon: Globe,
    href: '/game/map',
    description: 'Explore habitats around the world'
  },
  {
    id: 'play',
    label: 'Play Game',
    icon: Gamepad2,
    href: '/game/play',
    description: 'Match species in their habitats'
  },
  {
    id: 'home',
    label: 'My Progress',
    icon: BarChart3,
    href: '/game/home',
    description: 'View your discoveries and stats'
  }
];

export function GameSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3",
                pathname === item.href && "bg-accent"
              )}
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2 px-3">
                <Settings className="h-5 w-5" />
                <span className="text-xs">More</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <GameSettings />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-muted/40 border-r">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Habitat Match</h2>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={pathname === item.href ? "secondary" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </Button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <GameSettings />
        </div>
      </aside>
    </>
  );
}

// Game Settings Component
function GameSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Game Settings</h3>
      <div className="space-y-2">
        <label className="text-sm font-medium">Sound Effects</label>
        <input type="range" className="w-full" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Music Volume</label>
        <input type="range" className="w-full" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Difficulty</label>
        <select className="w-full p-2 border rounded">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </div>
    </div>
  );
}
```

### 2. Game Layout Component
```tsx
// src/app/game/layout.tsx
import { GameSidebar } from '@/components/game/GameSidebar';

export default function GameLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <GameSidebar />
      <main className="flex-1 pb-20 lg:pb-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

### 3. View Pages Implementation

#### Map View
```tsx
// src/app/game/map/page.tsx
'use client';

import dynamic from 'next/dynamic';

// Dynamic import for Cesium (client-side only)
const CesiumMap = dynamic(
  () => import('@/components/CesiumMap'),
  { 
    ssr: false,
    loading: () => <div>Loading map...</div>
  }
);

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <CesiumMap />
    </div>
  );
}
```

#### Game View
```tsx
// src/app/game/play/page.tsx
'use client';

import dynamic from 'next/dynamic';

const PhaserGame = dynamic(
  () => import('@/components/PhaserGame'),
  { 
    ssr: false,
    loading: () => <div>Loading game...</div>
  }
);

export default function PlayPage() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <PhaserGame />
    </div>
  );
}
```

#### Home/Stats View
```tsx
// src/app/game/home/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGameStore } from '@/lib/game/game-store';

export default function HomePage() {
  const { playerStats, discoveries } = useGameStore();

  return (
    <div className="container mx-auto p-4 lg:p-8">
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
                  <span>Species Discovered</span>
                  <span>{discoveries.species.length}/150</span>
                </div>
                <Progress value={(discoveries.species.length / 150) * 100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span>Habitats Explored</span>
                  <span>{discoveries.habitats.length}/50</span>
                </div>
                <Progress value={(discoveries.habitats.length / 50) * 100} />
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
                <dt>High Score</dt>
                <dd className="font-semibold">{playerStats.highScore}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Games Played</dt>
                <dd className="font-semibold">{playerStats.gamesPlayed}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Total Score</dt>
                <dd className="font-semibold">{playerStats.totalScore}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Discoveries</CardTitle>
          </CardHeader>
          <CardContent>
            {discoveries.species.slice(-5).map((species) => (
              <div key={species.id} className="flex items-center gap-2 mb-2">
                <img 
                  src={species.imageUrl} 
                  alt={species.name}
                  className="w-10 h-10 rounded"
                />
                <span className="text-sm">{species.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Responsive Design Considerations

### Mobile Optimizations
1. **Bottom Navigation**: Fixed bottom nav for easy thumb access
2. **Full-Screen Views**: Each view takes full viewport height
3. **Touch Gestures**: Swipe between views (optional)
4. **Reduced Motion**: Respect user preferences

### Desktop Enhancements
1. **Persistent Sidebar**: Always visible navigation
2. **Hover States**: Additional information on hover
3. **Keyboard Shortcuts**: Quick navigation (Cmd+1, Cmd+2, Cmd+3)
4. **Split View Option**: View map and game simultaneously

## Implementation Steps

1. Install required shadcn/ui components:
   ```bash
   npx shadcn@latest add sheet
   ```

2. Create the game route group structure:
   ```bash
   mkdir -p src/app/game/{map,play,home}
   ```

3. Implement the GameSidebar component

4. Add the layout wrapper

5. Create individual view pages

6. Test on various screen sizes

## State Preservation

To maintain game state when switching views:

```tsx
// In PhaserGame component
useEffect(() => {
  // Save game state before unmounting
  return () => {
    if (gameRef.current) {
      useGameStore.getState().saveGameState(gameRef.current);
    }
  };
}, []);

// Restore state when mounting
useEffect(() => {
  const savedState = useGameStore.getState().savedGameState;
  if (savedState && gameRef.current) {
    gameRef.current.restoreState(savedState);
  }
}, []);
```

## Performance Tips

1. **Lazy Load Views**: Use Next.js dynamic imports
2. **Prefetch Routes**: Preload adjacent views
3. **Optimize Images**: Use Next.js Image component
4. **Cache Game Assets**: Implement service worker
5. **Minimize Re-renders**: Use React.memo where appropriate

This implementation provides a solid foundation for the mobile-first navigation system that seamlessly switches between your three main views.