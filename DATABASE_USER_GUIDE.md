# Database User Guide

## Overview

This guide provides comprehensive documentation for the database architecture used in the Species Discovery Game, focusing on the `icaa` table structure, clue system dependencies, and guidelines for making database changes.

## Current Database Architecture

### Technology Stack
- **Database**: Supabase (PostgreSQL 15+ with PostGIS extension)
- **Connection**: Supabase JavaScript Client
- **Spatial Features**: PostGIS for geographic queries
- **Real-time**: Supabase subscriptions (high scores only)

### Database Tables

#### 1. `icaa` Table (Species Data)
Primary table containing all species information with 70+ fields.

**Key Identifiers:**
- `ogc_fid` (number) - Primary key, unique identifier for each species
- `comm_name` (string) - Common name
- `sci_name` (string) - Scientific name
- `tax_comm` (string) - Taxonomic common name

**Spatial Field:**
- `wkb_geometry` (PostGIS geometry) - Polygon/multipolygon defining species range

#### 2. `high_scores` Table
- `id` (uuid) - Primary key
- `username` (string) - Player name
- `score` (number) - Game score
- `created_at` (timestamp) - Score submission time

## ICAA Table Field Mappings

### Clue Category Dependencies

The clue system directly depends on specific database fields. Here's the complete mapping:

#### 1. Classification (Red Gems) 🧬
**Database Fields Used:**
- `genus` - Genus level classification
- `family` - Family level classification
- `order_` - Order level classification (note underscore)
- `class` - Class level classification
- `phylum` - Phylum level classification
- `kingdom` - Kingdom level classification
- `tax_comm` - Fallback taxonomic common name

**Clue Generation Logic:**
```typescript
// Returns most specific classification available
if (species.genus) return `Genus: ${species.genus}`;
if (species.family) return `Family: ${species.family}`;
// ... continues through hierarchy
```

#### 2. Habitat (Green Gems) 🌳
**Database Fields Used:**
- `hab_desc` - Primary habitat description
- `aquatic` (boolean) - Lives in water
- `freshwater` (boolean) - Freshwater habitat
- `terrestr` (boolean) - Terrestrial habitat
- `terrestria` (boolean) - Alternative terrestrial flag
- `marine` (boolean) - Marine habitat
- `hab_tags` - Habitat tags/keywords

**Special Case:** Green gems can also use raster habitat data from external TiTiler service.

#### 3. Geographic & Habitat (Blue Gems) 🗺️
**Database Fields Used:**
- `geo_desc` - Geographic description
- `dist_comm` - Distribution comments
- `island` (boolean) - Island species flag
- `origin` (number) - Origin type (1 = native)
- Plus all habitat fields listed above

#### 4. Morphology (Orange Gems) 🐾
**Database Fields Used:**
- `pattern` - Pattern description
- `color_prim` - Primary color
- `color_sec` - Secondary color
- `shape_desc` - Shape description
- `size_min` (number) - Minimum size
- `size_max` (number) - Maximum size
- `weight_kg` (number) - Weight in kilograms

#### 5. Behavior & Diet (White Gems) 💨
**Database Fields Used:**
- `behav_1` - Primary behavior description
- `behav_2` - Secondary behavior description
- `diet_type` - Type of diet
- `diet_prey` - Prey species
- `diet_flora` - Plant diet

#### 6. Life Cycle (Black Gems) ⏳
**Database Fields Used:**
- `life_desc1` - Primary life cycle description
- `life_desc2` - Secondary life cycle description
- `lifespan` - Lifespan information
- `maturity` - Age at maturity
- `repro_type` - Reproduction type
- `clutch_sz` - Clutch/litter size

#### 7. Conservation (Yellow Gems) 🛡️
**Database Fields Used:**
- `cons_text` - Conservation status text
- `cons_code` - Conservation code (IUCN)
- `category` - Conservation category
- `threats` - Known threats

