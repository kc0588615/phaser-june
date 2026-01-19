---
sidebar_position: 3
title: Database Schema
description: Postgres tables, Drizzle schema, and data types
tags: [reference, database, postgres, drizzle]
---

# Database Schema Reference

Reference for Postgres tables and Drizzle schema. App tables are defined in `src/db/schema/*`; spatial tables are import-owned and mirrored in `src/db/schema/species.ts` via introspection.

## Core Tables

### icaa

Main species data table.

| Column | Type | Description |
|--------|------|-------------|
| `ogc_fid` | integer | Primary key |
| `comm_name` | text | Common name |
| `sci_name` | text | Scientific name |
| `tax_comm` | text | Taxonomic comments |
| `kingdom` | text | Kingdom |
| `phylum` | text | Phylum |
| `class` | text | Class |
| `order_` | text | Order (underscore to avoid reserved word) |
| `family` | text | Family |
| `genus` | text | Genus |
| `category` | text | IUCN category |
| `cons_code` | text | Conservation status code |
| `cons_text` | text | Conservation description |
| `threats` | text | Known threats |
| `hab_desc` | text | Habitat description |
| `hab_tags` | text | Habitat tags (comma-separated) |
| `marine` | text | "true"/"false" string |
| `terrestria` | text | "true"/"false" string |
| `freshwater` | text | "true"/"false" string |
| `aquatic` | text | "true"/"false" string |
| `geo_desc` | text | Geographic description |
| `dist_comm` | text | Distribution comments |
| `bioregio_1` | text | Bioregion code |
| `realm` | text | Biogeographic realm |
| `sub_realm` | text | Sub-realm |
| `biome` | text | Biome |
| `pattern` | text | Pattern description |
| `color_prim` | text | Primary color |
| `color_sec` | text | Secondary color |
| `shape_desc` | text | Body shape |
| `size_min` | numeric | Min size (cm) |
| `size_max` | numeric | Max size (cm) |
| `weight_kg` | numeric | Weight (kg) |
| `diet_type` | text | Diet category |
| `diet_prey` | text | Prey items |
| `diet_flora` | text | Plant diet |
| `behav_1` | text | Primary behavior |
| `behav_2` | text | Secondary behavior |
| `life_desc1` | text | Life cycle description 1 |
| `life_desc2` | text | Life cycle description 2 |
| `lifespan` | numeric | Lifespan (years) |
| `maturity` | text | Maturity notes |
| `repro_type` | text | Reproduction type |
| `clutch_sz` | text | Clutch size |
| `key_fact1` | text | Key fact 1 |
| `key_fact2` | text | Key fact 2 |
| `key_fact3` | text | Key fact 3 |
| `wkb_geometry` | geometry | PostGIS geometry (4326) |

Note: `wkb_geometry` exists in Postgres; non-spatial API endpoints exclude it to avoid large payloads. Spatial routes use PostGIS raw SQL via Drizzle.

### profiles

Player profile records (auth provider planned: Clerk).

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Primary key (auth provider user id) |
| `username` | text | Display name |
| `full_name` | text | Full name |
| `avatar_url` | text | Profile image URL |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

### player_game_sessions

Session tracking per player.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `player_id` | uuid | FK to profiles.user_id |
| `started_at` | timestamptz | Session start |
| `ended_at` | timestamptz | Session end |
| `total_moves` | integer | Moves made |
| `total_score` | integer | Score total |
| `species_discovered_in_session` | integer | Species discovered |
| `clues_unlocked_in_session` | integer | Clues unlocked |
| `created_at` | timestamptz | Created timestamp |

### player_species_discoveries

Per-species discovery records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `player_id` | uuid | FK to profiles.user_id |
| `species_id` | integer | FK to icaa.ogc_fid |
| `session_id` | uuid | FK to player_game_sessions.id |
| `discovered_at` | timestamptz | Discovery timestamp |
| `time_to_discover_seconds` | integer | Time to discover |
| `clues_unlocked_before_guess` | integer | Clues before guess |
| `incorrect_guesses_count` | integer | Wrong guesses |
| `score_earned` | integer | Score awarded |

### player_clue_unlocks

Per-clue unlock records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `player_id` | uuid | FK to profiles.user_id |
| `species_id` | integer | FK to icaa.ogc_fid |
| `discovery_id` | uuid | FK to player_species_discoveries.id (nullable) |
| `clue_category` | text | Category (classification, habitat, etc.) |
| `clue_field` | text | Field name (taxon_order, realm, etc.) |
| `clue_value` | text | Display value |
| `unlocked_at` | timestamptz | Unlock timestamp |

### player_stats

Aggregated per-player statistics. JSONB fields store map-style counts.

