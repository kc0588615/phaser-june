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
- `get_species_at_point` - RPC function for spatial queries
- `get_habitat_distribution_10km` - Raster habitat analysis

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

### Current Implementation
```sql
-- RPC function for species at point
CREATE OR REPLACE FUNCTION get_species_at_point(lon float, lat float)
RETURNS SETOF icaa AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM icaa
  WHERE ST_Contains(wkb_geometry, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
END;
$$ LANGUAGE plpgsql;
```

### Adding Spatial Indexes
```sql
-- Improve query performance
CREATE INDEX idx_icaa_geometry ON icaa USING GIST (wkb_geometry);
```

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