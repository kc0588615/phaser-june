# Function: applyEvidenceBundle()

> **applyEvidenceBundle**(`bundle`, `profile`): `object`

Defined in: [src/lib/deductionEngine.ts:239](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/deductionEngine.ts#L239)

Auto-confirm habitat tags on a mystery profile using GIS evidence.
Returns tags that were confirmed (intersection of evidence-derived tags and profile tags).

## Parameters

### bundle

[`RunEvidenceBundle`](../../../types/gis/interfaces/RunEvidenceBundle.md)

### profile

[`DeductionProfile`](../interfaces/DeductionProfile.md)

## Returns

`object`

### confirmedCategories

> **confirmedCategories**: [`DeductionClueCategory`](../../../db/schema/species/type-aliases/DeductionClueCategory.md)[]

### confirmedHabitatTags

> **confirmedHabitatTags**: `string`[]
