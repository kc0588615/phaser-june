# Simplified Cloud Architecture - Current Implementation

## Overview

This document describes the **current implemented architecture** for the Phaser match-3 game with habitat visualization. The system has evolved to use **Supabase as the primary backend** with TiTiler for visualization only.

## Current Architecture Components

### 1. **Supabase Database** (Primary Backend)
- **Species Data**: `icaa` table with spatial geometries
- **Raster Habitat Data**: `habitat_raster` table with PostGIS raster support
- **Habitat Colormap**: `habitat_colormap` table for visualization mapping
- **Spatial Functions**: Custom PostGIS functions for location-based queries

### 2. **Next.js Frontend** (Static Export Mode)
- **Cesium Integration**: 3D globe for location selection
- **Phaser Game**: Match-3 puzzle with species clues
- **Direct Supabase Calls**: No API routes needed (static export)
- **TypeScript**: Strict typing with path aliases

### 3. **TiTiler Server** (Visualization Only)
- **Purpose**: Habitat raster tile generation for Cesium overlay
- **Endpoint**: `https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net`
- **Functionality**: COG tile serving with custom habitat colormap
- **Source Data**: `https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif`

### 4. **Azure Blob Storage** (Asset Storage)
- **Habitat COG**: Cloud-optimized GeoTIFF for tile generation
- **Public Access**: Direct access for TiTiler processing

## Data Flow Architecture

### User Interaction Flow
```
1. User clicks on Cesium globe
   ↓
2. Coordinates extracted (longitude, latitude)
   ↓
3. Parallel Supabase queries:
   - Species: get_species_at_point(lon, lat) [10km radius]
   - Habitats: get_habitat_distribution_10km(lon, lat) [10km radius]
   ↓
4. Results processed:
   - Species data: Array of species objects
   - Habitat data: Array of {habitat_type, percentage}
   ↓
5. Game initialization:
   - Phaser game starts with species data
   - Habitat data stored for green gem clues
   ↓
6. Match-3 gameplay:
   - Each gem type reveals specific clue categories
   - Green gems show raster habitat percentages
```

### Clue System Architecture
```
Gem Colors → Clue Categories:
🧬 Red     → Classification (genus, family, etc.)
🌳 Green   → Raster Habitat (percentage data)
🗺️ Blue    → Geographic + Species Habitat
🐾 Orange  → Morphology (size, color, pattern)
💨 White   → Behavior + Diet
⏳ Black   → Life Cycle
🛡️ Yellow  → Conservation Status
❗ Purple  → Key Facts
```

## Supabase Functions Implementation

### Core Spatial Functions

