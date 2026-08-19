# Function: applyEvidenceBundle()

> **applyEvidenceBundle**(`bundle`, `profile`): `object`

Defined in: [src/lib/deductionEngine.ts:277](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/deductionEngine.ts#L277)

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
