# Migration Checklist

## 1. VPS Infrastructure Setup

### 1.1 Provision Server
- [x] Create Hetzner VPS (CPX21: 3 vCPU, 4GB RAM, ~€7/mo)
- [ ] Attach Hetzner Volume for database storage (using local storage)
- [x] Note the VPS public IP address: `178.156.159.183`

### 1.2 DNS Setup
- [x] Create A record: `db.critterconnect.org` → `178.156.159.183`
- [x] DNS propagation confirmed

### 1.3 Secure Server
- [x] SSH keys configured
- [x] Configure Hetzner Firewall:
    - [x] Allow 22/tcp (SSH)
    - [x] Allow 6432/tcp (PgBouncer with TLS)
    - [x] Allow 8000/tcp (postgres-mcp SSE)
    - [x] Block 5432/tcp (Postgres internal only)

### 1.4 Install Docker
```bash
# Completed on VPS
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```
- [x] Docker installed and running

### 1.5 TLS Certificate (Let's Encrypt)
- [x] Certbot installed
- [x] Certificate obtained for `db.critterconnect.org`
- [x] Certificates copied to `/opt/postgis/certs/` for Docker access

### 1.6 Auto-Renewal Hook
- [x] Renewal hook created to restart PgBouncer after cert renewal

### 1.7 Deploy Database
- [x] `docker-compose.yml` deployed to VPS
- [x] PostgreSQL 17 + PostGIS 3.5 running
- [x] PgBouncer running with TLS on port 6432
- [x] postgres-mcp running on port 8000 (SSE transport)
- [x] Verified PostGIS extension: `SELECT PostGIS_Version();`

---

## 2. Database Migration (Schema)

- [x] Drizzle schema mappings updated
- [x] Fixed `extensions.uuid_generate_v4()` → `gen_random_uuid()`
- [x] Applied migrations to VPS via SQL
- [x] Created geometry columns manually (SRID 4326)

---

## 3. Data Migration (Content)

- [x] Exported from Supabase (`pg_dump`)
- [x] Fixed geometry SRID issues (900914 → no constraint)
- [x] Fixed geometry Z-dimension issues
- [x] Imported to VPS:
    - [x] 22 species (icaa table)
    - [x] 185 bioregions (oneearth_bioregion)
    - [x] 3 profiles
    - [x] 82 habitat colormap entries
- [x] Verified with Drizzle queries

---

## 4. API Implementation (Next.js)

- [x] Create API routes:
    - [x] `src/app/api/species/in-radius/route.ts`
    - [x] `src/app/api/species/at-point/route.ts`
    - [x] `src/app/api/species/bioregions/route.ts`
    - [x] `src/app/api/species/random-names/route.ts`
    - [x] `src/app/api/species/by-ids/route.ts`
    - [x] `src/app/api/species/catalog/route.ts`
    - [x] `src/app/api/habitat/colormap/route.ts`
    - [x] `src/app/api/highscores/route.ts`
    - [x] `src/app/api/discoveries/migrate/route.ts`
- [x] Test each route with curl/Postman (all working after .env.local fix)

---

## 5. Authentication Migration (Clerk) - SKIPPED

- [ ] Create Clerk application at clerk.com
- [ ] Add to `.env.local`:
    ```
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
    CLERK_SECRET_KEY=sk_...
    ```
- [ ] Install: `npm install @clerk/nextjs`
- [ ] Add `ClerkProvider` to `_app.tsx`
- [ ] Create `src/middleware.ts`
- [ ] Update `UserMenu.tsx` to use `<UserButton />`
- [ ] User migration: populate `clerk_user_id` on first login (email match)

---

## 6. Service Layer Updates

- [x] Refactor `speciesService.ts` → use `/api/species/...`
- [x] Refactor `speciesQueries.ts` → Drizzle `db.execute(sql\`...\`)`
- [x] Refactor `playerTracking.ts` → Drizzle (kept same API)
- [x] Refactor `playerStatsService.ts` → Drizzle
- [x] Refactor `useSpeciesData.ts` → /api/species/catalog
- [x] Refactor `GameOver.ts` → /api/highscores
- [x] Refactor `highscores.tsx` → /api/highscores
- [x] Refactor `discoveryMigrationService.ts` → /api/discoveries/migrate
- [x] Delete obsolete legacy tracking file
- [ ] Delete `supabaseClient.ts`, `supabase-browser.ts` (after Clerk migration)

---

## 7. Vercel Configuration

- [x] Add environment variables in Vercel dashboard:
    ```
    DATABASE_URL=postgresql://postgres:PASSWORD@db.critterconnect.org:6432/phaser_june?sslmode=require&pgbouncer=true
    ```
- [x] Deploy and test

---

## 8. Verification

- [x] `npm run build` succeeds
- [x] `npm run typecheck` passes
- [ ] Login/logout works (Clerk) - skipped
- [x] Map loads species (verified via Playwright - 22 species loaded)
- [x] API endpoints working (catalog, in-radius, at-point, etc.)
- [x] Clicking map shows species details
- [ ] Player stats load and persist - **blocked: requires Clerk auth**
- [ ] Highscores display correctly - manual test needed

---

## Current Docker Containers on VPS

```
CONTAINER ID   IMAGE                      PORTS                    STATUS
f3d2e085284b   crystaldba/postgres-mcp    0.0.0.0:8000->8000/tcp   Up
xxxxxxxx       edoburu/pgbouncer          0.0.0.0:6432->6432/tcp   Up
xxxxxxxx       postgis/postgis:17-3.5     5432/tcp (internal)      Up
```

## Connection Details

- **Database**: `postgresql://postgres:***@db.critterconnect.org:6432/phaser_june?sslmode=require`
- **postgres-mcp**: `http://178.156.159.183:8000/sse`
