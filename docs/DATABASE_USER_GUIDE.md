# Database User Guide

> **Checked against live DB: 2026-07-05.**
> Current clue data lives in `species`, `species_facts`,
> `species_deduction_profiles`, `species_deduction_clues`,
> `player_clue_unlocks`, and `species_card_unlocks`.
> The old `icaa_view` / `taxa` / `icaa` clue read path is gone from the live DB.

## Overview

This guide documents the current app-owned clue tables and related database conventions for the Species Discovery Game.

## Current Database Architecture

### Technology Stack
- **Database**: PostgreSQL 15+ (Hetzner VPS) with PostGIS extension
- **Connection**: Drizzle ORM (postgres.js). Prisma is no longer used.
- **Spatial Features**: PostGIS for geographic queries
- **Real-time**: None (Standard REST/Server Actions)

See `docs/SHAPEFILE_BEST_PRACTICES.md` for pre-import guidance on spatial data fields and types.

### Database Tables

#### 1. `species`
Curated game/app species table. Stable FK target for clue and game tables.

#### 2. `species_facts`
Ordered source facts used by species cards and legacy clue fields.

- `species_id` -> `species.id`
- `category`
- `fact_text`
- `sort_order`
- Unique: `(species_id, category, sort_order)`

Live categories: `behavior`, `diet_flora`, `diet_prey`, `key_fact`,
`life_description`, `threat`.

#### 3. `species_deduction_profiles`
One row per species with tag arrays and summary notes for deduction/comparison.

- PK/FK: `species_id` -> `species.id`
- Tag arrays: `habitat_tags`, `morphology_tags`, `diet_tags`, `behavior_tags`,
  `reproduction_tags`, `taxonomy_tags`
- Notes: `habitat_note`, `morphology_note`, `diet_note`, `behavior_note`,
  `reproduction_note`, `reference_summary`

#### 4. `species_deduction_clues`
Current normalized clue table.

- `species_id` -> `species.id`
- `category`
- `label`
- `compare_tags`
- `reveal_order`
- `unlock_mode`: `fragment` or `score`
- `base_cost`
- `is_filtering`
- Unique index in Drizzle: `(species_id, category, reveal_order)`

Live category check values: `habitat`, `morphology`, `diet`, `behavior`,
`reproduction`, `taxonomy`, `key_fact`, `geography`, `conservation`.

#### 5. `player_clue_unlocks`
Persisted player clue unlock history.

- `player_id` -> `profiles.user_id`
- `species_id` -> `species.id`
- Optional `discovery_id` -> `player_species_discoveries.id`
- `clue_category`, `clue_field`, `clue_value`
- Optional `run_node_id` -> `eco_run_nodes.id`

#### 6. `species_card_unlocks`
Persisted species-card unlock event log.

- `player_id` -> `profiles.user_id`
- `species_id` -> `species.id`
- Optional `run_id` -> `eco_run_sessions.id`
- `unlock_type`
- `payload` jsonb

#### 7. `high_scores`
- `id` (uuid) - Primary key
- `player_id` (uuid, nullable) - Optional FK to `profiles.user_id` for authenticated players
- `username` (string) - Player name (legacy/guest-friendly)
- `score` (number) - Game score
- `created_at` (timestamptz) - Score submission time

**Note:** `player_id` is optional so legacy anonymous scores remain valid.

## Maintenance Tasks

After applying schema migrations on an existing database, run the stats backfill once:

```bash
npx tsx scripts/backfill-player-stats.ts
```

## Conventions and Best Practices

These conventions apply to app-owned tables and new schema changes. Import-owned tables
(for example, `icaa` and `oneearth_bioregion`) may not comply; prefer views or staged
transforms instead of renaming or retyping import columns.

### Naming
- Table names: lowercase, snake_case, plural (users, order_items)
- Column names: lowercase, snake_case, singular (email, status)
- Primary keys: `id` with `bigint GENERATED ALWAYS AS IDENTITY` (use UUID only for externally sourced IDs)
- Foreign keys: `singular_table_id` (user_id)
- Timestamps: `_at` suffix with `timestamptz`
- Dates: `_on` suffix
- Booleans: `is_` or `has_` prefix

