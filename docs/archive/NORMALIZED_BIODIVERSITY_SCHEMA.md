# Normalized Biodiversity Schema (Strict 3NF)

This document describes the normalized taxonomy backbone and multi-source model added in:
- `src/db/migrations/004_normalized_biodiversity_schema.sql`
- `src/db/migrations/005_normalized_biodiversity_backfill.sql`
- `src/db/migrations/006_normalized_biodiversity_views.sql`

## Goals
- Strict 3NF and multi-source interoperability
- Surrogate primary keys for taxon concepts
- External IDs mapped in a separate table
- Provenance (source datasets) tracked for each import
- Compatibility via `icaa_view`

## Core Tables

### `taxa`
Concept tree (one row per taxon concept). The accepted name is stored in `taxon_names`.

### `taxon_names`
Scientific names with rank. Uniqueness is `(scientific_name, rank)`.

### `taxon_name_usages`
Links taxa to names (accepted or synonym) per source dataset.

### `source_datasets`
Tracks dataset name, version, DOI, license, and last sync.

### `taxon_external_ids`
Maps taxa to external identifiers (IUCN, GBIF, COL, legacy ICAA IDs).

### `conservation_statuses` and `taxon_conservation_assessments`
Stores conservation codes and assessments by source.

### `taxon_profiles`
Canonical species-level attributes (habitat, morphology, diet type, etc.).

### `taxon_ranges`
Geometry records per source (PostGIS).

### `taxon_bioregions`
Links taxa to OneEarth bioregion codes.

### Multi-value lists
- `taxon_habitat_tags`
- `taxon_threats`
- `taxon_diet_items`
- `taxon_behaviors`
- `taxon_key_facts`
- `taxon_life_descriptions`
- `taxon_common_names`

## Parsing Rules (Backfill)
Applied in `005_normalized_biodiversity_backfill.sql`.

- `habitat_tags`: split on comma and semicolon.
- `threats`: split on semicolon only (commas preserved in prose).
- `diet_prey` / `diet_flora`: hybrid rule.
  - If semicolon exists, split on semicolon.
  - Else if average words per comma-segment <= 2, split on commas.
  - Else treat as a single prose item.

## Compatibility View

`icaa_view` provides legacy-style columns derived from normalized tables.
This supports gradual migration of app queries.

## Suggested Workflow

1. Import shapefile into `icaa` (or `icaa_staging`) as before.
2. Run `004` to create normalized tables.
3. Run `005` to backfill normalized tables.
4. Use `icaa_view` for legacy-compatible reads.
5. Migrate app queries to normalized tables and views.

## Notes
- `oneearth_bioregion.bioregion` now has a UNIQUE constraint for FK usage.
- `taxon_id` is `bigint` identity and should be used internally for new relationships.
- External identifiers (IUCN id_no, GBIF key, etc.) live in `taxon_external_ids`.
