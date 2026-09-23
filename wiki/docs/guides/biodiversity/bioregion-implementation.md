---
sidebar_position: 2
title: Bioregion Implementation
description: Technical implementation of bioregions
tags: [guide, bioregion, implementation]
---

# Bioregion Implementation

Technical details for bioregion integration.

## Database

Bioregion fields are stored in normalized tables (`taxon_bioregions` + `oneearth_bioregion`) and exposed via `icaa_view`.
Reference polygons live in `oneearth_bioregion` for offline processing or reclassification.

## Querying

```typescript
// Species rows from /api/species/by-ids include bioregion, realm, subrealm, biome.
const response = await fetch(`/api/species/by-ids?ids=${ids.join(',')}`);
const { species } = await response.json();
```
