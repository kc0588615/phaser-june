---
sidebar_position: 4
title: Environment Variables
description: Complete reference for all configuration variables
tags: [reference, config, environment]
---

# Environment Variables Reference

Complete reference for all environment variables used in the application.

## Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | Postgres connection string (Drizzle) | Your Postgres provider (e.g., Hetzner) |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Cesium Ion access token | [cesium.com/ion](https://cesium.com/ion) → Access Tokens |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser publishable key | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk server secret key | Clerk dashboard |

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_TITILER_BASE_URL` | TiTiler raster service endpoint | Project default endpoint |
| `NEXT_PUBLIC_COG_URL` | Cloud-Optimized GeoTIFF URL for habitat data | Project default COG |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk sign-in path | `/login` in `.env.example` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Clerk post-sign-in path | `/` in `.env.example` |

## Configuration Paths

### Setup Options (Choose Your Path)

| Path | Time | Variables Needed | Features |
|------|------|------------------|----------|
| **Minimal Local** | 2 min | None | UI only, no data |
| **With Database** | 10 min | `DATABASE_URL` | Species data, tracking |
| **Full Stack** | 15 min | Database + Cesium + Clerk | 3D globe, geospatial, authenticated tracking |
| **Raster Data** | +5 min | Add `TITILER_*` | Habitat raster analysis |

### Minimal Local Run (No External Services)

For quick UI development without backend:

```bash
npm install
npm run dev
```

The app will show placeholder data and the Cesium globe won't load, but React components and Phaser game are functional.

### With Database (Species Data)

```bash
cp .env.example .env.local
# Edit .env.local with DATABASE_URL
npm run dev
```

### Full Stack (With Globe)

Add Cesium token to enable the 3D globe:

```env
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-token
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_TITILER_BASE_URL=https://your-titiler-endpoint.com
NEXT_PUBLIC_COG_URL=https://your-s3-bucket/habitat.tif
```

## Source File

Environment variables are loaded in:
- `src/db/index.ts` - Drizzle client
- `drizzle.config.ts` - Drizzle CLI (introspection)
- Clerk SDK/auth helpers - `NEXT_PUBLIC_CLERK_*`, `CLERK_SECRET_KEY`
- `src/components/CesiumMap.tsx` - Cesium Ion token
- `src/components/CesiumMap.tsx`, `src/app/api/protected-areas/at-point/route.ts`, `src/lib/speciesService.ts` - raster config

## Validation

Check your setup:

```typescript
// In browser console after app loads
console.log('Cesium token present:', !!process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);
fetch('/api/species/catalog').then(r => console.log('Species API ok:', r.ok));
```