| Column | Type | Description |
|--------|------|-------------|
| `player_id` | uuid | Primary key |
| `total_species_discovered` | integer | Total species discovered |
| `total_clues_unlocked` | integer | Total clues unlocked |
| `total_score` | integer | Total score |
| `total_moves_made` | integer | Moves made |
| `total_games_played` | integer | Games played |
| `total_play_time_seconds` | integer | Play time (seconds) |
| `average_clues_per_discovery` | numeric | Average clues used |
| `fastest_discovery_clues` | integer | Fastest discovery (clues) |
| `slowest_discovery_clues` | integer | Slowest discovery (clues) |
| `average_time_per_discovery_seconds` | integer | Average time per discovery |
| `species_by_order` | jsonb | Counts by order |
| `species_by_family` | jsonb | Counts by family |
| `species_by_genus` | jsonb | Counts by genus |
| `species_by_realm` | jsonb | Counts by realm |
| `species_by_biome` | jsonb | Counts by biome |
| `species_by_bioregion` | jsonb | Counts by bioregion |
| `marine_species_count` | integer | Marine count |
| `terrestrial_species_count` | integer | Terrestrial count |
| `freshwater_species_count` | integer | Freshwater count |
| `aquatic_species_count` | integer | Aquatic count |
| `species_by_iucn_status` | jsonb | Counts by IUCN status |
| `clues_by_category` | jsonb | Counts by clue category |
| `favorite_clue_category` | text | Favorite category |
| `first_discovery_at` | timestamptz | First discovery time |
| `last_discovery_at` | timestamptz | Last discovery time |
| `created_at` | timestamptz | Created timestamp |
| `updated_at` | timestamptz | Updated timestamp |

### habitat_colormap

| Column | Type | Description |
|--------|------|-------------|
| `value` | integer | Habitat code |
| `label` | text | Habitat label |

### oneearth_bioregion

Reference polygons for bioregions (geometry not returned by non-spatial endpoints).

| Column | Type | Description |
|--------|------|-------------|
| `ogc_fid` | integer | Primary key |
| `bioregions` | text | Full bioregion name |
| `bioregion` | text | Bioregion code (join key) |
| `realm` | text | Realm |
| `subrealm` | text | Sub-realm |
| `biome` | text | Biome |
| `shape_length` | float | Shape length |
| `shape_length_alt` | numeric | Shape length (alt) |
| `shape_area` | float | Shape area |

### high_scores

Legacy leaderboard table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `player_id` | uuid | Optional FK to profiles.user_id |
| `username` | text | Player display name |
| `score` | integer | Score |
| `created_at` | timestamptz | Created timestamp |

## Spatial Queries (PostGIS)

- Geometry lives in `icaa.wkb_geometry` (4326).
- Drizzle uses raw SQL via `db.execute(sql\`...\`)` for PostGIS queries.

Example API usage:

```typescript
const response = await fetch('/api/species/in-radius?lon=-95.5&lat=29.7&radius=50000');
const data = await response.json();
```

## TypeScript Types

**Location:** `src/types/database.ts`

```typescript
export interface Species {
  ogc_fid: number;
  common_name?: string;
  scientific_name?: string;
  category?: string;
  taxon_order?: string;
  family?: string;
  genus?: string;
  realm?: string;
  biome?: string;
  bioregion?: string;
  wkb_geometry?: any;
}

export interface PlayerStats {
  player_id: string;
  total_species_discovered: number;
  total_clues_unlocked: number;
  total_score: number;
  total_moves_made: number;
  total_games_played: number;
  average_clues_per_discovery: number | null;
  // ... more fields in src/types/database.ts
}
```

## Constraints & Indexes

Named constraints and indexes follow conventions:

| Object | Name |
|--------|------|
| profiles username unique | `uq_profiles_username` |
| player_species_discoveries unique | `uq_player_species_discoveries_player_species` |
| player_clue_unlocks unique | `uq_player_clue_unlocks_player_species_category_field` |
| player_game_sessions FK index | `ix_player_game_sessions_player_id` |
| player_species_discoveries session index | `ix_player_species_discoveries_session_id` |
| player_clue_unlocks discovery index | `ix_player_clue_unlocks_discovery_id` |
| high_scores leaderboard | `ix_high_scores_score` |
| icaa spatial | `ix_icaa_wkb_geometry` |
| oneearth_bioregion spatial | `ix_oneearth_bioregion_wkb_geometry` |

Foreign keys use `fk_tablename_column` naming (e.g., `fk_player_game_sessions_player_id`).

## Related Documentation

- [Database User Guide](/docs/guides/data/database-guide)
- [Species Database Implementation](/docs/guides/data/species-database)
- [Drizzle ORM Guide](/docs/guides/data/drizzle-orm)
