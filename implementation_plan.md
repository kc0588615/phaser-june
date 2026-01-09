# Migration Plan: Supabase to Hetzner VPS + Clerk

## Current Status (Updated: 2025-12-31)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: API Strategy | ✅ Complete | Using Next.js API routes |
| Phase 1: Database Setup | ✅ Complete | VPS: 178.156.159.183, PostGIS 17-3.5 |
| Phase 2: API Routes | ✅ Complete | 9 routes implemented |
| Phase 3: Service Layer | ✅ Complete | All DB queries migrated to Prisma |
| Phase 4: Clerk Auth | ⏸️ Skipped | Auth still uses Supabase |
| Phase 5: Cleanup | ✅ Complete | Build/typecheck passing |

**Known Issue**: Player stats not loading - needs debugging.

---

## Goal Description
Migrate the backend and database from Supabase to a self-hosted PostgreSQL (Docker) on a Hetzner VPS. Replace Supabase Authentication with Clerk. The COG GeoTIFF hosting has already been migrated to AWS S3 and requires no further changes.

## User Review Required

> [!IMPORTANT]
> **API Strategy**: Decide whether the migration will use Next.js API routes or PostgREST. If you use Next.js, prefer App Router routes under `src/app/api/...` (a `/api/species` route already exists) and avoid duplicating the same endpoints in `src/pages/api`.

> [!IMPORTANT]
> **Database Extensions**: The schema defaults use `gen_random_uuid()` and `uuid_generate_v4()`. Enable `pgcrypto` and `uuid-ossp` on the VPS (or update the defaults) before running migrations.

> [!IMPORTANT]
> **Database & Spatial Logic**: You will host PostgreSQL with PostGIS in a Docker container on your Hetzner VPS. The `get_species_in_radius` and other RPC calls (Supabase-specific) will be replaced by API routes or PostgREST `/rpc` calls using raw SQL. Spatial endpoints must return JSON-safe geometry (`ST_AsGeoJSON(...)::json AS wkb_geometry`) or omit geometry to avoid API serialization failures.

> [!WARNING]
> **Auth Migration**: We are switching to Clerk. You will need to install `@clerk/nextjs` and configure the middleware and provider. Supabase RLS policies will not exist on the new VPS until you recreate them; if you expose PostgREST, you must restore RLS + JWT role mapping, otherwise all tables are public. If you use only Next.js API routes, keep the database private and enforce auth in the API layer.

> [!CAUTION]
> **Breaking Change**: The Prisma schema currently uses `@db.Uuid` for `player_id` fields. Clerk user IDs are string format (e.g., `user_2NNEqL...`). Best practice is to keep internal UUID PKs and add a unique `clerk_user_id` column (string) instead of converting all FKs to strings; if you choose to convert, you need an explicit ID mapping and migration plan.

---

## Proposed Changes

### 1. Infrastructure Setup (VPS)

#### [NEW] `docker-compose.yml` (on VPS)
- PostgreSQL 16 with PostGIS extension
- Configure persistent volume for data
- Do not expose port 5432 publicly; bind to `127.0.0.1` or a private Docker network
- If PostgREST is used, run it behind a reverse proxy (Caddy/Nginx/Traefik) with TLS
- Add optional `pgbouncer` for pooled connections (recommended for Vercel traffic)
- Enable required extensions on the database: `postgis`, `pgcrypto`, `uuid-ossp`

#### [NEW] Production Readiness (VPS)
- Backups: nightly `pg_dump` + WAL archiving (e.g., `wal-g` to S3) for PITR
- Observability: enable `pg_stat_statements`; set `log_min_duration_statement` and `log_connections`
- Security: strict `pg_hba.conf`, TLS between app and DB if DB is reachable beyond localhost

---

### 2. Dependencies & Configuration

#### [MODIFY] [package.json](file:///home/danby/phaser-june/package.json)
- **Add**: `@clerk/nextjs`
- **Remove** (after migration complete):
  - `@supabase/ssr`
  - `@supabase/supabase-js`

#### [MODIFY] [.env.local](file:///home/danby/phaser-june/.env.local)
- Update `DATABASE_URL` to point to your Hetzner VPS IP or domain:
  - Format: `postgresql://[user]:[password]@[vps-ip]:5432/[db-name]`
