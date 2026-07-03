# Function: getNextClue()

> **getNextClue**(`clues`, `category`, `processedClueIds`): [`DeductionClue`](../interfaces/DeductionClue.md) \| `null`

Defined in: [src/lib/deductionEngine.ts:187](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/deductionEngine.ts#L187)

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
