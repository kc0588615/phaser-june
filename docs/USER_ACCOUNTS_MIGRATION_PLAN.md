# User Accounts Implementation Plan

## Overview
This document outlines the implementation plan for migrating from localStorage-based species discovery tracking to a persistent user account system with database storage.

## Architecture Overview

### Current State
- Species discoveries stored in browser localStorage
- No cross-device synchronization
- Data can be lost if browser data cleared
- No user identification or authentication

### Target State
- User authentication via Supabase Auth
- Species discoveries stored in PostgreSQL database
- Cross-device synchronization
- Rich discovery metadata and statistics
- Social features potential (leaderboards, sharing)

## Database Schema

### 1. Users Table (Managed by Supabase Auth)
```sql
-- Automatically created by Supabase Auth
-- Contains: id, email, created_at, etc.
```

### 2. User Profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  avatar_url TEXT,
  total_discoveries INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 3. Species Discoveries Table
```sql
CREATE TABLE species_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id INT REFERENCES icaa(ogc_fid),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  guess_attempts INT DEFAULT 1,
  clues_revealed INT DEFAULT 0,
  time_to_discover INT, -- seconds
  location_lon FLOAT,
  location_lat FLOAT,
  
  -- Ensure unique discovery per user/species
  UNIQUE(user_id, species_id)
);

-- Enable RLS
ALTER TABLE species_discoveries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own discoveries" ON species_discoveries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discoveries" ON species_discoveries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_discoveries_user_species ON species_discoveries(user_id, species_id);
```

### 4. Discovery Statistics Table (Optional)
```sql
CREATE TABLE discovery_statistics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_discoveries INT DEFAULT 0,
  total_guesses INT DEFAULT 0,
  accuracy_rate FLOAT DEFAULT 0,
  avg_time_to_discover INT DEFAULT 0,
  fastest_discovery INT,
  longest_streak INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  last_discovery_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Implementation Steps

### Phase 1: Authentication Setup

#### 1.1 Add Supabase Auth UI Components
```typescript
// src/components/auth/LoginModal.tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/lib/supabaseClient'

export function LoginModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
          redirectTo={window.location.origin}
        />
      </DialogContent>
    </Dialog>
  )
}
```

#### 1.2 Create Auth Context
```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### Phase 2: Data Migration Service

#### 2.1 Create Migration Service
```typescript
// src/services/discoveryMigrationService.ts
export class DiscoveryMigrationService {
  static async migrateLocalDiscoveries(userId: string) {
    try {
      // Get local discoveries
      const localDiscoveries = JSON.parse(
        localStorage.getItem('discoveredSpecies') || '[]'
      )
      
      if (localDiscoveries.length === 0) return
      
      // Prepare batch insert
      const discoveries = localDiscoveries.map((d: any) => ({
        user_id: userId,
        species_id: d.id,
        discovered_at: d.discoveredAt || new Date().toISOString(),
        guess_attempts: 1, // Default since we didn't track this
        clues_revealed: 8, // Assume all clues if discovered
      }))
      
      // Insert to database
      const { error } = await supabase
        .from('species_discoveries')
        .upsert(discoveries, { 
          onConflict: 'user_id,species_id',
          ignoreDuplicates: true 
        })
      
      if (!error) {
        // Mark as migrated
        localStorage.setItem('discoveries_migrated', 'true')
      }
    } catch (error) {
      console.error('Migration failed:', error)
    }
  }
}
```

### Phase 3: Update Discovery Tracking

#### 3.1 Update SpeciesPanel.tsx
```typescript
// Replace localStorage logic with database calls
const handleSpeciesGuess = async (data: GuessData) => {
  if (data.isCorrect && data.speciesId === selectedSpeciesId) {
    // ... existing UI updates ...
    
    // Save to database if user is authenticated
    if (user) {
      await supabase.from('species_discoveries').insert({
        user_id: user.id,
        species_id: data.speciesId,
        discovered_at: new Date().toISOString(),
        guess_attempts: guessedSpecies.size + 1,
        clues_revealed: clues.length,
        location_lon: currentLocation?.lon,
        location_lat: currentLocation?.lat,
      })
    } else {
      // Fall back to localStorage for non-authenticated users
      // ... existing localStorage logic ...
    }
  }
}
```

