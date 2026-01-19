---
sidebar_position: 2
title: Species Database
description: Species data schema and sourcing
tags: [guide, database, species]
---

# Species Database Implementation

How species data is structured and sourced.

## Data Source

ICAA (International Conservation Assessment) species data.

## Key Fields

See [Database Schema Reference](/docs/reference/database-schema) for full table definition.

## PostGIS Integration

```sql
-- Spatial index
CREATE INDEX idx_icaa_geometry ON icaa USING GIST (wkb_geometry);
```
