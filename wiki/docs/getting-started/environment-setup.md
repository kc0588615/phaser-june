---
sidebar_position: 3
title: Environment Setup
description: Detailed configuration for all external services
tags: [setup, supabase, cesium, titiler]
---

# Environment Setup

This guide covers detailed configuration for Supabase, Cesium, and optional TiTiler integration.

## Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

### Required Variables

```env
# Database - Prisma connection string
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Cesium Ion - 3D globe rendering
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-ion-token

# Auth - Clerk (TBD)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
# CLERK_SECRET_KEY=...
```

### Optional Variables

```env
# TiTiler - Raster habitat data processing
NEXT_PUBLIC_TITILER_BASE_URL=https://your-titiler-endpoint.com
NEXT_PUBLIC_COG_URL=https://your-s3-bucket/habitat.tif
```

## Database Setup

### 1. Configure Prisma

1. Ensure you have a PostgreSQL database running (e.g., on Hetzner VPS).
2. Set the `DATABASE_URL` in `.env.local`.
3. Run migrations:

```bash
npm run prisma:migrate
```

### 2. Required Tables

The application expects these tables (see [Database Guide](/docs/guides/data/database-guide) for full schema):

- `icaa_species` - Species information
- `profiles` - Player profiles
- `game_sessions` - Session tracking
- `clue_discoveries` - Unlocked clues
- `species_discoveries` - Identified species

### 3. Required RPC Functions

These PostgreSQL functions must exist:

```sql
-- Get species at a location
get_species_at_location(lon float, lat float, radius int)

-- Get random species for a game
get_random_species(species_ids int[])

-- Record a clue discovery
record_clue_discovery(session_id uuid, species_id int, clue_type text)
```

## Cesium Ion Setup

### 1. Get Token

1. Create account at [cesium.com/ion](https://cesium.com/ion/)
2. Go to Access Tokens
3. Create a new token with default scopes
4. Copy to `NEXT_PUBLIC_CESIUM_ION_TOKEN`

### 2. Asset Access

The app uses Cesium's default world terrain and imagery. No additional asset configuration needed for basic setup.

## TiTiler Setup (Optional)

TiTiler provides Cloud-Optimized GeoTIFF (COG) processing for habitat raster data.

### Self-Hosted

```bash
docker run -p 8000:8000 ghcr.io/developmentseed/titiler:latest
```

Set in `.env.local`:
```env
NEXT_PUBLIC_TITILER_BASE_URL=http://localhost:8000
NEXT_PUBLIC_COG_URL=https://your-s3-bucket/habitat.tif
```

### Cloud-Hosted

Use a managed TiTiler instance or deploy to AWS Lambda.

## Verify Configuration

Run the app and check browser console for:

```
✓ Supabase client initialized
✓ Cesium viewer ready
✓ TiTiler endpoint accessible (if configured)
```

## Common Issues

### "Supabase not configured"
- Ensure `.env.local` exists (not `.env.example`)
- Restart dev server after changing env vars

### "Cesium token invalid"
- Check token hasn't expired
- Verify token has required scopes

### "TiTiler timeout"
- Check `NEXT_PUBLIC_TITILER_BASE_URL` is correct
- Verify COG file is accessible at `NEXT_PUBLIC_COG_URL`

## Next Steps

- [Project Structure](/docs/getting-started/project-structure) - Navigate the codebase
- [Database Guide](/docs/guides/data/database-guide) - Full schema reference
