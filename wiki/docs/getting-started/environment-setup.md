---
sidebar_position: 3
title: Environment Setup
description: Detailed configuration for all external services
tags: [setup, database, cesium, titiler]
---

# Environment Setup

This guide covers detailed configuration for Postgres (Drizzle), Cesium, and optional TiTiler integration.

## Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

### Required Variables

```env
# Database - Postgres connection string (Drizzle)
DATABASE_URL="postgresql://user:password@host:port/database?schema=public&pgbouncer=true"

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

### 1. Configure Drizzle

1. Ensure you have a PostgreSQL database running (e.g., on Hetzner VPS).
2. Set the `DATABASE_URL` in `.env.local`.
3. Ensure schema is in place:

- Spatial tables (`icaa`, `oneearth_bioregion`) are created by shapefile imports.
- Normalized biodiversity schema is created by migrations 004/005/006.
- `icaa_view` is required at runtime; the app fails fast on startup if it is missing.
- App tables are created via SQL migrations or manual DDL (Drizzle does not run migrations here).
- Refresh types after schema changes:

```bash
npx drizzle-kit introspect
```

### 2. Required Tables

The application expects these tables (see [Database Guide](/docs/guides/data/database-guide) for full schema):

- `icaa` - Import-owned species table (shapefile source)
- `icaa_view` - Compatibility view used by the app
- Normalized biodiversity tables (`taxa`, `taxon_profiles`, `taxon_ranges`, `taxon_bioregions`, etc.)
- `profiles` - Player profiles
- `player_game_sessions` - Session tracking
- `player_species_discoveries` - Identified species
- `player_clue_unlocks` - Unlocked clues
- `player_stats` - Aggregated stats
- `habitat_colormap` - Habitat codes → labels (TiTiler)
- `oneearth_bioregion` - Bioregion reference data (optional)
- `high_scores` - Legacy leaderboard

API routes under `/api/*` handle queries; no database RPCs are required.

### 3. One-Time Stats Backfill

If you applied migrations to an existing database, refresh aggregates once:

```bash
npx tsx scripts/backfill-player-stats.ts
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
✓ Drizzle client reachable
✓ Cesium viewer ready
✓ TiTiler endpoint accessible (if configured)
```

## Common Issues

### "Database not configured"
- Ensure `.env.local` exists (not `.env.example`)
- Set `DATABASE_URL` and restart the dev server

### "Cesium token invalid"
- Check token hasn't expired
- Verify token has required scopes

### "TiTiler timeout"
- Check `NEXT_PUBLIC_TITILER_BASE_URL` is correct
- Verify COG file is accessible at `NEXT_PUBLIC_COG_URL`

## Next Steps

- [Project Structure](/docs/getting-started/project-structure) - Navigate the codebase
- [Database Guide](/docs/guides/data/database-guide) - Full schema reference