#### 1. Species Query Function
```sql
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM icaa
    WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 2. Raster Habitat Distribution Function
```sql
CREATE OR REPLACE FUNCTION get_habitat_distribution_10km(lon float, lat float)
RETURNS TABLE (
    habitat_type text,
    percentage numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH center_point AS (
        SELECT ST_SetSRID(ST_MakePoint(lon, lat), 4326) as geom
    ),
    search_area AS (
        SELECT ST_Buffer(ST_Transform(p.geom, 3857), 10000) as geom_buffer
        FROM center_point p
    ),
    bounds AS (
        SELECT ST_Transform(s.geom_buffer, 4326) as geom
        FROM search_area s
    ),
    clipped AS (
        SELECT ST_Clip(rast, b.geom, 0, true) as clipped_rast
        FROM habitat_raster, bounds b
        WHERE ST_Intersects(ST_ConvexHull(rast), b.geom)
    ),
    counts AS (
        SELECT (ST_ValueCount(clipped_rast, 1)).*
        FROM clipped
        WHERE clipped_rast IS NOT NULL
    )
    SELECT 
        COALESCE(c.label, 'Unknown') as habitat_type,
        ROUND(100.0 * SUM(p.count) / SUM(SUM(p.count)) OVER (), 2) as percentage
    FROM counts p
    LEFT JOIN habitat_colormap c ON p.value = c.value
    WHERE p.value != 0 AND p.value IS NOT NULL
    GROUP BY c.label
    HAVING SUM(p.count) > 0
    ORDER BY percentage DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Frontend Integration

### Species Service (TypeScript)
```typescript
// src/lib/speciesService.ts
export const speciesService = {
  async getSpeciesAtPoint(longitude: number, latitude: number): Promise<SpeciesQueryResult> {
    const { data, error } = await supabase
      .rpc('get_species_at_point', { lon: longitude, lat: latitude });
    
    if (error) {
      console.error('Error querying species:', error);
      return { species: [], count: 0 };
    }

    return {
      species: data || [],
      count: data?.length || 0
    };
  },

  async getRasterHabitatDistribution(longitude: number, latitude: number): Promise<RasterHabitatResult[]> {
    const { data, error } = await supabase
      .rpc('get_habitat_distribution_10km', { lon: longitude, lat: latitude });
    
    if (error) {
      console.error('Error querying raster habitat distribution:', error);
      return [];
    }

    return data || [];
  }
};
```

### Cesium Map Integration
- **Click Handler**: Extracts coordinates and triggers parallel queries
- **Info Window**: Shows habitat count and top habitat type
- **Visual Indicators**: 10km radius circles for both species and habitat queries
- **Event System**: Communicates with Phaser game via EventBus

### Phaser Game Integration
- **Species Management**: Handles multiple species per location
- **Clue Generation**: Different logic for green gems (raster habitat) vs other gems
- **Progress Tracking**: Manages revealed clues and species advancement

## Database Schema

### Key Tables
```sql
-- Species data with spatial geometries
icaa (
  ogc_fid INTEGER PRIMARY KEY,
  wkb_geometry GEOMETRY,
  sci_name TEXT,
  comm_name TEXT,
  -- ... 60+ habitat and trait columns
)

-- Raster habitat data
habitat_raster (
  rid INTEGER PRIMARY KEY,
  rast RASTER,
  filename TEXT
)

-- Habitat type labels for visualization
habitat_colormap (
  value INTEGER PRIMARY KEY,
  label TEXT
)
```

### Spatial Indexes
```sql
-- Species spatial index
CREATE INDEX icaa_geom_idx ON icaa USING GIST(wkb_geometry);

-- Raster spatial index
CREATE INDEX habitat_raster_spatial_idx ON habitat_raster USING GIST(ST_ConvexHull(rast));
```

## Performance Optimizations

### 1. **Query Efficiency**
- Spatial indexes on all geometry columns
- GIST indexes for raster convex hulls
- Function marked as `STABLE` for query optimization

### 2. **Frontend Optimizations**
- Parallel API calls for species and habitat data
- Efficient clue caching in game state
- Minimal data transfer with targeted queries

### 3. **Raster Processing**
- 10km buffer queries balance performance vs coverage
- Clipped raster processing reduces computation
- Percentage calculations for meaningful habitat insights

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Environment variables required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_TITILER_BASE_URL=titiler_endpoint
```

### Database Management
- **Species Updates**: Direct Supabase SQL editor or migrations
- **Raster Updates**: Upload new COG and update habitat_raster table
- **Function Updates**: Deploy via Supabase SQL editor

## Cost Structure

### Current Monthly Costs
- **Supabase**: Free tier or $25/month (Pro plan)
- **TiTiler Server**: ~$30/month (Azure Container Instance)
- **Azure Blob Storage**: ~$1-5/month
- **Vercel Hosting**: Free tier (static export)

**Total**: ~$30-60/month

### Cost Optimizations
- Static export eliminates Vercel function costs
- Direct Supabase calls eliminate API route overhead
- TiTiler only for visualization (could be optimized further)

## Deployment Architecture

### Production Stack
```
Vercel (Static Next.js) 
    ↓ (direct calls)
Supabase (PostgreSQL + PostGIS)
    ↑ (data)
Azure TiTiler (visualization tiles)
    ↑ (COG data)
Azure Blob Storage
```

### Environment Configuration
- **Development**: Local Next.js → Supabase cloud
- **Production**: Vercel static → Supabase cloud
- **Database**: Supabase managed PostgreSQL with PostGIS

## Future Optimizations

### Potential Improvements
1. **TiTiler Replacement**: Migrate to Supabase-based tile generation
2. **Caching Layer**: Add Redis for frequently accessed spatial queries
3. **Edge Functions**: Use Supabase Edge Functions for complex processing
4. **Progressive Loading**: Implement streaming for large datasets

### Scalability Considerations
- **Database**: Supabase handles scaling automatically
- **Frontend**: CDN distribution via Vercel
- **Raster Processing**: Could move to Supabase compute if needed

This architecture successfully combines modern geospatial capabilities with game mechanics while maintaining cost efficiency and development simplicity.