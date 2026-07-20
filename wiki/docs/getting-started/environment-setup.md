---
sidebar_position: 3
title: Environment Setup
description: Database, map, raster, and auth configuration
tags: [setup, database, maplibre, titiler]
---

# Environment Setup

Copy `.env.example` to `.env.local` and set `DATABASE_URL`. The URL must target PostgreSQL through PgBouncer with TLS; do not add `pgbouncer=true`.

```env
DATABASE_URL=postgresql://user:password@host:6432/database?sslmode=require
EXPEDITION_CASE_VERSION=3

# Optional hosted/self-hosted MapLibre style
NEXT_PUBLIC_MAP_STYLE_URL=

# Habitat raster
NEXT_PUBLIC_TITILER_BASE_URL=https://your-titiler-endpoint.com
NEXT_PUBLIC_COG_URL=https://your-bucket/habitat.tif

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

Without `NEXT_PUBLIC_MAP_STYLE_URL`, both maps use the network-independent fallback and add local/API geospatial context. No map vendor token is required.

## Database

The app expects the Drizzle schema plus imported spatial tables. Run `npm run db:introspect` after schema changes. API routes under `/api/*` own database access.

## TiTiler

TiTiler supplies habitat TileJSON and COG statistics. Failures are non-blocking: the maps and route gameplay still render without the raster overlay.

## Verify

```bash
npm run typecheck
npm test
npm run dev
```

Open `http://localhost:8080`, confirm the globe renders, click an ecoregion, explore it, and start an expedition.