#### 3.2 Update SpeciesList.tsx
```typescript
// Load discoveries from database
const loadDiscoveredSpecies = async () => {
  if (!user) {
    // Load from localStorage if not authenticated
    loadLocalDiscoveries()
    return
  }
  
  const { data, error } = await supabase
    .from('species_discoveries')
    .select('species_id, discovered_at')
    .eq('user_id', user.id)
  
  if (data) {
    const discoveredMap: Record<number, DiscoveryInfo> = {}
    data.forEach(d => {
      discoveredMap[d.species_id] = {
        name: '', // Will be filled from species data
        discoveredAt: d.discovered_at
      }
    })
    setDiscoveredSpecies(discoveredMap)
  }
}
```

### Phase 4: Add User Profile Features

#### 4.1 Create Profile Component
```typescript
// src/components/UserProfile.tsx
export function UserProfile() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats>()
  
  useEffect(() => {
    if (user) {
      loadUserStats()
    }
  }, [user])
  
  const loadUserStats = async () => {
    const { data } = await supabase
      .from('discovery_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setStats(data)
  }
  
  return (
    <div className="user-profile">
      <h2>Discovery Statistics</h2>
      <div className="stats-grid">
        <StatCard label="Total Discoveries" value={stats?.total_discoveries} />
        <StatCard label="Accuracy Rate" value={`${stats?.accuracy_rate}%`} />
        <StatCard label="Current Streak" value={stats?.current_streak} />
      </div>
    </div>
  )
}
```

### Phase 5: Real-time Sync

#### 5.1 Add Real-time Subscriptions
```typescript
// src/hooks/useDiscoverySync.ts
export function useDiscoverySync() {
  const { user } = useAuth()
  
  useEffect(() => {
    if (!user) return
    
    const subscription = supabase
      .channel('discoveries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'species_discoveries',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update local state when new discovery added
          // (useful for multi-device sync)
          EventBus.emit('discovery-synced', payload.new)
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [user])
}
```

## Migration Checklist

1. **Database Setup**
   - [ ] Create tables with RLS policies
   - [ ] Test database permissions
   - [ ] Create indexes for performance

2. **Authentication**
   - [ ] Implement auth UI components
   - [ ] Add auth context/hooks
   - [ ] Handle auth state changes

3. **Data Migration**
   - [ ] Create migration service
   - [ ] Add migration trigger on first login
   - [ ] Handle edge cases (duplicates, errors)

4. **Feature Updates**
   - [ ] Update discovery tracking logic
   - [ ] Update species list loading
   - [ ] Add fallback for non-authenticated users

5. **Testing**
   - [ ] Test migration with various data sizes
   - [ ] Test cross-device synchronization
   - [ ] Test offline functionality

6. **Deployment**
   - [ ] Database migrations in staging
   - [ ] Feature flags for gradual rollout
   - [ ] Monitoring and error tracking

## Security Considerations

1. **Row Level Security (RLS)**
   - Users can only read/write their own discoveries
   - Public profiles viewable by all
   - Implement rate limiting for discovery submissions

2. **Data Validation**
   - Validate species IDs exist
   - Prevent duplicate discoveries
   - Sanitize user inputs

3. **Privacy**
   - Allow users to make profiles private
   - Option to delete all user data
   - GDPR compliance considerations

## Performance Optimizations

1. **Database**
   - Index on (user_id, species_id) for fast lookups
   - Materialized views for leaderboards
   - Pagination for large discovery lists

2. **Caching**
   - Cache user discoveries in memory
   - Use React Query or SWR for data fetching
   - Implement optimistic updates

3. **Bundle Size**
   - Lazy load auth components
   - Code split profile features
   - Minimize Supabase client imports

## Rollback Plan

1. Keep localStorage code as fallback
2. Feature flag for enabling user accounts
3. Export function to download discoveries as JSON
4. Database backup before migration

## Future Enhancements

1. **Social Features**
   - Global/friend leaderboards
   - Share discovered species
   - Challenge other players

2. **Gamification**
   - Achievements/badges
   - Daily challenges
   - Seasonal events

3. **Analytics**
   - Discovery heatmaps
   - Popular species tracking
   - User engagement metrics

## Estimated Timeline

- **Week 1-2**: Database setup and auth implementation
- **Week 3**: Data migration service and testing
- **Week 4**: Update game features for database storage
- **Week 5**: User profile and statistics
- **Week 6**: Testing and bug fixes
- **Week 7**: Staged rollout with feature flags
- **Week 8**: Full deployment and monitoring