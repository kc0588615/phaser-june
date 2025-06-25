# Supabase Setup and Usage Guide

## Overview

This guide provides comprehensive information for setting up and using Supabase with the Phaser match-3 habitat game. It covers database schema, spatial functions, frontend integration, and maintenance procedures.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Database Schema](#database-schema)
3. [Spatial Functions](#spatial-functions)
4. [Frontend Integration](#frontend-integration)
5. [Environment Configuration](#environment-configuration)
6. [Data Management](#data-management)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)
9. [Deployment Guide](#deployment-guide)
10. [Maintenance Procedures](#maintenance-procedures)

---

## Project Setup

### 1. Create Supabase Project

1. **Sign up at [supabase.com](https://supabase.com)**
2. **Create new project:**
   - Organization: Your organization
   - Project name: `phaser-habitat-game`
   - Database password: Generate secure password
   - Region: Choose closest to your users

3. **Wait for provisioning** (2-3 minutes)

### 2. Enable Required Extensions

Navigate to **SQL Editor** and run:

```sql
-- Enable spatial extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Verify extensions
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name IN ('postgis', 'postgis_raster');
```

### 3. Get Connection Details

From **Settings → API**:
- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret)

---

## Database Schema

### Core Tables

#### 1. Species Data Table (`icaa`)

```sql
-- Species data with spatial geometries
CREATE TABLE icaa (
    ogc_fid INTEGER PRIMARY KEY,
    wkb_geometry GEOMETRY(MULTIPOLYGON, 4326),
    
    -- Identification
    sci_name TEXT,
    comm_name TEXT,
    species_name TEXT,
    
    -- Classification
    kingdom TEXT,
    phylum TEXT,
    class TEXT,
    order_ TEXT,
    family TEXT,
    genus TEXT,
    
    -- Habitat Information
    hab_desc TEXT,
    hab_tags TEXT,
    aquatic BOOLEAN,
    freshwater BOOLEAN,
    terrestr BOOLEAN,
    terrestria BOOLEAN,
    marine BOOLEAN,
    
    -- Geographic Information
    geo_desc TEXT,
    dist_comm TEXT,
    island BOOLEAN,
    origin INTEGER,
    
    -- Morphology
    pattern TEXT,
    color_prim TEXT,
    color_sec TEXT,
    shape_desc TEXT,
    size_min NUMERIC,
    size_max NUMERIC,
    weight_kg NUMERIC,
    
    -- Behavior & Diet
    behav_1 TEXT,
    behav_2 TEXT,
    diet_type TEXT,
    diet_prey TEXT,
    diet_flora TEXT,
    
    -- Life Cycle
    life_desc1 TEXT,
    life_desc2 TEXT,
    lifespan TEXT,
    maturity TEXT,
    repro_type TEXT,
    clutch_sz TEXT,
    
    -- Conservation
    cons_text TEXT,
    cons_code TEXT,
    category TEXT,
    threats TEXT,
    
    -- Key Facts
    key_fact1 TEXT,
    key_fact2 TEXT,
    key_fact3 TEXT,
    
    -- Additional fields
    tax_comm TEXT,
    -- ... other species-specific columns
);

-- Create spatial index
CREATE INDEX icaa_geom_idx ON icaa USING GIST(wkb_geometry);

-- Grant permissions
GRANT SELECT ON icaa TO anon, authenticated;
```

#### 2. Habitat Raster Table (`habitat_raster`)

```sql
-- Raster habitat data
CREATE TABLE habitat_raster (
    rid INTEGER PRIMARY KEY,
    rast RASTER NOT NULL,
    filename TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index for raster convex hulls
CREATE INDEX habitat_raster_spatial_idx ON habitat_raster USING GIST(ST_ConvexHull(rast));

-- Additional indexes for performance
CREATE INDEX idx_habitat_raster_filename ON habitat_raster (filename);

-- Constraints for data quality
ALTER TABLE habitat_raster 
    ADD CONSTRAINT enforce_srid_rast CHECK (ST_SRID(rast) = 4326),
    ADD CONSTRAINT enforce_scalex_rast CHECK (round(ST_ScaleX(rast)::numeric, 10) = round(0.000898315284119522, 10)),
    ADD CONSTRAINT enforce_scaley_rast CHECK (round(ST_ScaleY(rast)::numeric, 10) = round(-0.000898315284119522, 10)),
    ADD CONSTRAINT enforce_width_rast CHECK (ST_Width(rast) = ANY (ARRAY[256, 173]));

-- Grant permissions
GRANT SELECT ON habitat_raster TO anon, authenticated;
```

#### 3. Habitat Colormap Table (`habitat_colormap`)

```sql
-- Habitat type labels for visualization
CREATE TABLE habitat_colormap (
    value INTEGER PRIMARY KEY,
    label TEXT NOT NULL
);

-- Index for fast label lookups
CREATE INDEX idx_habitat_colormap_label ON habitat_colormap (label);

-- Grant permissions
GRANT SELECT ON habitat_colormap TO anon, authenticated;

-- Sample data (populate with your habitat types)
INSERT INTO habitat_colormap (value, label) VALUES
(100, 'Urban Areas'),
(101, 'Suburban Areas'),
(200, 'Marine - Neritic'),
(201, 'Marine - Oceanic'),
(300, 'Wetlands (inland) - Permanent rivers streams creeks'),
(301, 'Wetlands (inland) - Permanent inland deltas'),
(400, 'Forest - Temperate'),
(401, 'Forest - Tropical'),
(500, 'Grassland - Temperate'),
(501, 'Grassland - Tropical'),
(600, 'Shrubland - Temperate'),
(700, 'Arable land'),
(800, 'Pastureland'),
(900, 'Plantations');
-- Add more habitat types as needed
```

---

## Spatial Functions

### 1. Species Query Function

```sql
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM icaa
    WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    ORDER BY ogc_fid ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_species_at_point TO anon, authenticated;
```

### 2. Raster Habitat Distribution Function

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
    -- Create 10km buffer around the point
    search_area AS (
        SELECT ST_Buffer(ST_Transform(p.geom, 3857), 10000) as geom_buffer -- 10km in meters
        FROM center_point p
    ),
    -- Convert buffer back to WGS84 for raster query
    bounds AS (
        SELECT ST_Transform(s.geom_buffer, 4326) as geom
        FROM search_area s
    ),
    -- Clip raster data to the buffer area
    clipped AS (
        SELECT ST_Clip(rast, b.geom, 0, true) as clipped_rast
        FROM habitat_raster, bounds b
        WHERE ST_Intersects(ST_ConvexHull(rast), b.geom)
    ),
    -- Count pixels for each habitat type
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_habitat_distribution_10km TO anon, authenticated;
```

### 3. Alternative Fallback Function (Optional)

```sql
-- Simpler fallback function for testing
CREATE OR REPLACE FUNCTION query_location_simple(lon float, lat float)
RETURNS JSON AS $$
DECLARE
    species_data JSON;
    habitat_data JSON;
BEGIN
    -- Get species data
    SELECT json_agg(
        json_build_object(
            'ogc_fid', s.ogc_fid,
            'sci_name', s.sci_name,
            'comm_name', s.comm_name,
            'hab_desc', s.hab_desc
        )
    ) INTO species_data
    FROM icaa s
    WHERE ST_Contains(s.wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
    
    -- Get habitat distribution
    SELECT json_agg(
        json_build_object(
            'habitat_type', h.habitat_type,
            'percentage', h.percentage
        )
    ) INTO habitat_data
    FROM get_habitat_distribution_10km(lon, lat) h;
    
    RETURN json_build_object(
        'species', COALESCE(species_data, '[]'::json),
        'habitats', COALESCE(habitat_data, '[]'::json),
        'coordinates', json_build_object('lon', lon, 'lat', lat)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION query_location_simple TO anon, authenticated;
```

---

## Frontend Integration

### 1. Supabase Client Setup

Create `src/lib/supabaseClient.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false // For static export mode
  }
});
```

### 2. Species Service Implementation

Create `src/lib/speciesService.ts`:

```typescript
import { supabase } from './supabaseClient';
import type { Species } from '@/types/database';

export interface SpeciesQueryResult {
  species: Species[];
  count: number;
}

export interface RasterHabitatResult {
  habitat_type: string;
  percentage: number;
}

export const speciesService = {
  /**
   * Query species that intersect with a given point (longitude, latitude)
   */
  async getSpeciesAtPoint(longitude: number, latitude: number): Promise<SpeciesQueryResult> {
    try {
      // Try to use the RPC function if it exists
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_species_at_point', { lon: longitude, lat: latitude });
        
        if (!rpcError && rpcData) {
          console.log(`Spatial query returned ${rpcData.length} species at (${longitude}, ${latitude})`);
          return {
            species: rpcData as Species[],
            count: rpcData.length
          };
        } else if (rpcError) {
          console.error('RPC error:', rpcError);
        }
      } catch (rpcErr) {
        console.log('RPC function not available, using fallback query', rpcErr);
      }
      
      // Fallback: fetch a subset of species for testing
      const { data, error, count } = await supabase
        .from('icaa')
        .select('*', { count: 'exact' })
        .limit(10)
        .order('ogc_fid', { ascending: true });

      if (error) {
        console.error('Error querying species:', error);
        return { species: [], count: 0 };
      }

      return {
        species: data || [],
        count: count || 0
      };
    } catch (error) {
      console.error('Error in getSpeciesAtPoint:', error);
      return { species: [], count: 0 };
    }
  },

  /**
   * Get habitat distribution within 10km of a point using raster data
   */
  async getRasterHabitatDistribution(longitude: number, latitude: number): Promise<RasterHabitatResult[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_habitat_distribution_10km', { lon: longitude, lat: latitude });
      
      if (error) {
        console.error('Error querying raster habitat distribution:', error);
        return [];
      }

      console.log(`Raster habitat query returned ${data?.length || 0} habitat types at (${longitude}, ${latitude})`);
      return data || [];
    } catch (error) {
      console.error('Error in getRasterHabitatDistribution:', error);
      return [];
    }
  },

  /**
   * Get species by their ogc_fid values
   */
  async getSpeciesByIds(ids: number[]): Promise<Species[]> {
    try {
      const { data, error } = await supabase
        .from('icaa')
        .select('*')
        .in('ogc_fid', ids)
        .order('ogc_fid', { ascending: true });

      if (error) {
        console.error('Error fetching species by IDs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSpeciesByIds:', error);
      return [];
    }
  }
};
```

### 3. Type Definitions

Create `src/types/database.ts` with your database types:

```typescript
export interface Species {
  ogc_fid: number;
  wkb_geometry?: any; // PostGIS geometry
  sci_name?: string;
  comm_name?: string;
  species_name?: string;
  
  // Classification
  kingdom?: string;
  phylum?: string;
  class?: string;
  order_?: string;
  family?: string;
  genus?: string;
  
  // Habitat
  hab_desc?: string;
  hab_tags?: string;
  aquatic?: boolean;
  freshwater?: boolean;
  terrestr?: boolean;
  terrestria?: boolean;
  marine?: boolean;
  
  // Geographic
  geo_desc?: string;
  dist_comm?: string;
  island?: boolean;
  origin?: number;
  
  // Morphology
  pattern?: string;
  color_prim?: string;
  color_sec?: string;
  shape_desc?: string;
  size_min?: number;
  size_max?: number;
  weight_kg?: number;
  
  // Behavior & Diet
  behav_1?: string;
  behav_2?: string;
  diet_type?: string;
  diet_prey?: string;
  diet_flora?: string;
  
  // Life Cycle
  life_desc1?: string;
  life_desc2?: string;
  lifespan?: string;
  maturity?: string;
  repro_type?: string;
  clutch_sz?: string;
  
  // Conservation
  cons_text?: string;
  cons_code?: string;
  category?: string;
  threats?: string;
  
  // Key Facts
  key_fact1?: string;
  key_fact2?: string;
  key_fact3?: string;
  
  // Additional
  tax_comm?: string;
}

export interface Database {
  public: {
    Tables: {
      icaa: {
        Row: Species;
        Insert: Species;
        Update: Partial<Species>;
      };
      habitat_raster: {
        Row: {
          rid: number;
          rast: any; // PostGIS raster type
          filename?: string;
          created_at?: string;
        };
      };
      habitat_colormap: {
        Row: {
          value: number;
          label: string;
        };
      };
    };
    Functions: {
      get_species_at_point: {
        Args: { lon: number; lat: number };
        Returns: Species[];
      };
      get_habitat_distribution_10km: {
        Args: { lon: number; lat: number };
        Returns: Array<{ habitat_type: string; percentage: number }>;
      };
    };
  };
}
```

---

## Environment Configuration

### 1. Environment Variables

Create `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Service role key for server-side operations (keep secret)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# TiTiler Configuration (for habitat visualization)
NEXT_PUBLIC_TITILER_BASE_URL=https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net
NEXT_PUBLIC_COG_URL=https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif

# Development mode flag
NODE_ENV=development
```

### 2. Deployment Environment Variables

For production deployments (Vercel, Netlify, etc.):

```bash
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Production TiTiler
NEXT_PUBLIC_TITILER_BASE_URL=https://your-production-titiler.com
NEXT_PUBLIC_COG_URL=https://your-production-cog.tif

# Production mode
NODE_ENV=production
```

---

## Data Management

### 1. Loading Species Data

If you have species data to import:

```sql
-- Example: Load from CSV or other source
COPY icaa (ogc_fid, sci_name, comm_name, hab_desc, ...)
FROM '/path/to/species_data.csv'
WITH (FORMAT csv, HEADER true);

-- Update spatial column if needed
UPDATE icaa SET wkb_geometry = ST_GeomFromText(geom_wkt, 4326) 
WHERE geom_wkt IS NOT NULL;
```

### 2. Loading Raster Data

#### Option A: Direct Upload via raster2pgsql

```bash
# Convert GeoTIFF to SQL and load
raster2pgsql -I -C -e -Y -F -t 256x256 habitat_cog.tif habitat_raster \
  | psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
```

#### Option B: Reference External COG

```sql
-- Reference external COG file (if using Azure Blob Storage)
INSERT INTO habitat_raster (rast, filename) 
SELECT ST_FromGDALRaster('https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif'), 
       'habitat_cog.tif';
```

### 3. Updating Habitat Colormap

```sql
-- Clear existing data
TRUNCATE habitat_colormap;

-- Insert new habitat mappings
INSERT INTO habitat_colormap (value, label) VALUES
(100, 'Urban Areas'),
(101, 'Suburban Areas'),
(200, 'Marine - Neritic'),
(201, 'Marine - Oceanic'),
(300, 'Wetlands (inland) - Permanent rivers streams creeks'),
(301, 'Wetlands (inland) - Permanent inland deltas'),
(400, 'Forest - Temperate'),
(401, 'Forest - Tropical'),
(500, 'Grassland - Temperate'),
(501, 'Grassland - Tropical'),
(600, 'Shrubland - Temperate'),
(700, 'Arable land'),
(800, 'Pastureland'),
(900, 'Plantations');
-- Continue with your specific habitat types
```

---

## Performance Optimization

### 1. Database Indexes

```sql
-- Essential spatial indexes
CREATE INDEX IF NOT EXISTS icaa_geom_idx ON icaa USING GIST(wkb_geometry);
CREATE INDEX IF NOT EXISTS habitat_raster_spatial_idx ON habitat_raster USING GIST(ST_ConvexHull(rast));

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS icaa_sci_name_idx ON icaa (sci_name);
CREATE INDEX IF NOT EXISTS icaa_comm_name_idx ON icaa (comm_name);
CREATE INDEX IF NOT EXISTS icaa_ogc_fid_idx ON icaa (ogc_fid);
CREATE INDEX IF NOT EXISTS habitat_colormap_value_idx ON habitat_colormap (value);
```

### 2. Query Optimization

```sql
-- Analyze tables for query planning
ANALYZE icaa;
ANALYZE habitat_raster;
ANALYZE habitat_colormap;

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM get_species_at_point(-95.3698, 29.7604);
EXPLAIN ANALYZE SELECT * FROM get_habitat_distribution_10km(-95.3698, 29.7604);
```

### 3. Function Optimization

- Functions marked as `STABLE` for query caching
- Use of `SECURITY DEFINER` for consistent permissions
- Proper error handling and fallbacks

---

## Troubleshooting

### Common Issues and Solutions

#### 1. PostGIS Extensions Not Available

**Error**: `function st_makepoint(double precision, double precision) does not exist`

**Solution**:
```sql
-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Verify installation
SELECT PostGIS_Version();
```

#### 2. RPC Function Permissions

**Error**: `permission denied for function get_species_at_point`

**Solution**:
```sql
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_species_at_point TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_habitat_distribution_10km TO anon, authenticated;
```

#### 3. Raster Query Performance Issues

**Error**: Very slow raster queries (>10 seconds)

**Solution**:
```sql
-- Check if spatial index exists
SELECT * FROM pg_indexes WHERE tablename = 'habitat_raster';

-- Create index if missing
CREATE INDEX habitat_raster_spatial_idx ON habitat_raster USING GIST(ST_ConvexHull(rast));

-- Consider reducing buffer size or tiling raster data
```

#### 4. No Data Returned

**Error**: Empty results from spatial queries

**Solution**:
```sql
-- Check data exists
SELECT COUNT(*) FROM icaa;
SELECT COUNT(*) FROM habitat_raster;

-- Check coordinate systems
SELECT DISTINCT ST_SRID(wkb_geometry) FROM icaa;
SELECT DISTINCT ST_SRID(rast) FROM habitat_raster;

-- Test with known coordinates
SELECT * FROM get_species_at_point(-95.3698, 29.7604); -- Houston, TX
```

#### 5. Frontend Connection Issues

**Error**: `Invalid API key` or connection timeouts

**Solution**:
1. **Check environment variables**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Verify API keys in Supabase dashboard**:
   - Settings → API → Check URL and keys

3. **Test connection**:
   ```typescript
   import { supabase } from '@/lib/supabaseClient';
   
   // Test connectivity
   const { data, error } = await supabase.from('icaa').select('count').limit(1);
   console.log('Connection test:', { data, error });
   ```

---

## Deployment Guide

### 1. Supabase Project Deployment

1. **Production Database Setup**:
   - Create production Supabase project
   - Run all schema creation scripts
   - Load production data
   - Configure backups

2. **Environment-Specific Configuration**:
   ```sql
   -- Set production-appropriate settings
   ALTER DATABASE postgres SET work_mem = '256MB';
   ALTER DATABASE postgres SET shared_buffers = '1GB';
   ```

### 2. Next.js Deployment

#### Vercel Deployment

1. **Connect GitHub repository to Vercel**
2. **Configure environment variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_production_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
   ```
3. **Deploy with static export** (already configured in `next.config.mjs`)

#### Alternative Deployment Platforms

- **Netlify**: Similar process, configure environment variables
- **AWS S3 + CloudFront**: For static hosting
- **GitHub Pages**: For public projects

### 3. Database Migration Strategy

```sql
-- Migration script template
-- migrations/001_initial_schema.sql

BEGIN;

-- Create tables
CREATE TABLE IF NOT EXISTS icaa (...);
CREATE TABLE IF NOT EXISTS habitat_raster (...);
CREATE TABLE IF NOT EXISTS habitat_colormap (...);

-- Create indexes
CREATE INDEX IF NOT EXISTS icaa_geom_idx ON icaa USING GIST(wkb_geometry);
CREATE INDEX IF NOT EXISTS habitat_raster_spatial_idx ON habitat_raster USING GIST(ST_ConvexHull(rast));

-- Create functions
CREATE OR REPLACE FUNCTION get_species_at_point(...);
CREATE OR REPLACE FUNCTION get_habitat_distribution_10km(...);

-- Grant permissions
GRANT SELECT ON icaa TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_species_at_point TO anon, authenticated;

COMMIT;
```

---

## Maintenance Procedures

### 1. Regular Database Maintenance

```sql
-- Weekly maintenance tasks
VACUUM ANALYZE icaa;
VACUUM ANALYZE habitat_raster;
VACUUM ANALYZE habitat_colormap;

-- Check database size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
```

### 2. Performance Monitoring

```sql
-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor spatial function performance
SELECT 
    schemaname,
    funcname,
    calls,
    total_time,
    mean_time
FROM pg_stat_user_functions
WHERE funcname LIKE '%habitat%' OR funcname LIKE '%species%'
ORDER BY mean_time DESC;
```

### 3. Data Updates

#### Updating Species Data

```sql
-- Backup before updates
CREATE TABLE icaa_backup AS SELECT * FROM icaa;

-- Update procedure
BEGIN;

-- Update species information
UPDATE icaa SET 
    hab_desc = new_habitat_data.hab_desc,
    cons_code = new_habitat_data.cons_code
FROM new_habitat_data
WHERE icaa.ogc_fid = new_habitat_data.ogc_fid;

-- Verify updates
SELECT COUNT(*) FROM icaa WHERE updated_at > NOW() - INTERVAL '1 hour';

COMMIT;
```

#### Updating Raster Data

```sql
-- Replace raster data
BEGIN;

-- Remove old raster
DELETE FROM habitat_raster WHERE filename = 'habitat_cog.tif';

-- Load new raster
INSERT INTO habitat_raster (rast, filename)
SELECT ST_FromGDALRaster('https://your-new-cog-url.tif'), 'habitat_cog_v2.tif';

-- Test new raster
SELECT * FROM get_habitat_distribution_10km(-95.3698, 29.7604) LIMIT 5;

COMMIT;
```

### 4. Backup Procedures

```bash
# Create database backup
pg_dump "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \
  --schema=public \
  --data-only \
  --file=backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \
  < backup_20241225.sql
```

### 5. Monitoring Dashboard Queries

```sql
-- Create monitoring views
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'species_count' as metric,
    COUNT(*)::text as value
FROM icaa
UNION ALL
SELECT 
    'habitat_types',
    COUNT(DISTINCT value)::text
FROM habitat_colormap
UNION ALL
SELECT 
    'raster_tiles',
    COUNT(*)::text
FROM habitat_raster;

-- Query for dashboard
SELECT * FROM system_health;
```

---

## Security Considerations

### 1. Row Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE icaa ENABLE ROW LEVEL SECURITY;

-- Create policies for read access
CREATE POLICY "Allow read access to species data" ON icaa
    FOR SELECT USING (true);

-- More restrictive policies for admin functions
CREATE POLICY "Admin only updates" ON icaa
    FOR UPDATE USING (auth.role() = 'admin');
```

### 2. Function Security

```sql
-- Use SECURITY DEFINER for controlled access
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
    -- Input validation
    IF lon < -180 OR lon > 180 OR lat < -90 OR lat > 90 THEN
        RAISE EXCEPTION 'Invalid coordinates: lon=%, lat=%', lon, lat;
    END IF;
    
    -- Main query
    RETURN QUERY
    SELECT * FROM icaa
    WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
    ORDER BY ogc_fid ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 3. API Key Management

- **Never commit API keys to version control**
- **Use environment variables for all keys**
- **Rotate keys regularly in production**
- **Monitor API usage in Supabase dashboard**

---

This comprehensive guide should provide everything needed to set up, deploy, and maintain the Supabase backend for the Phaser habitat game. For additional help, refer to the [Supabase documentation](https://supabase.com/docs) or the PostGIS documentation for spatial operations.