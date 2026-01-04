---
sidebar_position: 3
title: Database Schema
description: Postgres tables, Prisma models, and data types
tags: [reference, database, postgres, prisma]
---

# Database Schema Reference

Reference for Postgres tables, Prisma models, and TypeScript types.

## Core Tables

### icaa_species

Main species data table with taxonomy and characteristics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `common_name` | text | Common name |
| `sci_name` | text | Scientific name |
| `tax_comm` | text | Taxonomic comments |
| `phylum` | text | Phylum classification |
| `class` | text | Class classification |
| `order_` | text | Order (note underscore) |
| `family` | text | Family classification |
| `genus` | text | Genus |
| `geo_desc` | text | Geographic description |
| `dist_comm` | text | Distribution comments |
| `hab_desc` | text | Habitat description |
| `hab_tags` | text[] | Habitat tags array |
| `pattern` | text | Body pattern |
| `color_prim` | text | Primary coloration |
| `color_sec` | text | Secondary coloration |
| `shape_desc` | text | Body shape |
| `size_max` | numeric | Maximum size |
| `weight_kg` | numeric | Weight in kg |
| `behav_1` | text | Primary behavior |
| `behav_2` | text | Secondary behavior |
| `diet_type` | text | Diet classification |
| `diet_prey` | text | Prey species |
| `diet_flora` | text | Plant diet |
| `life_desc1` | text | Life cycle description 1 |
| `life_desc2` | text | Life cycle description 2 |
| `lifespan` | text | Expected lifespan |
| `maturity` | text | Age at maturity |
| `repro_type` | text | Reproduction type |
| `clutch_sz` | text | Clutch/litter size |
| `cons_text` | text | Conservation description |
| `threats` | text | Known threats |
| `cons_code` | text | IUCN status code |
| `category` | text | IUCN category |
| `key_fact1` | text | Key fact 1 |
| `key_fact2` | text | Key fact 2 |
| `key_fact3` | text | Key fact 3 |
| `image_url` | text | Species image URL |
| `geom` | geometry | PostGIS geometry (4326) |

### profiles

Player profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (matches auth.users.id) |
| `username` | text | Display name |
| `avatar_url` | text | Profile image URL |
| `created_at` | timestamptz | Account creation |
| `updated_at` | timestamptz | Last update |

### game_sessions

Individual game session records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `player_id` | uuid | FK to profiles.id |
| `location_lon` | numeric | Longitude |
| `location_lat` | numeric | Latitude |
| `started_at` | timestamptz | Session start |
| `ended_at` | timestamptz | Session end |
| `score` | integer | Final score |
| `species_found` | integer | Species identified count |
| `total_species` | integer | Total species at location |

### clue_discoveries

Record of clues revealed during gameplay.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `session_id` | uuid | FK to game_sessions.id |
| `species_id` | integer | FK to icaa_species.id |
| `clue_type` | text | Category name |
| `discovered_at` | timestamptz | Discovery timestamp |

### species_discoveries

Record of correctly identified species.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `session_id` | uuid | FK to game_sessions.id |
| `species_id` | integer | FK to icaa_species.id |
| `guess_count` | integer | Attempts before correct |
| `discovered_at` | timestamptz | Discovery timestamp |

## RPC Functions

### get_species_at_location

Returns species within radius of a point.

```sql
CREATE OR REPLACE FUNCTION get_species_at_location(
  p_lon FLOAT,
  p_lat FLOAT,
  p_radius INT DEFAULT 50000
) RETURNS JSON AS $$
  SELECT json_build_object(
    'species', COALESCE((
      SELECT json_agg(row_to_json(s))
      FROM (
        SELECT *
        FROM icaa_species
        WHERE ST_DWithin(
          geom::geography,
          ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
          p_radius
        )
        ORDER BY RANDOM()
        LIMIT 10
      ) s
    ), '[]'::json),
    'habitats', COALESCE((
      SELECT array_agg(DISTINCT hab)
      FROM icaa_species,
      LATERAL unnest(hab_tags) AS hab
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
        p_radius
      )
    ), ARRAY[]::text[])
  );
$$ LANGUAGE sql STABLE;
```

