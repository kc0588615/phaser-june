# Next.js SaaS Starter Conversion Plan for Phaser Game

## Overview
This document outlines the conversion plan for integrating the Next.js SaaS starter template into the Phaser game project, creating a unified platform with three display states: Cesium globe, Phaser match-3 game, and a home/statistics website.

## Technology Stack
- **Frontend**: Next.js 15.3.1, React 18, TypeScript
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Game Engine**: Phaser 3.90.0
- **Mapping**: CesiumJS with Resium
- **State Management**: Zustand (client-side) + EventBus (Phaser-React bridge)
- **Authentication**: Custom JWT-based (Stripe removed)

## Phase 1: Foundation Setup

### 1.1 Clean Template Installation
- Remove all Stripe-related code and dependencies
- Remove payment processing routes (`app/api/stripe/*`)
- Clean up subscription-related UI components
- Update package.json to remove Stripe SDK

### 1.2 Database Schema Design
Create new tables for game-specific data:

```sql
-- Species table
CREATE TABLE species (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  scientific_name VARCHAR(255),
  habitat_types TEXT[], -- Array of habitat types
  rarity VARCHAR(50),
  points INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habitats table
CREATE TABLE habitats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  iucn_code VARCHAR(50) UNIQUE,
  description TEXT,
  ecosystem_type VARCHAR(100),
  color_hex VARCHAR(7), -- For map display
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player progress table
CREATE TABLE player_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  species_discovered INTEGER[],
  habitats_discovered INTEGER[],
  high_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  last_played TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  score INTEGER,
  species_found INTEGER[],
  habitats_visited INTEGER[],
  duration INTEGER, -- in seconds
  completed_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Project Structure
```
src/
├── app/
│   ├── (game)/                    # Game-specific routes
│   │   ├── layout.tsx            # Game layout with sidebar
│   │   ├── play/                 # Phaser game view
│   │   │   └── page.tsx
│   │   ├── map/                  # Cesium map view
│   │   │   └── page.tsx
│   │   ├── home/                 # Statistics/home view
│   │   │   └── page.tsx
│   │   └── components/
│   │       ├── GameSidebar.tsx
│   │       ├── ViewSwitcher.tsx
│   │       └── MobileNav.tsx
│   ├── api/
│   │   ├── game/
│   │   │   ├── species/route.ts
│   │   │   ├── habitats/route.ts
│   │   │   ├── progress/route.ts
│   │   │   └── sessions/route.ts
│   │   └── auth/
│   │       └── [...existing auth routes]
│   └── layout.tsx
├── components/
│   ├── game/
│   │   ├── StatsCard.tsx
│   │   ├── SpeciesGrid.tsx
│   │   ├── HabitatList.tsx
│   │   └── AchievementBadge.tsx
│   └── ui/
│       └── [...shadcn components]
├── lib/
│   ├── game/
│   │   ├── game-store.ts
│   │   ├── game-queries.ts
│   │   └── game-types.ts
│   └── db/
│       └── schema/
│           ├── game-schema.ts
│           └── [...existing schemas]
└── game/
    └── [...existing Phaser files]
```

## Phase 2: Navigation Implementation

### 2.1 Mobile-First Sidebar Component
```tsx
// src/app/(game)/components/GameSidebar.tsx
interface GameSidebarProps {
  currentView: 'map' | 'play' | 'home';
  onViewChange: (view: 'map' | 'play' | 'home') => void;
}

const GameSidebar = ({ currentView, onViewChange }: GameSidebarProps) => {
  const navItems = [
    { id: 'map', label: 'World Map', icon: Globe },
    { id: 'play', label: 'Play Game', icon: Gamepad2 },
    { id: 'home', label: 'My Progress', icon: BarChart3 }
  ];

  // Implement collapsible sidebar for mobile
  // Use Sheet component from shadcn for mobile drawer
  // Persistent sidebar for desktop
};
```

### 2.2 View Switching Logic
- Use Next.js App Router for navigation between views
- Maintain game state across view changes using Zustand
- Implement smooth transitions between views
- Preserve Phaser game instance when switching away

## Phase 3: Component Integration

### 3.1 Home/Statistics View Components
- Player profile card with avatar and stats
- Species discovery grid with images and details
- Habitat collection map overview
- Achievement showcase
- Recent game sessions table
- Global leaderboard (optional)

### 3.2 Game Integration Components
- Score display overlay
- Species discovery notification
- Habitat unlock animation
- Progress bars for levels/experience
- Settings modal for game preferences

### 3.3 Map View Components
- Habitat legend
- Species location markers
- Interactive habitat info cards
- Map controls overlay

## Phase 4: State Management Architecture

### 4.1 Zustand Store Structure
```typescript
interface GameStore {
  // Player data
  playerStats: PlayerStats;
  discoveries: {
    species: DiscoveredSpecies[];
    habitats: DiscoveredHabitat[];
  };
  
  // Game state
  currentGameSession: GameSession | null;
  gameSettings: GameSettings;
  
  // View state
  currentView: 'map' | 'play' | 'home';
  sidebarOpen: boolean;
  
  // Actions
  updatePlayerStats: (stats: Partial<PlayerStats>) => void;
  addDiscovery: (type: 'species' | 'habitat', item: any) => void;
  switchView: (view: 'map' | 'play' | 'home') => void;
  syncWithServer: () => Promise<void>;
}
```

### 4.2 EventBus Integration
- Bridge Phaser events to Zustand store
- Handle game state updates
- Sync discoveries and progress
- Emit navigation events

## Phase 5: API Routes Implementation

### 5.1 Game Data Endpoints
- `GET/POST /api/game/species` - Species data management
- `GET/POST /api/game/habitats` - Habitat data management
- `GET/PUT /api/game/progress` - Player progress tracking
- `POST /api/game/sessions` - Game session recording

### 5.2 Authentication Simplification
- Remove Stripe webhook handlers
- Simplify user roles (player/admin only)
- Add game-specific user preferences

## Phase 6: Responsive Design Considerations

### 6.1 Mobile Layout
- Full-screen game views
- Swipeable navigation between views
- Collapsible sidebar as bottom sheet
- Touch-optimized controls

### 6.2 Desktop Layout
- Persistent sidebar navigation
- Split-screen option for map + game
- Keyboard shortcuts for view switching
- Hover states for interactive elements

## Implementation Timeline

1. **Week 1**: Foundation setup, database schema, remove Stripe
2. **Week 2**: Navigation system, sidebar implementation
3. **Week 3**: Component development, UI integration
4. **Week 4**: State management, EventBus integration
5. **Week 5**: API routes, data persistence
6. **Week 6**: Responsive design, mobile optimization
7. **Week 7**: Testing, bug fixes, performance optimization

## Migration Checklist

- [ ] Remove all Stripe-related code
- [ ] Set up new database schema
- [ ] Install shadcn/ui components
- [ ] Create navigation sidebar
- [ ] Implement view switching
- [ ] Build statistics dashboard
- [ ] Create species/habitat displays
- [ ] Integrate EventBus with Zustand
- [ ] Set up API routes
- [ ] Implement responsive design
- [ ] Test on mobile devices
- [ ] Performance optimization

## Notes for Backend Integration

The backend changes for the cesium_titiler project should be documented separately in `CESIUM_BACKEND_INTEGRATION.md`.