# Function: compareReference()

> **compareReference**(`mysteryProfile`, `referenceProfile`, `category`, `compareTags?`): [`ComparisonResult`](../interfaces/ComparisonResult.md)

Defined in: [src/lib/deductionEngine.ts:95](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/deductionEngine.ts#L95)

Compare a mystery species against a reference card for a specific category.
Returns whether any tags overlap and which ones matched.

When `compareTags` is supplied (the specific tags a clue concerns), the
comparison is restricted to those tags so the result reflects the clue's
actual subject — preventing spurious matches via unrelated category overlap.

## Parameters

### mysteryProfile

[`DeductionProfile`](../interfaces/DeductionProfile.md)

### referenceProfile

[`DeductionProfile`](../interfaces/DeductionProfile.md)

### category

[`DeductionClueCategory`](../../../db/schema/species/type-aliases/DeductionClueCategory.md)

### compareTags?

`string`[] | `null`

## Returns

[`ComparisonResult`](../interfaces/ComparisonResult.md)
