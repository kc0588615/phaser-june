# Function: filterCandidates()

> **filterCandidates**(`allProfiles`, `confirmedTags`, `eliminatedSpeciesIds`): [`DeductionProfile`](../interfaces/DeductionProfile.md)[]

Defined in: [src/lib/deductionEngine.ts:157](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/deductionEngine.ts#L157)

Given all species profiles and a set of confirmed tag matches,
return profiles that satisfy ALL confirmed constraints.

confirmedTags: Record\<category, tags[]\> — each entry means
"the mystery species has these tags in this category".

eliminatedSpeciesIds: species explicitly ruled out via negative confirmation.

## Parameters

### allProfiles

[`DeductionProfile`](../interfaces/DeductionProfile.md)[]

### confirmedTags

`Partial`\<`Record`\<[`DeductionClueCategory`](../../../db/schema/species/type-aliases/DeductionClueCategory.md), `string`[]\>\>

### eliminatedSpeciesIds

`Set`\<`number`\>

## Returns

[`DeductionProfile`](../interfaces/DeductionProfile.md)[]