#### 8. Key Facts (Purple Gems) 🔮
**Database Fields Used:**
- `key_fact1` - Primary key fact
- `key_fact2` - Secondary key fact
- `key_fact3` - Tertiary key fact

## Files Affected by Database Changes

When modifying the `icaa` table structure, the following files need to be updated:

### 1. Type Definitions
**File:** `/src/types/database.ts`
- Update the `Species` interface with new/modified fields
- Ensure TypeScript types match PostgreSQL column types

### 2. Clue Configuration
**File:** `/src/game/clueConfig.ts`
- Update `getClue()` functions if field names change
- Add logic for new fields in appropriate categories
- Modify clue generation logic as needed

### 3. Species Service
**File:** `/src/lib/speciesService.ts`
- Update queries if selecting specific fields
- Modify any field-specific logic

### 4. Database Functions (PostgreSQL)
- `get_species_at_point` - Point-based spatial queries (deprecated in favor of radius queries)
- `get_species_in_radius` - Circle intersection queries for species discovery
- `get_habitat_distribution_10km` - Raster habitat analysis
- `get_closest_habitat` - Finds nearest habitat polygon when no species found

## Guidelines for Database Changes

### Adding New Species

1. **Required Fields:**
   - `comm_name` or `sci_name` (at least one)
   - `wkb_geometry` (for location-based queries)
   - At least one field per clue category for complete gameplay

2. **Best Practices:**
   - Populate as many fields as possible
   - Use consistent formatting for taxonomic names
   - Ensure geometry is valid PostGIS format
   - Test spatial queries after adding

3. **SQL Example:**
```sql
INSERT INTO icaa (
  comm_name, sci_name, genus, family, 
  hab_desc, geo_desc, pattern, 
  diet_type, life_desc1, cons_text, key_fact1,
  wkb_geometry
) VALUES (
  'Example Species', 'Examplus specius', 'Examplus', 'Examplidae',
  'Forest habitats', 'Found in North America', 'Spotted pattern',
  'Omnivore', 'Lives 10-15 years', 'Least Concern', 'Unique feature',
  ST_GeomFromText('POLYGON((...)))', 4326)
);
```

### Modifying Clue Fields

1. **Adding New Fields:**
   - Add field to `Species` interface in `database.ts`
   - Determine appropriate clue category
   - Update corresponding `getClue()` function in `clueConfig.ts`
   - Run TypeScript checks: `npm run typecheck`

2. **Renaming Fields:**
   - Update field name in `Species` interface
   - Find/replace all usages in `clueConfig.ts`
   - Update any direct field references in components
   - Test clue generation thoroughly

3. **Removing Fields:**
   - Check if field is used in `clueConfig.ts`
   - Ensure clue category has alternative fields
   - Remove from `Species` interface
   - Test that clues still generate properly

### Example: Adding a New Field

To add a `migration_pattern` field:

1. **Database Migration:**
```sql
ALTER TABLE icaa ADD COLUMN migration_pattern TEXT;
```

2. **Update Type Definition:**
```typescript
// src/types/database.ts
export interface Species {
  // ... existing fields
  migration_pattern?: string;
}
```

3. **Update Clue Logic:**
```typescript
// src/game/clueConfig.ts
[GemCategory.BEHAVIOR]: {
  getClue: (species: Species) => {
    // ... existing logic
    if (species.migration_pattern) {
      behaviorInfo.push(`Migration: ${species.migration_pattern}`);
    }
    // ... rest of function
  }
}
```

## Spatial Queries and PostGIS

### Circle-Based Species Discovery (Current Implementation)

The game uses **circle intersection queries** instead of point-based queries to find species habitats. This allows players to discover species whose habitats intersect with the 10km search radius, making gameplay more intuitive.

