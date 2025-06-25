# Simplified Cloud Architecture for TiTiler

## Overview

Since you already have Next.js and Supabase, we can create a minimal setup:
- **Azure Blob Storage** → GeoTIFF file hosting
- **Minimal TiTiler Server** → Only for tile generation (no custom APIs)
- **Next.js API Routes** → Handle game logic using Supabase

## Architecture Components

### 1. Azure Blob Storage (Keep as-is)
```bash
# Simple container setup
az storage container create \
  --name geotiff \
  --account-name yourstorageaccount \
  --public-access blob
```

Upload your GeoTIFF files:
- `https://youraccount.blob.core.windows.net/geotiff/habitat_cog.tif`

### 2. Minimal TiTiler Server

#### Option A: Serverless with AWS Lambda or Azure Functions
```python
# titiler_lambda.py - Serverless TiTiler
from mangum import Mangum
from titiler.core.factory import TilerFactory
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import json

# Load custom colormap
with open('habitat_colormap.json', 'r') as f:
    habitat_colormap = json.load(f)

app = FastAPI()

# Simple CORS for your Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Basic TiTiler with custom colormap
cog = TilerFactory(
    router_prefix="/cog",
    colormap={
        "habitat_custom": {int(k): v for k, v in habitat_colormap.items()}
    }
)
app.include_router(cog.router, prefix="/cog")

# Lambda handler
handler = Mangum(app)
```

#### Option B: Minimal Docker Container
```dockerfile
# Dockerfile
FROM tiangolo/uvicorn-gunicorn:python3.11-slim

RUN pip install titiler.core

COPY habitat_colormap.json /app/
COPY main.py /app/

ENV MODULE_NAME=main
```

```python
# main.py - Minimal TiTiler
from titiler.core.factory import TilerFactory
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import json

# Load colormap
with open('habitat_colormap.json', 'r') as f:
    habitat_values = json.load(f)
    habitat_colormap = {int(k): v for k, v in habitat_values.items()}

app = FastAPI(title="Minimal TiTiler")

# CORS for your domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "https://yourapp.vercel.app"  # Your Next.js deployment
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Register colormap and create tile endpoint
from rio_tiler.colormap import cmap
custom_cmap = cmap.register({"habitat_custom": habitat_colormap})

cog = TilerFactory(
    colormap_dependency=lambda: custom_cmap,
    router_prefix="/cog"
)
app.include_router(cog.router, prefix="/cog")

@app.get("/")
def root():
    return {"message": "Minimal TiTiler Running"}
```

Deploy to:
- **Azure Container Instances** (simplest, ~$30/month)
- **Railway.app** (easy deployment, ~$5-20/month)
- **Fly.io** (global edge, ~$5-20/month)

### 3. Move Game Logic to Next.js

Create API route: `src/pages/api/location-info.ts`

```typescript
// src/pages/api/location-info.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { lon, lat } = req.query;
  
  if (!lon || !lat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const longitude = parseFloat(lon as string);
  const latitude = parseFloat(lat as string);

  try {
    // Call Supabase RPC function for spatial query
    const { data, error } = await supabase.rpc('query_location_info', {
      lon: longitude,
      lat: latitude
    });

    if (error) throw error;

    res.status(200).json({
      habitats: data.habitats || [],
      species: data.species || []
    });
  } catch (error) {
    console.error('Location query error:', error);
    res.status(500).json({ error: 'Failed to query location' });
  }
}
```

Create Supabase function: `query_location_info`

```sql
-- In Supabase SQL Editor
CREATE OR REPLACE FUNCTION query_location_info(
  lon float,
  lat float
) RETURNS json AS $$
DECLARE
  habitat_values integer[];
  species_names text[];
BEGIN
  -- Query habitats within 1km
  WITH point AS (
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography AS geog
  ),
  buffer_1km AS (
    SELECT ST_Buffer(geog, 1000) AS geom FROM point
  )
  SELECT array_agg(DISTINCT habitat_type) INTO habitat_values
  FROM habitats, buffer_1km
  WHERE ST_Intersects(habitats.geom::geography, buffer_1km.geom);

  -- Query species within 10km  
  WITH point AS (
    SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography AS geog
  ),
  buffer_10km AS (
    SELECT ST_Buffer(geog, 10000) AS geom FROM point
  )
  SELECT array_agg(DISTINCT sci_name) INTO species_names
  FROM icaa, buffer_10km
  WHERE ST_Intersects(wkb_geometry::geography, buffer_10km.geom);

  RETURN json_build_object(
    'habitats', COALESCE(habitat_values, ARRAY[]::integer[]),
    'species', COALESCE(species_names, ARRAY[]::text[])
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION query_location_info TO anon, authenticated;
```

### 4. Update CesiumMap Component

```typescript
// src/components/CesiumMap.tsx
const TITILER_URL = process.env.NEXT_PUBLIC_TITILER_URL || 'https://your-titiler.fly.dev';
const BLOB_BASE_URL = 'https://youraccount.blob.core.windows.net/geotiff';

// For tiles
const cogUrl = `${BLOB_BASE_URL}/habitat_cog.tif`;
const tileJsonUrl = `${TITILER_URL}/cog/WebMercatorQuad/tilejson.json?url=${encodeURIComponent(cogUrl)}&colormap_name=habitat_custom`;

// For location queries - use your Next.js API
const queryUrl = `/api/location-info?lon=${longitude}&lat=${latitude}`;
```

## Deployment Options Comparison

### 1. Serverless Function (Cheapest)
- **Azure Functions**: ~$0-5/month (pay per request)
- **Vercel Edge Functions**: Included with Next.js
- **Pros**: Nearly free, auto-scales
- **Cons**: Cold starts, 10s timeout limits

### 2. Container Services (Balanced)
- **Railway.app**: ~$5/month, easy deploy
- **Fly.io**: ~$5/month + global edge
- **Azure Container Instance**: ~$30/month
- **Pros**: Always warm, full control
- **Cons**: Fixed monthly cost

### 3. Minimal VPS (If needed)
- **Oracle Cloud Free Tier**: Free (1 OCPU, 1GB RAM)
- **DigitalOcean**: $6/month droplet
- **Pros**: Full control, can host multiple services
- **Cons**: You manage everything

## Quick Start with Railway.app

```bash
# 1. Create minimal TiTiler app
mkdir minimal-titiler && cd minimal-titiler

# 2. Create requirements.txt
cat > requirements.txt << EOF
titiler.core==0.18.0
fastapi==0.109.0
uvicorn[standard]==0.27.0
EOF

# 3. Create main.py (from above)
# 4. Copy your habitat_colormap.json

# 5. Create railway.json
cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
EOF

# 6. Deploy
railway login
railway init
railway up
```

## Cost Summary

**Simplified Architecture Total**: ~$10-40/month
- Azure Blob Storage: $1-5/month
- TiTiler Server: $0-30/month (depending on choice)
- Supabase: Free tier or existing plan
- Next.js: Existing Vercel deployment

**Compared to Original Proposal**: 80-90% cost reduction

## Benefits

1. **No Duplicate APIs**: Use Supabase for all data queries
2. **No PostgreSQL Management**: Supabase handles it
3. **Simpler Deployment**: One small container or serverless function
4. **Lower Costs**: Minimal infrastructure
5. **Better Integration**: Native Next.js API routes

This approach leverages your existing infrastructure (Next.js + Supabase) and only adds the minimal TiTiler component needed for tile generation.