### Data Types
- Use `text` for strings; use `CHECK` constraints if length matters
- Use `timestamptz` for timestamps
- Use `numeric` or integer cents for money; avoid `money`
- Use `jsonb` for JSON data
- Avoid `varchar(255)` or other arbitrary limits; use `text` unless a strict business rule requires a length check
- Avoid `char(n)` (fixed-width, padded, usually slower)
Rationale: Postgres stores `text`/`varchar` the same (varlena + TOAST), so length limits only add checks and schema debt.

### Constraints and Indexes (Named)
- Indexes: `ix_tablename_columns` (example: ix_users_email)
- Foreign keys: `fk_tablename_reference` (example: fk_orders_user_id)
- Unique constraints: `uq_tablename_columns` (example: uq_users_email)
- Check constraints: `ck_tablename_rule` (example: ck_users_age_positive)

### Querying
- Always alias tables in raw SQL
- Avoid `NOT IN (...)` with nullable columns; use `NOT EXISTS` or `LEFT JOIN ... IS NULL`
- Avoid `BETWEEN` for timestamps; use `>=` and `<` bounds

### Example: Compliant Tables
```sql
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_email_valid CHECK (length(email) > 3)
);

CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL,
  total numeric(10, 2) NOT NULL,
  placed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX ix_orders_user_id ON orders (user_id);
```

## Current Clue Database

Live check, 2026-07-05:

| Table | Rows |
| --- | ---: |
| `species` | 22 |
| `species_facts` | 218 |
| `species_deduction_profiles` | 22 |
| `species_deduction_clues` | 341 |
| `player_clue_unlocks` | 55 |
| `species_card_unlocks` | 28 |

The current clue source of truth is `species_deduction_clues`, joined to
`species` by `species_id`. It does not depend on `icaa_view`.

### Deduction Clue Categories

| Category | Clues | Species | Reveal order | Unlock modes |
| --- | ---: | ---: | --- | --- |
| `behavior` | 44 | 22 | 1-2 | `fragment` |
| `conservation` | 22 | 22 | 1 | `score` |
| `diet` | 33 | 22 | 1-2 | `fragment` |
| `geography` | 22 | 22 | 1 | `score` |
| `habitat` | 44 | 22 | 1-2 | `fragment` |
| `key_fact` | 66 | 22 | 1-3 | `score` |
| `morphology` | 44 | 22 | 1-2 | `fragment` |
| `reproduction` | 22 | 22 | 1 | `fragment` |
| `taxonomy` | 44 | 22 | 1-2 | `score` |

### Fact Categories

`species_facts` currently has:

| Category | Facts | Species | Sort order |
| --- | ---: | ---: | --- |
| `behavior` | 44 | 22 | 1-2 |
| `diet_flora` | 22 | 22 | 1 |
| `diet_prey` | 20 | 20 | 1 |
| `key_fact` | 66 | 22 | 1-3 |
| `life_description` | 44 | 22 | 1-2 |
| `threat` | 22 | 22 | 1 |

### Clue Row Semantics

`species_deduction_clues` rows are authored clues:

```sql
species_id   integer not null references species(id) on delete cascade
category     text not null
label        text not null
compare_tags text[]
reveal_order smallint not null default 1
unlock_mode  text not null default 'fragment'
base_cost    smallint not null default 2
is_filtering boolean not null default true
created_at   timestamptz not null default now()
```

Constraints:

- `category` must be one of `habitat`, `morphology`, `diet`, `behavior`,
  `reproduction`, `taxonomy`, `key_fact`, `geography`, `conservation`.
- `unlock_mode` must be `fragment` or `score`.
- Drizzle defines uniqueness on `(species_id, category, reveal_order)`.

`compare_tags` drive comparative filtering. `is_filtering=false` means the clue
is display/progress information but not a filter tag clue.

## Files Affected by Database Changes

When modifying clue tables, update the schema, types, seed/import code, and UI consumers together.

### 1. Drizzle Schema
**File:** `src/db/schema/species.ts`
- `speciesFacts`
- `speciesDeductionProfiles`
- `speciesDeductionClues`