#### `get_species_in_radius` Function
```sql
CREATE OR REPLACE FUNCTION public.get_species_in_radius(
  lon double precision,
  lat double precision,
  radius_m double precision
)
RETURNS TABLE(
  ogc_fid integer,
  comm_name character varying,
  sci_name character varying,
  -- ... all other fields ...
  wkb_geometry json  -- Returns GeoJSON for direct use in frontend
)
LANGUAGE sql STABLE PARALLEL SAFE AS
$$
  WITH center AS (
    SELECT ST_SetSRID(ST_Point(lon, lat), 4326)::geography AS g
  ),
  circle AS (
    SELECT ST_Buffer((SELECT g FROM center), radius_m)::geometry AS geom
  )
  SELECT 
    s.ogc_fid,
    s.comm_name,
    s.sci_name,
    -- ... other fields ...
    ST_AsGeoJSON(s.wkb_geometry)::json as wkb_geometry  -- Key: Returns GeoJSON
  FROM public.icaa s
  JOIN circle c
    ON ST_Intersects(s.wkb_geometry, c.geom);
$$;
```

#### Key Design Decisions

1. **Geography vs Geometry**: Uses PostGIS `geography` type for accurate meter-based buffering
2. **GeoJSON Output**: Returns `ST_AsGeoJSON()` instead of WKT text for direct Cesium consumption
3. **Intersection Logic**: Uses `ST_Intersects()` instead of `ST_Contains()` for broader discovery

### Visual Highlighting System

#### Red Highlighting (Species Found)
When species are discovered, their **complete MULTIPOLYGON geometries** are highlighted in red:

```typescript
// Frontend processing (CesiumMap.tsx)
for (const species of speciesResult.species) {
  if (species.wkb_geometry) {
    const feature = {
      type: 'Feature',
      properties: { ogc_fid: species.ogc_fid, comm_name: species.comm_name },
      geometry: species.wkb_geometry  // Direct GeoJSON from database
    };
    features.push(feature);
  }
}

// Load into Cesium as red polygons
await redDataSource.load({ type: 'FeatureCollection', features });
```

#### Blue Highlighting (No Species Found)
Uses the `get_closest_habitat` function that returns GeoJSON directly:

```sql
-- get_closest_habitat returns json type
SELECT ST_AsGeoJSON(closest_polygon) FROM ...
```

### Geometry Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostGIS       │    │    Supabase      │    │     Cesium      │
│   MULTIPOLYGON  │ ─→ │    ST_AsGeoJSON  │ ─→ │  GeoJsonDataSource
│   (wkb_geometry)│    │    (json)        │    │  Red/Blue Polygons
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Critical**: The geometry must be returned as **GeoJSON** (not WKT) to preserve complete MULTIPOLYGON structures for Cesium rendering.

### Performance Optimizations

#### Spatial Indexes
```sql
-- Essential for spatial query performance
CREATE INDEX IF NOT EXISTS icaa_wkb_geometry_gix
  ON public.icaa
  USING gist (wkb_geometry);
```

#### Query Patterns
- **10km radius**: Matches the visual search circles on the map
- **Geography buffering**: Accurate meter-based distance calculations
- **Parallel safe**: Functions can run in parallel for better performance

### Legacy Implementation (Deprecated)

#### Point-Based Queries
```sql
-- Old approach - only found species if click was exactly inside polygon
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM icaa
  WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
END;
$$ LANGUAGE plpgsql;
```

**Why Circle Queries Are Better:**
- More forgiving for players (intersects 10km radius vs exact point)
- Matches visual search area shown on map
- Discovers species in nearby habitats, not just at exact click location

### Frontend Integration Notes

#### Species Service
```typescript
// src/lib/speciesService.ts
export async function getSpeciesInRadius(longitude: number, latitude: number, radiusMeters: number) {
  const { data, error } = await supabase
    .rpc('get_species_in_radius', { 
      lon: longitude, 
      lat: latitude, 
      radius_m: radiusMeters 
    });
  
  return {
    species: data || [],
    count: data?.length || 0
  };
}
```