- Add Clerk environment variables:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
  - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`
- Optional (if using PostgREST):
  - `POSTGREST_URL`
  - `POSTGREST_JWT_SECRET` (server-only; required for JWT verification)
- **Remove** (after migration):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### 3. Authentication (Clerk)

#### [NEW] [src/middleware.ts](file:///home/danby/phaser-june/src/middleware.ts)
- Clerk authentication middleware using `clerkMiddleware` from `@clerk/nextjs/server`
- Protect API routes and sensitive pages

#### [MODIFY] [src/pages/_app.tsx](file:///home/danby/phaser-june/src/pages/_app.tsx)
- Wrap application with `<ClerkProvider>` from `@clerk/nextjs`
- Current: Only `QueryClientProvider` wrapper

#### [MODIFY] [src/components/UserMenu.tsx](file:///home/danby/phaser-june/src/components/UserMenu.tsx)
- **Replace**: `supabaseBrowser()` auth calls with Clerk's `useUser()` hook
- **Replace**: Manual user display with `<UserButton />` component
- **Remove**: `import { supabaseBrowser } from '@/lib/supabase-browser'`
- **Remove**: `import type { User as SupabaseUser } from '@supabase/supabase-js'`

#### [MODIFY] [src/lib/auth-actions.ts](file:///home/danby/phaser-june/src/lib/auth-actions.ts)
- **Replace** all Supabase auth functions (`signInWithGoogle`, `signOut`, `signUpWithEmail`, `signInWithEmail`) with Clerk equivalents
- Clerk handles OAuth and email auth via `<SignIn />` and `<SignUp />` components or redirect functions

#### [MODIFY] [src/pages/login.tsx](file:///home/danby/phaser-june/src/pages/login.tsx)
- **Replace** Supabase auth form with Clerk's `<SignIn />` component
- Remove all Supabase auth logic

#### [DELETE] [src/pages/auth/callback.tsx](file:///home/danby/phaser-june/src/pages/auth/callback.tsx)
- Clerk handles OAuth callbacks automatically; this file is no longer needed

#### [DELETE] [src/lib/supabase-browser.ts](file:///home/danby/phaser-june/src/lib/supabase-browser.ts)
- No longer needed after migration

#### [DELETE] [src/lib/supabaseClient.ts](file:///home/danby/phaser-june/src/lib/supabaseClient.ts)
- No longer needed after migration

---

### 4. Database Schema Updates (Prisma)

#### [MODIFY] [prisma/schema.prisma](file:///home/danby/phaser-june/prisma/schema.prisma)
- **Preferred**: keep internal UUID PKs for `profiles` and related tables
- **Add** `clerk_user_id String @unique` to `Profile` (and migrate existing users)
- **Alternative** (only if you want string FKs): change `player_id` and `user_id` to `String`, then migrate IDs with a mapping table
- **Update** all relations referencing `player_id` to use the chosen strategy

---

### 5. API Layer (Next.js API Routes)

Use App Router API routes under `src/app/api/...` (recommended, aligns with existing `src/app/api/species/route.ts`). Avoid duplicating the same endpoints in `src/pages/api`.

Create server-side endpoints to replace Supabase RPC calls. All spatial queries will use `prisma.$queryRaw` with PostGIS functions and must return JSON-safe geometry when needed (e.g., `ST_AsGeoJSON(wkb_geometry)::json AS wkb_geometry`).

#### [NEW] `src/app/api/species/` (directory)

#### [NEW] [src/app/api/species/in-radius/route.ts](file:///home/danby/phaser-june/src/app/api/species/in-radius/route.ts)
- **Purpose**: Replace `supabase.rpc('get_species_in_radius', {...})`
- **Logic**: Use `prisma.$queryRaw` to execute:
  ```sql
  SELECT
    ogc_fid,
    comm_name,
    sci_name,
    -- include fields required for clue generation/UI
    ST_AsGeoJSON(wkb_geometry)::json AS wkb_geometry
  FROM icaa
  WHERE ST_DWithin(
    wkb_geometry::geography,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3
  )
  ```
- **Params**: `lon`, `lat`, `radius_m` (via query string or POST body)

#### [NEW] [src/app/api/species/at-point/route.ts](file:///home/danby/phaser-june/src/app/api/species/at-point/route.ts)
- **Purpose**: Replace `supabase.rpc('get_species_at_point', {...})`
- **Logic**: Use `prisma.$queryRaw` with `ST_Contains` or `ST_Intersects` and project JSON-safe geometry

#### [NEW] [src/app/api/species/bioregions/route.ts](file:///home/danby/phaser-june/src/app/api/species/bioregions/route.ts)
- **Purpose**: Replace `supabase.rpc('get_species_bioregions', {...})`
- **Logic**: Use `prisma.$queryRaw` for spatial join with oneearth_bioregion table

#### [NEW] [src/app/api/species/random-names/route.ts](file:///home/danby/phaser-june/src/app/api/species/random-names/route.ts)
- **Purpose**: Replace `supabase.from('icaa').select(...).limit()` for random species
- **Logic**: Use Prisma `findMany` with `orderBy: { ogc_fid: 'asc' }` and JavaScript shuffle, or `ORDER BY RANDOM()` via raw query

#### [NEW] [src/app/api/species/by-ids/route.ts](file:///home/danby/phaser-june/src/app/api/species/by-ids/route.ts)
- **Purpose**: Batch fetch species by IDs
- **Logic**: Use `prisma.iCAA.findMany({ where: { ogc_fid: { in: ids } } })`

#### [NEW] [src/app/api/habitat/colormap/route.ts](file:///home/danby/phaser-june/src/app/api/habitat/colormap/route.ts)
- **Purpose**: Replace `supabase.from('habitat_colormap').select(...)`
- **Logic**: Use `prisma.habitatColormap.findMany()`

---

### 5b. Optional: PostgREST Instead of Next.js API Routes

If you want a Supabase-like REST API, you can run PostgREST on the VPS and replace Supabase endpoints with PostgREST `/` and `/rpc` calls.

- **Infra**: Add a PostgREST container alongside PostgreSQL; expose only to Vercel or through the Next.js server.
- **Auth**: Either proxy requests through Next.js (recommended) or configure PostgREST JWT verification with Clerk and enforce RLS policies + role mapping.
- **Spatial**: Keep SQL functions and return JSON-safe geometry (e.g., `ST_AsGeoJSON`) from views or RPC functions.

---

### 6. Service Layer Updates

Refactor services to call the new API routes (or PostgREST endpoints) instead of Supabase.

#### [MODIFY] [src/lib/speciesService.ts](file:///home/danby/phaser-june/src/lib/speciesService.ts)
- **Replace** `import { supabase } from './supabaseClient'` with `fetch` calls
- **Replace** `supabase.rpc('get_species_in_radius', {...})` → `fetch('/api/species/in-radius?...')`
- **Replace** `supabase.rpc('get_species_at_point', {...})` → `fetch('/api/species/at-point?...')`
- **Replace** `supabase.rpc('get_species_bioregions', {...})` → `fetch('/api/species/bioregions')`
- **Replace** `supabase.from('icaa').select(...)` → `fetch('/api/species/by-ids')` or `/random-names`
- **Replace** `supabase.from('habitat_colormap').select(...)` → `fetch('/api/habitat/colormap')`
- **Keep**: TiTiler integration (already uses `fetch` to external service)

#### [MODIFY] [src/lib/playerTracking.ts](file:///home/danby/phaser-june/src/lib/playerTracking.ts)
**Option A (Recommended)**: Delete and use `playerTrackingPrisma.ts` exclusively
**Option B**: Refactor to remove all Supabase imports and call new API routes

Key changes needed:
- Replace `supabaseBrowser()` auth calls with Clerk `useAuth()` or API-based auth
- Replace all `supabase.from(...).insert/update/select` with API route calls
- The Prisma version (`playerTrackingPrisma.ts`) already has the correct patterns

#### [MODIFY] [src/lib/playerStatsService.ts](file:///home/danby/phaser-june/src/lib/playerStatsService.ts)
- **Replace** `supabaseBrowser()` with Clerk's `currentUser()` or pass user ID from client
- **Replace** `supabase.from('player_stats').select(...)` with API route call or direct Prisma query (if server-side)
- **Replace** `supabase.from('profiles').select(...)` with Prisma query

---

### 7. Other Files with Supabase References

These files also need updates:

#### [MODIFY] [src/lib/speciesQueries.ts](file:///home/danby/phaser-june/src/lib/speciesQueries.ts)
- Review and update any Supabase calls

#### [MODIFY] [src/pages/stats.tsx](file:///home/danby/phaser-june/src/pages/stats.tsx)
- Replace Supabase auth with Clerk

#### [MODIFY] [src/pages/highscores.tsx](file:///home/danby/phaser-june/src/pages/highscores.tsx)
- Replace Supabase queries with API routes and add periodic refresh (no realtime)

#### [MODIFY] [src/hooks/useSpeciesData.ts](file:///home/danby/phaser-june/src/hooks/useSpeciesData.ts)
- Update to use new API routes

#### [MODIFY] [src/game/scenes/Game.ts](file:///home/danby/phaser-june/src/game/scenes/Game.ts)
- Update any Supabase references

#### [MODIFY] [src/game/scenes/GameOver.ts](file:///home/danby/phaser-june/src/game/scenes/GameOver.ts)
- Update any Supabase references

#### [MODIFY] [src/services/discoveryMigrationService.ts](file:///home/danby/phaser-june/src/services/discoveryMigrationService.ts)
- Update or remove if no longer needed

---

### 8. Cleanup

After migration is complete and verified:

#### [DELETE] Type definitions for Supabase
- Remove `@/types/database.ts` if it contains Supabase-specific types

#### Update Documentation
- [MODIFY] [docs/DEVELOPER_ONBOARDING.md](file:///home/danby/phaser-june/docs/DEVELOPER_ONBOARDING.md)
  - Update references from "Supabase" to "Hetzner VPS + Clerk"
  - Update environment variable documentation
  - Update data access patterns

---

## Migration Order (Recommended)

0. **Phase 0: API Strategy**
   - Decide between Next.js API routes vs PostgREST
   - If Next.js: standardize on App Router `src/app/api/...` and remove/avoid Pages Router duplicates

1. **Phase 1: Database** (can be done in parallel)
   - Set up PostgreSQL + PostGIS on VPS
   - Enable `postgis`, `pgcrypto`, and `uuid-ossp` extensions
   - Enable backups/WAL archiving + monitoring
   - Export data from Supabase (schema + data)
   - Apply schema migrations on VPS (Prisma migrate)
   - Import data to VPS (transform IDs as needed)
   - Update `DATABASE_URL` in `.env.local`
   - Run `npx prisma migrate deploy` to apply migrations

2. **Phase 2: API Routes**
   - Create all API routes under `/api/species/` and `/api/habitat/` (App Router)
   - Test each route individually
   - If using PostgREST instead: deploy PostgREST and validate equivalent `/rpc` endpoints

3. **Phase 3: Service Layer**
   - Update `speciesService.ts` to use new API routes
   - Test gameplay (map + species queries)

4. **Phase 4: Authentication**
   - Install and configure Clerk
   - Update `_app.tsx` with ClerkProvider
   - Update `UserMenu.tsx` and `login.tsx`
   - Update Prisma schema for Clerk user IDs
   - Migrate existing user data

5. **Phase 5: Player Tracking**
   - Switch to `playerTrackingPrisma.ts` or update `playerTracking.ts`
   - Update `playerStatsService.ts`
   - Test full gameplay with auth

6. **Phase 6: Cleanup**
   - Remove Supabase dependencies from `package.json`
   - Delete unused Supabase files
   - Update documentation

---

## Verification Plan

### Automated Tests
```bash
# Verify database connection
npx prisma migrate deploy