**File:** `src/db/schema/player.ts`
- `playerClueUnlocks`

**File:** `src/db/schema/game.ts`
- `speciesCardUnlocks`

### 2. Types
**Files:** `src/db/types.ts`, `src/types/database.ts`
- Refresh inferred Drizzle exports when tables change.
- Keep legacy `Species` fields only if current UI still reads them.

### 3. Clue Consumers
**Files:**
- `src/game/clueConfig.ts` - legacy progressive gem clue fallback.
- `src/lib/speciesCardUnlocks.ts` - maps clue events to card unlock payloads.
- API routes that read/write `species_deduction_clues`, `player_clue_unlocks`,
  or `species_card_unlocks`.

### 4. Database Functions and Spatial APIs
- `get_species_at_point` - Point-based spatial queries (deprecated in favor of radius queries)
- `get_species_in_radius` - Circle intersection queries for species discovery
- `/api/species/closest` - Finds nearest habitat polygon when no species found (PostGIS `<->`)

**Deprecated:**
- `get_habitat_distribution_10km` - **Replaced by TiTiler COG statistics** (Dec 2025)

### 5. External Services

#### TiTiler (Habitat Raster Analysis)
Habitat distribution within a 10km bounding box of clicked points uses TiTiler for categorical statistics on Cloud Optimized GeoTIFF (COG).

**Configuration (`.env.local`):**
```bash
NEXT_PUBLIC_TITILER_BASE_URL=https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_COG_URL=https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif
```

**Implementation:** `src/lib/speciesService.ts` → `getRasterHabitatDistribution()`

**Flow:**
1. User clicks map → lon/lat captured
2. Create 10km bounding box GeoJSON (`createBboxGeoJSON()`)
3. POST to `/cog/statistics?categorical=true&max_size=512` with bbox geometry
4. Parse histogram: `[[counts], [values]]` format (numpy style)
5. Map integer codes to labels via `STATIC_HABITAT_CODE_TO_LABEL` (with database `habitat_colormap` fallback)
6. Return `{habitat_type, percentage}[]` sorted by percentage descending

**Visual sync:** MapLibreExploreMap shows red rectangle (`RectangleGraphics`) matching exact bbox sent to TiTiler.

**Key files:**
- `src/lib/speciesService.ts` - TiTiler query logic, colormap lookup
- `src/components/MapLibreExploreMap.tsx` - Visual bbox rendering, click handling
- `src/components/HabitatLegend.tsx` - Habitat type display with color chips
- `src/config/habitatColors.ts` - Habitat label → color mapping

**Benefits vs. legacy raster RPC:**
- No `habitat_raster` table storage required
- Direct COG access from S3
- Serverless TiTiler scales independently
- Raster updates = swap COG file (no DB migration)

**Related Table:**
- `habitat_colormap` - Maps integer habitat codes to labels (value → label)

**See also:** [HABITAT_RASTER_MIGRATION.md](./HABITAT_RASTER_MIGRATION.md) for full migration details

## Guidelines for Database Changes

Follow the conventions above for app-owned tables. Treat import-owned tables as
read-only; use views or staged transforms if you need canonical naming or types.

### Schema Change Checklist

Before you ship a schema change:
- Confirm naming: plural tables, singular columns, `id`, `_at`/`_on`, `is_`/`has_`
- Confirm types: `timestamptz`, `text`, `jsonb`, `numeric` or integer cents for money
- Name constraints and indexes with `ix_`/`uq_`/`fk_`/`ck_` prefixes
- Add indexes for FKs and hot query paths (especially leaderboard or radius queries)
- Update types and usage: `src/db/schema/*`, `src/db/types.ts`, API routes, clue/card UI
- Refresh introspection: `npm run db:introspect`

### Adding New Species

1. **Required Fields:**
   - `common_name` or `scientific_name` (at least one)
   - Geometry/source range data if the species should appear in map discovery
   - One `species_deduction_profiles` row
   - Enough `species_deduction_clues` rows for the deduction categories used by gameplay

2. **Best Practices:**
   - Populate as many fields as possible
   - Use consistent formatting for taxonomic names
   - Ensure geometry is valid PostGIS format
   - Test spatial queries after adding
   - Keep `species_facts` and `species_deduction_clues` in sync when both are used

