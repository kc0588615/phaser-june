# Function: getNextClueForWalletKey()

> **getNextClueForWalletKey**(`clues`, `category`, `processedClueIds`): [`DeductionClue`](../interfaces/DeductionClue.md) \| `null`

Defined in: [src/lib/deductionEngine.ts:224](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/deductionEngine.ts#L224)

Get the next unprocessed deduction clue for a matched board category.

## Parameters

### clues

[`DeductionClue`](../interfaces/DeductionClue.md)[]

### category

[`ClueCategoryKey`](../../../types/expedition/type-aliases/ClueCategoryKey.md)

### processedClueIds

`Set`\<`number`\>

## Returns

[`DeductionClue`](../interfaces/DeductionClue.md) \| `null`
