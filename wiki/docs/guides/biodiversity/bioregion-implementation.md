---
sidebar_position: 2
title: Bioregion Implementation
description: Technical implementation of bioregions
tags: [guide, bioregion, implementation]
---

# Bioregion Implementation

Technical details for bioregion integration.

## Database

Bioregion fields are stored directly on `icaa` (`bioregio_1`, `realm`, `sub_realm`, `biome`).
Reference polygons live in `oneearth_bioregion` for offline processing or reclassification.

## Querying

```typescript
const response = await fetch(`/api/species/bioregions?ids=${ids.join(',')}`);
const data = await response.json();
```