#### Map Click Handler
```typescript
// CesiumMap.tsx - Uses 10km radius constant
const SPECIES_RADIUS_METERS = 10000.0;

const [speciesResult, rasterResult] = await Promise.all([
  speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
  speciesService.getRasterHabitatDistribution(longitude, latitude)
]);
```

### Troubleshooting Spatial Issues

#### Common Problems

1. **Polygons Not Appearing**
   - Check if function returns GeoJSON (`ST_AsGeoJSON`) not WKT (`ST_AsText`)
   - Verify geometry field name matches frontend expectations

2. **Only Partial Polygons Show**
   - Ensure WKT parser handles full MULTIPOLYGON, not just first ring
   - Use GeoJSON directly to preserve complete geometry

3. **No Species Found**
   - Verify spatial index exists: `\d+ icaa` should show GIST index
   - Check radius parameter (10000 = 10km)
   - Confirm SRID 4326 is used consistently

#### Debugging Queries
```sql
-- Test radius query manually
SELECT ogc_fid, comm_name, ST_Area(wkb_geometry) as area_sqm
FROM public.get_species_in_radius(-80.0, 25.0, 10000.0);

-- Check geometry validity
SELECT ogc_fid, ST_IsValid(wkb_geometry), ST_GeometryType(wkb_geometry)
FROM icaa 
WHERE ogc_fid = 23;
```

## Cesium Polygon Rendering

### Visual Highlighting Implementation

The application uses Cesium's `GeoJsonDataSource` to render species habitat polygons with visual highlighting. Understanding the rendering system is crucial for maintaining proper visualization.

#### Polygon Highlighting Types

1. **Red Highlighting** - Species found at location
2. **Blue (Cyan) Highlighting** - Closest habitat when no species found

#### Cesium Rendering Pipeline

```typescript
// Load GeoJSON directly from database
const redDataSource = new GeoJsonDataSource('species-hit-highlight');
await redDataSource.load({
  type: 'FeatureCollection',
  features: geoJsonFeatures  // Direct from ST_AsGeoJSON()
});

// Style polygons with proper depth handling
redDataSource.entities.values.forEach(entity => {
  if (entity.polygon) {
    entity.polygon.material = new ColorMaterialProperty(CesiumColor.RED.withAlpha(0.5));
    entity.polygon.outline = new ConstantProperty(true);
    entity.polygon.outlineColor = new ConstantProperty(CesiumColor.RED);
    entity.polygon.outlineWidth = new ConstantProperty(2);
    
    // Critical for overlapping polygons
    entity.polygon.height = new ConstantProperty(1.0);
    entity.polygon.extrudedHeight = new ConstantProperty(2.0);
    entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
    entity.polygon.zIndex = new ConstantProperty(100);
  }
});
```

### Overlapping Polygon Issues

#### Problem: Brazil Rendering Bug

**Symptoms:**
- Polygon boundaries appear but fill color doesn't render
- Only outlines visible instead of solid color highlighting
- Occurs specifically in areas with overlapping habitat polygons

**Root Cause:**
Cesium requires explicit z-index and height properties for proper depth sorting when polygons overlap. Without these properties:

1. **Depth sorting conflicts** - Cesium can't determine rendering order
2. **Transparency blending issues** - Multiple overlapping transparent materials cause artifacts
3. **Z-fighting** - Polygons at same height level compete for pixels

#### Solution: Explicit Depth Control

**Implementation Pattern:**
```typescript
// Red polygons (species found) - Higher priority
entity.polygon.height = new ConstantProperty(1.0);           // Slightly elevated
entity.polygon.extrudedHeight = new ConstantProperty(2.0);   // Small extrusion
entity.polygon.zIndex = new ConstantProperty(100);           // High render priority
entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);

// Blue polygons (closest habitat) - Lower priority  
entity.polygon.height = new ConstantProperty(0.5);           // Lower elevation
entity.polygon.extrudedHeight = new ConstantProperty(1.5);   // Smaller extrusion
entity.polygon.zIndex = new ConstantProperty(50);            // Lower render priority
```

