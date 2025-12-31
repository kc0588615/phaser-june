# Migration Task List

## Completed Phases

- [x] Phase 0: API Strategy & Preparation <!-- id: 0 -->
    - [x] Review and update implementation plan <!-- id: 1 -->
    - [x] Draft `docker-compose.yml` for VPS (Postgres + PgBouncer) <!-- id: 2 -->
    - [x] Create detailed `migration_checklist.md` <!-- id: 3 -->
    - [x] Confirm API strategy: **Next.js API routes** (not PostgREST) <!-- id: 4 -->

- [x] Phase 1: Database Setup (VPS) <!-- id: 5 -->
    - [x] Provision Hetzner VPS: `cc-gwdb-p01` @ `178.156.159.183` <!-- id: 6 -->
    - [x] DNS: `db.critterconnect.org` → VPS IP <!-- id: 6b -->
    - [x] TLS: Let's Encrypt certificate for PgBouncer <!-- id: 6c -->
    - [x] Deploy `docker-compose.yml` (PostGIS 17-3.5 + PgBouncer + TLS) <!-- id: 7 -->
    - [ ] Configure backups (pg_dump cron) - deferred <!-- id: 8 -->
    - [x] Export Supabase Data <!-- id: 9 -->
    - [x] Apply Schema Migrations (Prisma) <!-- id: 10 -->
    - [x] Fix `extensions.uuid_generate_v4()` → `gen_random_uuid()` <!-- id: 10b -->
    - [x] Import Data (22 species, 185 bioregions, 3 profiles, 82 habitat codes) <!-- id: 11 -->
    - [x] Fix geometry SRID/Z-dimension issues <!-- id: 11b -->

- [x] Phase 2: API Routes (Next.js App Router) <!-- id: 12 -->
    - [x] `/api/species/in-radius` (PostGIS ST_DWithin) <!-- id: 13 -->
    - [x] `/api/species/at-point` (PostGIS ST_Contains) <!-- id: 14 -->
    - [x] `/api/species/bioregions` <!-- id: 15 -->
    - [x] `/api/species/random-names` <!-- id: 16 -->
    - [x] `/api/species/by-ids` <!-- id: 17 -->
    - [x] `/api/species/catalog` (species list) <!-- id: 17b -->
    - [x] `/api/habitat/colormap` <!-- id: 18 -->
    - [x] `/api/highscores` (GET/POST) <!-- id: 18b -->
    - [x] `/api/discoveries/migrate` (localStorage migration) <!-- id: 18c -->

- [x] Phase 3: Service Layer Refactor <!-- id: 19 -->
    - [x] `speciesService.ts` → uses /api/ routes <!-- id: 20 -->
    - [x] `speciesQueries.ts` → Prisma $queryRaw <!-- id: 20b -->
    - [x] `playerTracking.ts` → Prisma (kept same API) <!-- id: 21 -->
    - [x] `playerStatsService.ts` → Prisma (auth still Supabase temp) <!-- id: 22 -->
    - [x] `useSpeciesData.ts` → /api/species/catalog <!-- id: 22b -->
    - [x] `GameOver.ts` → /api/highscores <!-- id: 22c -->
    - [x] `highscores.tsx` → /api/highscores <!-- id: 22d -->
    - [x] `discoveryMigrationService.ts` → /api/discoveries/migrate <!-- id: 22e -->
    - [x] Delete obsolete `playerTrackingPrisma.ts` <!-- id: 22f -->

- [ ] Phase 4: Authentication (Clerk) - SKIPPED <!-- id: 23 -->
    - [ ] Install `@clerk/nextjs` <!-- id: 24 -->
    - [ ] Setup Middleware <!-- id: 25 -->
    - [ ] Update `_app.tsx` and `UserMenu.tsx` <!-- id: 26 -->
    - [ ] Migrate `profiles` table (add `clerk_user_id`) <!-- id: 27 -->

- [x] Phase 5: Cleanup & Verification <!-- id: 28 -->
    - [x] Migrate all database queries to Prisma/API routes <!-- id: 29 -->
    - [x] Remove Supabase DB dependencies <!-- id: 30 -->
    - [x] Build passes (`npm run build`) <!-- id: 30b -->
    - [x] Typecheck passes (`npm run typecheck`) <!-- id: 30c -->
    - [x] Install postgres-mcp on VPS (port 8000) <!-- id: 30d -->
    - [ ] Supabase auth files remain (login, callback, UserMenu, stats, auth-actions) <!-- id: 30e -->

## Infrastructure

- **VPS**: Hetzner `cc-gwdb-p01` @ `178.156.159.183`
- **Domain**: `db.critterconnect.org`
- **Database**: PostgreSQL 17 + PostGIS 3.5
- **Connection**: PgBouncer on port 6432 with TLS
- **MCP Server**: postgres-mcp on port 8000 (SSE transport)

## Files Migrated from Supabase → Prisma/API

| File | Status | Notes |
|------|--------|-------|
| `speciesService.ts` | ✅ Done | Uses /api/ routes |
| `speciesQueries.ts` | ✅ Done | Prisma $queryRaw |
| `playerTracking.ts` | ✅ Done | Prisma, same API |
| `playerStatsService.ts` | ✅ Done | Prisma (auth temp) |
| `useSpeciesData.ts` | ✅ Done | /api/species/catalog |
| `GameOver.ts` | ✅ Done | /api/highscores |
| `highscores.tsx` | ✅ Done | /api/highscores |
| `discoveryMigrationService.ts` | ✅ Done | /api/discoveries/migrate |

## Remaining Supabase Dependencies (Auth Only)

These files still use Supabase for authentication (will be replaced by Clerk):
- `src/lib/auth-actions.ts`
- `src/lib/supabase-browser.ts`
- `src/lib/supabaseClient.ts`
- `src/pages/auth/callback.tsx`
- `src/pages/login.tsx`
- `src/pages/stats.tsx`
- `src/components/UserMenu.tsx`
- `src/lib/playerStatsService.ts` (auth calls only)

## Known Issues

- [x] `/api/species/in-radius` returning 500 error - **FIXED**: `.env.local` had old Supabase DATABASE_URL

## Resolution (2025-12-31)

The 500 errors were caused by `.env.local` containing the old Supabase DATABASE_URL which takes priority over `.env`. Fixed by updating `.env.local` to use the VPS database URL:

```
DATABASE_URL="postgresql://postgres:***@db.critterconnect.org:6432/phaser_june?sslmode=require&pgbouncer=true"
```

All API endpoints now working correctly with VPS database.
