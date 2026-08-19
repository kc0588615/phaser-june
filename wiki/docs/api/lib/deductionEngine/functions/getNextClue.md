# Function: getNextClue()

> **getNextClue**(`clues`, `category`, `processedClueIds`): [`DeductionClue`](../interfaces/DeductionClue.md) \| `null`

Defined in: [src/lib/deductionEngine.ts:202](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/deductionEngine.ts#L202)

Get the next unprocessed clue for a category, respecting reveal_order

## Parameters

### clues

[`DeductionClue`](../interfaces/DeductionClue.md)[]

### category

[`DeductionClueCategory`](../../../db/schema/species/type-aliases/DeductionClueCategory.md)

### processedClueIds

`Set`\<`number`\>

## Returns

[`DeductionClue`](../interfaces/DeductionClue.md) \| `null`