**Key Properties:**

1. **`height`** - Base elevation above ground
2. **`extrudedHeight`** - Creates slight 3D effect for visibility
3. **`zIndex`** - Explicit rendering order (higher = on top)
4. **`heightReference`** - Ensures proper ground clamping

#### File Location
**Primary Implementation:** `src/components/CesiumMap.tsx`
- Lines 324-338: Red polygon styling (species found)
- Lines 393-406: Blue polygon styling (closest habitat)

### Cesium Rendering Best Practices

#### 1. Z-Index Hierarchy

Establish clear rendering order:
```typescript
// Suggested z-index values
const Z_INDEX = {
  BASE_IMAGERY: 0,           // TiTiler habitat raster
  CLOSEST_HABITAT: 50,       // Blue highlight
  SPECIES_HIGHLIGHT: 100,    // Red highlight
  QUERY_CIRCLES: 150,        // Search radius indicators
  UI_ELEMENTS: 200           // Click markers, labels
};
```

#### 2. Height Differentiation

Use subtle height differences to prevent z-fighting:
```typescript
const POLYGON_HEIGHTS = {
  CLOSEST_HABITAT: 0.5,      // Just above ground
  SPECIES_HIGHLIGHT: 1.0,    // Higher than closest habitat
  EXTRUSION_HEIGHT_DIFF: 0.5 // Small extrusion for 3D effect
};
```

#### 3. Alpha Values for Overlaps

Balance visibility and transparency:
```typescript
const ALPHA_VALUES = {
  SPECIES_HIGHLIGHT: 0.5,    // Semi-transparent red
  CLOSEST_HABITAT: 0.7,      // More opaque blue
  OUTLINE: 1.0               // Fully opaque outlines
};
```

### Troubleshooting Polygon Rendering

#### Issue: Fill Color Not Appearing

**Diagnosis Steps:**
1. Check browser console for Cesium errors
2. Verify GeoJSON geometry is valid
3. Confirm z-index and height properties are set
4. Test with single polygon (non-overlapping area)

**Common Fixes:**
```typescript
// Ensure all required properties are set
entity.polygon.material = new ColorMaterialProperty(color);
entity.polygon.height = new ConstantProperty(heightValue);
entity.polygon.zIndex = new ConstantProperty(zIndexValue);
entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
```

#### Issue: Polygons Flickering

**Cause:** Z-fighting between polygons at same height
**Solution:** Use different height values for different polygon types

#### Issue: Outlines Only, No Fill

**Cause:** Missing or incorrect material property
**Solution:** Verify `ColorMaterialProperty` is properly constructed:
```typescript
// Correct
entity.polygon.material = new ColorMaterialProperty(CesiumColor.RED.withAlpha(0.5));

// Incorrect - may cause rendering issues
entity.polygon.material = CesiumColor.RED; // Wrong type
```

### Performance Considerations

#### Polygon Count Optimization

**Current Limits:**
- Red highlighting: All species in 10km radius (typically 1-20 polygons)
- Blue highlighting: Single closest habitat polygon
- Total on screen: Usually < 50 polygons simultaneously

**Memory Management:**
```typescript
// Always clean up previous highlights
if (highlightedSpeciesSource) {
  viewer.dataSources.remove(highlightedSpeciesSource, true);  // true = destroy
  setHighlightedSpeciesSource(null);
}
```

#### Complex Geometry Handling

**MULTIPOLYGON Support:**
- Database returns complete MULTIPOLYGON as GeoJSON
- Cesium handles complex geometries automatically
- No need to split into separate entities

**Performance Tips:**
1. Use `STABLE PARALLEL SAFE` in PostGIS functions
2. Limit polygon complexity with `ST_Simplify()` if needed
3. Remove data sources when not needed
4. Set appropriate level-of-detail for complex coastlines

### Integration with Database Functions

#### Geometry Format Requirements

