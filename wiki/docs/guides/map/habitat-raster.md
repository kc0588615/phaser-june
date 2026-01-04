---
sidebar_position: 4
title: Habitat Raster Migration
description: TiTiler COG integration for habitat data
tags: [guide, titiler, raster]
---

# Habitat Raster Migration

Migrate from Supabase raster to TiTiler COG processing.

## TiTiler Point Query

```typescript
const url = `${TITILER_BASE_URL}/cog/point/${lon},${lat}`;
const response = await fetch(url);
const data = await response.json();
// data.values contains raster band values
```

## Configuration

```env
NEXT_PUBLIC_TITILER_BASE_URL=https://your-titiler.com
NEXT_PUBLIC_COG_URL=https://bucket/habitat.tif
```