3. **Minimum clue rows:**
```sql
INSERT INTO species_deduction_profiles (
  species_id, habitat_tags, morphology_tags, diet_tags, behavior_tags,
  reproduction_tags, taxonomy_tags, reference_summary
) VALUES (
  23,
  ARRAY['forest'],
  ARRAY['spotted'],
  ARRAY['omnivore'],
  ARRAY['nocturnal'],
  ARRAY['egg_laying'],
  ARRAY['aves'],
  'Short comparative summary.'
);

INSERT INTO species_deduction_clues (
  species_id, category, label, compare_tags, reveal_order,
  unlock_mode, base_cost, is_filtering
) VALUES
  (23, 'habitat', 'Lives in forest habitats', ARRAY['forest'], 1, 'fragment', 2, true),
  (23, 'taxonomy', 'Class: AVES', ARRAY['aves'], 1, 'score', 80, true),
  (23, 'key_fact', 'Has a distinctive field mark.', NULL, 1, 'score', 60, false);
```

### Modifying Clue Data

1. **Adding New Fields:**
   - Add column/table change in `src/db/schema/species.ts`
   - Add a migration
   - Refresh `src/db/types.ts`
   - Determine appropriate clue category
   - Update query/API/UI code that reads the clue rows
   - Run TypeScript checks: `npm run typecheck`

2. **Adding New Categories:**
   - Add the category to `DeductionClueCategory` in `src/db/schema/species.ts`
   - Add/update the DB check constraint
   - Update any UI filters, card unlock mapping, and seed/import logic

3. **Renaming or Removing Categories:**
   - Migrate existing `species_deduction_clues.category` values
   - Migrate `player_clue_unlocks.clue_category` if historical unlocks must remain queryable
   - Update `species_card_unlocks.payload` readers if payloads store the old category

### Example: Adding a New Deduction Clue

```sql
INSERT INTO species_deduction_clues (
  species_id, category, label, compare_tags, reveal_order,
  unlock_mode, base_cost, is_filtering
) VALUES (
  1,
  'behavior',
  'Uses basking sites near wetland edges.',
  ARRAY['basking', 'wetland'],
  3,
  'fragment',
  4,
  true
);
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
  common_name text,
  scientific_name text,
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
    s.common_name,
    s.scientific_name,
    -- ... other fields ...
    ST_AsGeoJSON(s.wkb_geometry)::json as wkb_geometry  -- Key: Returns GeoJSON
  FROM public.icaa_view s
  JOIN circle c
    ON ST_Intersects(s.wkb_geometry, c.geom);
$$;
```

#### Key Design Decisions

1. **Geography vs Geometry**: Uses PostGIS `geography` type for accurate meter-based buffering
2. **GeoJSON Output**: Returns `ST_AsGeoJSON()` instead of WKT text for direct MapLibre consumption
3. **Intersection Logic**: Uses `ST_Intersects()` instead of `ST_Contains()` for broader discovery

### Visual Highlighting System

#### Red Highlighting (Species Found)
When species are discovered, their **complete MULTIPOLYGON geometries** are highlighted in red:

```typescript
// Frontend processing (MapLibreExploreMap.tsx)
for (const species of speciesResult.species) {
  if (species.wkb_geometry) {
    const feature = {
      type: 'Feature',
      properties: { ogc_fid: species.ogc_fid, common_name: species.common_name },
      geometry: species.wkb_geometry  // Direct GeoJSON from database
    };
    features.push(feature);
  }
}

// Load into MapLibre as red polygons
await redDataSource.load({ type: 'FeatureCollection', features });
```

#### Blue Highlighting (No Species Found)
Uses the `/api/species/closest` API route, which returns GeoJSON directly:

```sql
-- API route uses ST_AsGeoJSON for geometry
SELECT ST_AsGeoJSON(wkb_geometry) FROM icaa_view ...
```

