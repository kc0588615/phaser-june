# Function: compareReference()

> **compareReference**(`mysteryProfile`, `referenceProfile`, `category`, `compareTags?`): [`ComparisonResult`](../interfaces/ComparisonResult.md)

Defined in: [src/lib/deductionEngine.ts:112](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/deductionEngine.ts#L112)

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
