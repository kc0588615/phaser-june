---
sidebar_position: 2
title: Bioregion Implementation
description: Technical implementation of bioregions
tags: [guide, bioregion, implementation]
---

# Bioregion Implementation

Technical details for bioregion integration.

## Database

```sql
CREATE TABLE bioregions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  geom GEOMETRY(MULTIPOLYGON, 4326)
);
```

## Querying

```typescript
const { data } = await supabase.rpc('get_species_by_bioregion', {
  bioregion_id: regionId
});
```
