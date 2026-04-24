# Bioregion Implementation for Species Habitat Classification

> **Architecture updated 2026-04-22**: `taxon_bioregions`, `taxon_ranges`, and `icaa_view`
> have been removed. Bioregion fields (`bioregion`, `realm`, `subrealm`, `biome`) are now
> stored directly on the `species` table. Geometry lives in the `iucn` table (raw IUCN
> shapefile import). The SQL functions below have been updated to reflect current schema.

This document describes automatic bioregion classification for species based on their habitat polygons.

## Overview

Each species' geometry is spatially analyzed against `oneearth_bioregion` to find the largest
overlapping ecoregion. The result is stored on `species.bioregion/realm/subrealm/biome`.

## Current Schema

- `species.bioregion/realm/subrealm/biome` — curated fields, updated by the SQL below
- `iucn` — raw geometry source; join via `species.iucn_id = iucn.id_no`
- `oneearth_bioregion` — ecoregion polygons (SRID: 900914 Spherical Mercator)
- `iucn.wkb_geometry` — species range polygons (SRID: 4326 WGS84)

## Setup Instructions

Run the SQL queries below to (re)populate bioregion fields on the `species` table after refreshing the IUCN dataset or when adding new species.

## Database Schema

### oneearth_bioregion Table
Contains polygons representing different ecoregions with the following relevant fields:
- `ogc_fid`: Primary key
- `bioregion`: Bioregion code
- `realm`: Major biogeographic realm
- `subrealm`: Sub-realm classification
- `biome`: Biome type
- `wkb_geometry`: Polygon geometry (SRID: 900914 - Spherical Mercator)

### Geometry Source
- `iucn.wkb_geometry` — raw IUCN range polygons (SRID: 4326 WGS84)
- Join: `species.iucn_id = iucn.id_no`

## SQL: Populate bioregion fields on species

### Batch update all species (largest total overlap per bioregion wins)

For species with multiple iucn range rows (subspecies, seasonal ranges), overlap area must be
summed per bioregion before picking the winner. The inner GROUP BY aggregates per
`(species.id, bioregion)` first; the outer `DISTINCT ON` then picks the bioregion with the
largest total overlap per species.

```sql
UPDATE species sp SET
  bioregion = sub.bioregion,
  realm     = sub.realm,
  subrealm  = sub.subrealm,
  biome     = sub.biome
FROM (
  SELECT DISTINCT ON (agg.species_id)
    agg.species_id,
    agg.bioregion,
    agg.realm,
    agg.subrealm,
    agg.biome
  FROM (
    SELECT
      s.id AS species_id,
      b.bioregion::TEXT,
      b.realm::TEXT,
      b.subrealm::TEXT,
      b.biome::TEXT,
      SUM(ST_Area(ST_Intersection(ST_Transform(i.wkb_geometry, 900914), b.wkb_geometry))) AS total_overlap
    FROM species s
    JOIN iucn i ON i.id_no = s.iucn_id::numeric
    JOIN oneearth_bioregion b ON ST_Intersects(ST_Transform(i.wkb_geometry, 900914), b.wkb_geometry)
    WHERE i.wkb_geometry IS NOT NULL
    GROUP BY s.id, b.bioregion, b.realm, b.subrealm, b.biome
  ) agg
  ORDER BY agg.species_id, agg.total_overlap DESC
) sub
WHERE sub.species_id = sp.id;
```

### Single species (by species.id)

```sql
SELECT
  b.bioregion::TEXT,
  b.realm::TEXT,
  b.subrealm::TEXT,
  b.biome::TEXT,
  SUM(ST_Area(ST_Intersection(ST_Transform(i.wkb_geometry, 900914), b.wkb_geometry))) / 1e6 AS total_overlap_km2
FROM species s
JOIN iucn i ON i.id_no = s.iucn_id::numeric
JOIN oneearth_bioregion b ON ST_Intersects(ST_Transform(i.wkb_geometry, 900914), b.wkb_geometry)
WHERE s.id = $species_id
GROUP BY b.bioregion, b.realm, b.subrealm, b.biome
ORDER BY total_overlap_km2 DESC
LIMIT 1;
```

## Key Implementation Details

1. **Source geometry**: `iucn.wkb_geometry` (SRID 4326) joined to `species` via `iucn.id_no = species.iucn_id`. Multiple range rows per species are handled by the join naturally — all polygons are checked.

2. **Coordinate System Transformation**: `iucn` polygons (SRID 4326) are transformed to match `oneearth_bioregion` (SRID 900914) using `ST_Transform`.

3. **Spatial Intersection**: `ST_Intersects` finds all bioregions overlapping the species range.

4. **Area Calculation**: `ST_Area(ST_Intersection(...))` in native CRS units (900914 is metric).

5. **Selection Logic**: Inner `GROUP BY (s.id, bioregion, ...)` sums `ST_Area` across all iucn rows for that species+bioregion pair; outer `DISTINCT ON (species_id) ORDER BY total_overlap DESC` picks the bioregion with the largest total area. This correctly handles species with multiple range polygons spanning multiple bioregions.

6. **Storage**: Results written to `species.bioregion/realm/subrealm/biome` — no separate join table needed.

## Frontend Integration

### API Integration
`/api/species/bioregions` reads `bioregion`, `realm`, `subrealm`, `biome` from the `species`
table directly (populated by the SQL above).

### Species Card Component
Displays bioregion information in the "Ecoregion" section:
- Bioregion name
- Realm
- Sub-realm
- Biome

## Example Result
For Green Sea Turtle (species.id: 4):
- **Bioregion**: Micronesia Moist Tropical Forests
- **Realm**: Oceania
- **Sub-realm**: Oceanic Islands
- **Biome**: Tropical & Subtropical Moist Broadleaf Forests
