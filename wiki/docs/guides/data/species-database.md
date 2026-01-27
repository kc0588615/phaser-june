---
sidebar_position: 2
title: Species Database
description: Species data schema and sourcing
tags: [guide, database, species]
---

# Species Database Implementation

How species data is structured and sourced.

## Data Source

ICAA (International Conservation Assessment) species data imported into `icaa`, then backfilled into the normalized biodiversity schema and exposed via `icaa_view`.

## Key Fields

See [Database Schema Reference](/docs/reference/database-schema) for full table definition.

## PostGIS Integration

```sql
-- Spatial index
CREATE INDEX ix_taxon_ranges_wkb_geometry ON taxon_ranges USING GIST (wkb_geometry);
```
