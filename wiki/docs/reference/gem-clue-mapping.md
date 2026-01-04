---
sidebar_position: 1
title: Gem & Clue Mapping
description: Complete reference for gem colors, clue categories, and database fields
tags: [reference, gems, clues]
---

# Gem & Clue Mapping Reference

Complete reference for the relationship between gem colors, clue categories, and species database fields.

## Gem Types

The game uses 8 gem colors, loaded as sprites from `public/assets/`:

| Color | Asset Pattern | Frames |
|-------|--------------|--------|
| Black | `black_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Blue | `blue_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Green | `green_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Orange | `orange_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Red | `red_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| White | `white_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Yellow | `yellow_gem_{0-7}.png` | 0=idle, 1-7=explosion |
| Purple | `purple_gem_{0-7}.png` | 0=idle, 1-7=explosion |

**Note:** Pink gem assets exist but are not loaded (`pink` is not in `GEM_TYPES`).

## Color to Category Mapping

```typescript
// src/game/scenes/Game.ts
private gemTypeToCategory: Record<string, GemCategory> = {
  'red': GemCategory.CLASSIFICATION,
  'green': GemCategory.HABITAT,
  'blue': GemCategory.GEOGRAPHIC,
  'orange': GemCategory.MORPHOLOGY,
  'yellow': GemCategory.BEHAVIOR,
  'black': GemCategory.LIFECYCLE,
  'white': GemCategory.CONSERVATION,
  'purple': GemCategory.KEYFACTS
};
```

## Clue Categories

### Classification (Red 🧬)

**Progressive revelation** from broad to specific taxonomy.

| Order | Field | Example Output |
|-------|-------|----------------|
| 1st | `phylum` | "Phylum: CHORDATA" |
| 2nd | `class` | "Class: REPTILIA" |
| 3rd | `order_` | "Order: TESTUDINES" |
| 4th | `family` | "Family: EMYDIDAE" |
| 5th | `genus` | "Genus: Emydoidea" |
| 6th | `sci_name` | "Scientific name: Emydoidea blandingii" |

### Habitat (Green 🌳)

**Source:** Cesium raster data (not database text fields)

Uses `rasterHabitats` from TiTiler COG query. Returns habitat type with percentage coverage.

| Field | Example Output |
|-------|----------------|
| `habitat_type` + `percentage` | "Search Area is 62% Mangroves" |

### Geographic (Blue 🗺️)

**Fields queried in order:**

| Field | Description |
|-------|-------------|
| `geo_desc` | Geographic description |
| `dist_comm` | Distribution comments |
| `hab_desc` | Habitat description text |
| `hab_tags` | Habitat tags |

### Morphology (Orange 🐆)

| Field | Description |
|-------|-------------|
| `pattern` | Body pattern |
| `color_prim` | Primary coloration |
| `color_sec` | Secondary coloration |
| `shape_desc` | Body shape description |
| `size_max` | Maximum size |
| `weight_kg` | Weight in kilograms |

### Behavior & Diet (Yellow 💨)

| Field | Description |
|-------|-------------|
| `behav_1` | Primary behavior |
| `behav_2` | Secondary behavior |
| `diet_type` | Diet classification (Carnivore, etc.) |
| `diet_prey` | Prey species |
| `diet_flora` | Plant diet |

### Life Cycle (Black ⏳)

| Field | Description |
|-------|-------------|
| `life_desc1` | Life cycle description 1 |
| `life_desc2` | Life cycle description 2 |
| `lifespan` | Expected lifespan (fallback) |
| `maturity` | Age at maturity (fallback) |
| `repro_type` | Reproduction type (fallback) |
| `clutch_sz` | Clutch/litter size (fallback) |

### Conservation (White 🛡️)

| Field | Description |
|-------|-------------|
| `cons_text` | Conservation description |
| `threats` | Known threats |
| `cons_code` | IUCN status code (fallback) |
| `category` | Category classification (fallback) |

### Key Facts (Purple 🔮)

| Field | Description |
|-------|-------------|
| `key_fact1` | Key fact 1 |
| `key_fact2` | Key fact 2 |
| `key_fact3` | Key fact 3 |

## Habitat-to-Gem Mapping

For initial board seeding based on location habitats:

```typescript
const HABITAT_GEM_MAP: Record<number, string> = {
  // Forests (100-109) → green
  100: 'green', 101: 'green', 102: 'green',

  // Savannas (200-202) → orange
  200: 'orange', 201: 'orange', 202: 'orange',

  // Shrublands (300-308) → black
  300: 'black', 301: 'black', 302: 'black',

  // Grasslands (400-407) → white
  400: 'white', 401: 'white', 402: 'white',

  // Wetlands (500-518) → blue
  500: 'blue', 501: 'blue', 502: 'blue',

  // Urban/Artificial (1400-1406) → red
  1400: 'red', 1401: 'red', 1402: 'red',
};

// Default for unknown habitat codes
const DEFAULT_GEM = 'white';
```

## UI Color Codes

```typescript
const colorMap: Record<string, string> = {
  'red': '#ef4444',
  'green': '#22c55e',
  'blue': '#3b82f6',
  'orange': '#f97316',
  'yellow': '#eab308',
  'black': '#1f2937',
  'white': '#e5e7eb',
  'purple': '#a855f7'
};
```

## GemCategory Enum

```typescript
export enum GemCategory {
  CLASSIFICATION = 0,
  HABITAT = 1,
  GEOGRAPHIC = 2,
  MORPHOLOGY = 3,
  BEHAVIOR = 4,
  LIFECYCLE = 5,
  CONSERVATION = 6,
  KEYFACTS = 7
}
```

## Clue Configuration

```typescript
// src/game/clueConfig.ts
export const CLUE_CONFIG = {
  categories: {
    [GemCategory.CLASSIFICATION]: {
      displayName: 'Classification',
      icon: '🧬',
      color: 'red',
      fields: ['phylum', 'class', 'order_', 'family', 'genus', 'sci_name']
    },
    [GemCategory.HABITAT]: {
      displayName: 'Habitat',
      icon: '🌳',
      color: 'green',
      fields: []  // Uses raster data
    },
    // ... etc
  }
};
```

## Related Documentation

- [Clue Board Implementation](/docs/guides/game/clue-board)
- [Database Schema](/docs/reference/database-schema)
- [Species Database](/docs/guides/data/species-database)