# Verify Prisma client generation
npx prisma generate

# Verify build
npm run build
```

### Manual Verification
1. **Database Connection**: Run `npx prisma studio` to browse VPS database
2. **Auth**: Log in with Clerk in the development environment
3. **Species Query**: Click on map and verify species appear (via new API routes)
4. **Habitat Stats**: Verify TiTiler habitat stats still work (no changes needed)
5. **Player Tracking**: Unlock a clue and verify it persists to VPS database
6. **Stats Page**: View player stats and verify data loads correctly
7. **Highscores**: Verify leaderboard displays correctly and refreshes on interval
8. **Spatial JSON**: Confirm species responses include JSON-safe `wkb_geometry` and no serialization errors

### Files with Supabase References (Full List)
Found 17 files referencing Supabase:
```
src/services/discoveryMigrationService.ts
src/lib/playerStatsService.ts
src/lib/supabaseClient.ts
src/pages/highscores.tsx
src/lib/speciesQueries.ts
src/lib/supabase-browser.ts
src/lib/playerTrackingPrisma.ts
src/lib/speciesService.ts
src/game/scenes/GameOver.ts
src/lib/auth-actions.ts
src/pages/stats.tsx
src/lib/playerTracking.ts
src/pages/login.tsx
src/pages/auth/callback.tsx
src/hooks/useSpeciesData.ts
src/game/scenes/Game.ts
src/components/UserMenu.tsx
```