**Critical:** Always return GeoJSON from database functions:
```sql
-- Correct - Returns GeoJSON for direct Cesium use
SELECT ST_AsGeoJSON(wkb_geometry)::json as wkb_geometry
FROM icaa;

-- Incorrect - WKT requires parsing and loses precision
SELECT ST_AsText(wkb_geometry) as wkb_geometry  -- Don't use
FROM icaa;
```

#### Coordinate System Consistency

**SRID 4326 Required:**
- All geometries must use WGS84 (SRID 4326)
- Cesium expects longitude/latitude coordinates
- PostGIS functions handle projection automatically

### Future Improvements

#### Advanced Rendering Features

1. **Dynamic LOD** - Simplify polygons based on zoom level
2. **Clustering** - Group nearby small polygons
3. **Fade Animations** - Smooth transitions between highlights
4. **Custom Shaders** - Advanced visual effects for different species types

#### Performance Optimizations

1. **Polygon Caching** - Store frequently accessed geometries
2. **Viewport Culling** - Only render polygons in view
3. **Batch Processing** - Group polygon updates for better performance

## Environment Variables

Database connection configured via:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anonymous/public key

## Common Issues and Solutions

### Issue: Clues Not Generating
**Cause:** Missing or null fields in database
**Solution:** Ensure species has at least one non-null field per category

### Issue: Species Not Found at Location
**Cause:** Invalid or missing geometry
**Solution:** Verify `wkb_geometry` is valid PostGIS geometry

### Issue: TypeScript Errors After Schema Change
**Cause:** Type definitions out of sync
**Solution:** Update `Species` interface to match database schema

## Future Considerations

### Database Optimization
1. Add indexes for frequently queried fields
2. Consider partitioning for large species datasets
3. Implement caching for species data

### Schema Evolution
1. Use database migrations for version control
2. Document all schema changes
3. Test backwards compatibility

### Performance Monitoring
1. Monitor query performance
2. Track spatial query efficiency
3. Optimize based on usage patterns

## Would Drizzle ORM Benefit This Project?

### Current State Analysis
- **Direct SQL**: Currently using Supabase client with minimal raw SQL
- **Type Safety**: Manual TypeScript interfaces
- **Migrations**: No formal migration system
- **Schema**: Defined only in TypeScript interfaces

### Benefits Drizzle Would Provide

1. **Schema as Code**
   - Define database schema in TypeScript
   - Single source of truth for types and database
   - Auto-generated types from schema

2. **Migration Management**
   ```typescript
   // Define schema changes in code
   export const icaa = pgTable('icaa', {
     ogc_fid: serial('ogc_fid').primaryKey(),
     comm_name: text('comm_name'),
     // ... all fields with proper types
   });
   ```

3. **Type-Safe Queries**
   ```typescript
   // Current approach (manual types)
   const { data } = await supabase.from('icaa').select('*');
   
   // With Drizzle (automatic type inference)
   const species = await db.select().from(icaa).where(eq(icaa.ogc_fid, 1));
   ```

4. **Migration Tracking**
   - Version control for database changes
   - Rollback capabilities
   - Team collaboration on schema changes

### Recommendation

**Yes, Drizzle ORM would benefit this project** for the following reasons:

1. **Growing Complexity**: With 70+ fields and plans to add more, manual type management becomes error-prone
2. **Schema Evolution**: You plan to modify clue fields and add species
3. **Type Safety**: Eliminate manual sync between database and TypeScript
4. **Migration History**: Track all database changes over time
5. **PostGIS Support**: Drizzle supports custom types for geometry

### Implementation Considerations

1. **Gradual Migration**: Can coexist with current Supabase client
2. **Learning Curve**: Minimal for TypeScript developers
3. **Initial Setup**: One-time effort to define schema
4. **Compatibility**: Works well with Supabase PostgreSQL

The investment in setting up Drizzle would pay dividends as you continue to evolve the database schema and add more complex queries.