### Geometry Data Flow

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   PostGIS       │    │  Next.js API + Drizzle│   │     MapLibre      │
│   MULTIPOLYGON  │ ─→ │  ST_AsGeoJSON (json) │ ─→ │  GeoJsonDataSource
│   (wkb_geometry)│    │  /api/species/*      │    │  Red/Blue Polygons
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

**Critical**: The geometry must be returned as **GeoJSON** (not WKT) to preserve complete MULTIPOLYGON structures for MapLibre rendering.

### Performance Optimizations

#### Spatial Indexes
```sql
-- Essential for spatial query performance
-- Use ix_ prefix for new indexes (legacy names may differ)
CREATE INDEX IF NOT EXISTS ix_taxon_ranges_wkb_geometry
  ON public.taxon_ranges
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
RETURNS SETOF icaa_view AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM icaa_view
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
  const response = await fetch(
    `/api/species/in-radius?lon=${longitude}&lat=${latitude}&radius=${radiusMeters}`
  );

  if (!response.ok) {
    return { species: [], count: 0 };
  }

  const data = await response.json();
  return {
    species: data.species || [],
    count: data.count || 0
  };
}
```

#### Map Click Handler
```typescript
// MapLibreExploreMap.tsx - Uses 10km radius constant
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
   - Verify spatial index exists: `\d+ taxon_ranges` should show GIST index
   - Check radius parameter (10000 = 10km)
   - Confirm SRID 4326 is used consistently

#### Debugging Queries
```sql
-- Test radius query manually
SELECT ogc_fid, common_name, ST_Area(wkb_geometry) as area_sqm
FROM public.get_species_in_radius(-80.0, 25.0, 10000.0);

-- Check geometry validity
SELECT ogc_fid, ST_IsValid(wkb_geometry), ST_GeometryType(wkb_geometry)
FROM icaa_view
WHERE ogc_fid = 23;
```

## MapLibre Polygon Rendering

### Visual Highlighting Implementation

The application uses MapLibre's `GeoJsonDataSource` to render species habitat polygons with visual highlighting. Understanding the rendering system is crucial for maintaining proper visualization.

#### Polygon Highlighting Types

1. **Red Highlighting** - Species found at location
2. **Blue (Cyan) Highlighting** - Closest habitat when no species found

#### MapLibre Rendering Pipeline

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
    entity.polygon.material = new ColorMaterialProperty(MapLibreColor.RED.withAlpha(0.5));
    entity.polygon.outline = new ConstantProperty(true);
    entity.polygon.outlineColor = new ConstantProperty(MapLibreColor.RED);
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
MapLibre requires explicit z-index and height properties for proper depth sorting when polygons overlap. Without these properties:

1. **Depth sorting conflicts** - MapLibre can't determine rendering order
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
**Primary Implementation:** `src/components/MapLibreExploreMap.tsx`
- Lines 324-338: Red polygon styling (species found)
- Lines 393-406: Blue polygon styling (closest habitat)

### MapLibre Rendering Best Practices

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
1. Check browser console for MapLibre errors
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
entity.polygon.material = new ColorMaterialProperty(MapLibreColor.RED.withAlpha(0.5));

// Incorrect - may cause rendering issues
entity.polygon.material = MapLibreColor.RED; // Wrong type
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
- MapLibre handles complex geometries automatically
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
-- Correct - Returns GeoJSON for direct MapLibre use
SELECT ST_AsGeoJSON(wkb_geometry)::json as wkb_geometry
FROM icaa_view;

-- Incorrect - WKT requires parsing and loses precision
SELECT ST_AsText(wkb_geometry) as wkb_geometry  -- Don't use
FROM icaa_view;
```

#### Coordinate System Consistency

**SRID 4326 Required:**
- All geometries must use WGS84 (SRID 4326)
- MapLibre expects longitude/latitude coordinates
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
- `DATABASE_URL` - Postgres connection string (server-only)
- `NEXT_PUBLIC_TITILER_BASE_URL` - TiTiler endpoint (optional)
- `NEXT_PUBLIC_COG_URL` - Habitat COG URL (optional)

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

## ORM Choice

Drizzle is the current ORM. Use the query builder for CRUD and `db.execute(sql\`...\`)` for PostGIS spatial queries. Schema authority is hybrid: app tables are code-defined, spatial tables are import-owned and introspected for types.