**Usage:**
```typescript
const { data } = await supabase.rpc('get_species_at_location', {
  p_lon: -95.5,
  p_lat: 29.7,
  p_radius: 50000
});
```

### get_random_species

Returns random subset from species IDs.

```sql
CREATE OR REPLACE FUNCTION get_random_species(
  species_ids INT[],
  limit_count INT DEFAULT 5
) RETURNS SETOF icaa_species AS $$
  SELECT *
  FROM icaa_species
  WHERE id = ANY(species_ids)
  ORDER BY RANDOM()
  LIMIT limit_count;
$$ LANGUAGE sql STABLE;
```

### record_clue_discovery

Records a clue reveal event.

```sql
CREATE OR REPLACE FUNCTION record_clue_discovery(
  p_session_id UUID,
  p_species_id INT,
  p_clue_type TEXT
) RETURNS UUID AS $$
  INSERT INTO clue_discoveries (session_id, species_id, clue_type)
  VALUES (p_session_id, p_species_id, p_clue_type)
  RETURNING id;
$$ LANGUAGE sql;
```

### get_player_stats

Returns aggregated player statistics.

```sql
CREATE OR REPLACE FUNCTION get_player_stats(p_player_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_games', COUNT(DISTINCT gs.id),
    'total_species_found', COALESCE(SUM(gs.species_found), 0),
    'total_score', COALESCE(SUM(gs.score), 0),
    'unique_species', (
      SELECT COUNT(DISTINCT species_id)
      FROM species_discoveries sd
      JOIN game_sessions gs2 ON sd.session_id = gs2.id
      WHERE gs2.player_id = p_player_id
    )
  )
  FROM game_sessions gs
  WHERE gs.player_id = p_player_id;
$$ LANGUAGE sql STABLE;
```

## TypeScript Types

**Location:** `src/types/database.ts`

```typescript
export interface Species {
  id: number;
  common_name: string;
  sci_name: string;
  phylum?: string;
  class?: string;
  order_?: string;
  family?: string;
  genus?: string;
  geo_desc?: string;
  dist_comm?: string;
  hab_desc?: string;
  hab_tags?: string[];
  pattern?: string;
  color_prim?: string;
  color_sec?: string;
  shape_desc?: string;
  size_max?: number;
  weight_kg?: number;
  behav_1?: string;
  behav_2?: string;
  diet_type?: string;
  diet_prey?: string;
  diet_flora?: string;
  life_desc1?: string;
  life_desc2?: string;
  lifespan?: string;
  maturity?: string;
  repro_type?: string;
  clutch_sz?: string;
  cons_text?: string;
  threats?: string;
  cons_code?: string;
  category?: string;
  key_fact1?: string;
  key_fact2?: string;
  key_fact3?: string;
  image_url?: string;
}

export interface GameSession {
  id: string;
  player_id: string;
  location_lon: number;
  location_lat: number;
  started_at: string;
  ended_at?: string;
  score: number;
  species_found: number;
  total_species: number;
}

export interface PlayerStats {
  total_games: number;
  total_species_found: number;
  total_score: number;
  unique_species: number;
}
```

## Indexes

```sql
-- Spatial index for location queries
CREATE INDEX idx_icaa_species_geom ON icaa_species USING GIST (geom);

-- Session lookups
CREATE INDEX idx_game_sessions_player ON game_sessions (player_id);
CREATE INDEX idx_game_sessions_dates ON game_sessions (started_at DESC);

-- Discovery queries
CREATE INDEX idx_clue_discoveries_session ON clue_discoveries (session_id);
CREATE INDEX idx_species_discoveries_session ON species_discoveries (session_id);
```

## Row Level Security

```sql
-- Profiles: users can only read/update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Game sessions: users can only access their own
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON game_sessions FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Users can insert own sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = player_id);
```

## Related Documentation

- [Database User Guide](/docs/guides/data/database-guide)
- [Species Database Implementation](/docs/guides/data/species-database)
- [Prisma ORM Guide](/docs/guides/data/prisma-orm)
