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
| `DATABASE_URL` | Prisma connection string | Your Postgres provider (e.g., Hetzner) |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Cesium Ion access token | [cesium.com/ion](https://cesium.com/ion) → Access Tokens |

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_TITILER_BASE_URL` | TiTiler raster service endpoint | None (disables raster features) |
| `NEXT_PUBLIC_COG_URL` | Cloud-Optimized GeoTIFF URL for habitat data | None |

## Configuration Paths

### Setup Options (Choose Your Path)

| Path | Time | Variables Needed | Features |
|------|------|------------------|----------|
| **Minimal Local** | 2 min | None | UI only, no data |
| **With Database** | 10 min | `DATABASE_URL` | Species data, tracking |
| **Full Stack** | 15 min | All above + `CESIUM_ION_TOKEN` | 3D globe, geospatial |
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
# Edit .env.local with Supabase credentials
npm run dev
```

### Full Stack (With Globe)

Add Cesium token to enable the 3D globe:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CESIUM_ION_TOKEN=your-cesium-token
```

## Source File

Environment variables are loaded in:
- `src/lib/supabaseClient.ts` - Supabase config
- `src/components/CesiumMap.tsx` - Cesium Ion token
- `next.config.mjs` - Build-time variables

## Validation

Check your setup:

```typescript
// In browser console after app loads
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Cesium token present:', !!process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN);
```
