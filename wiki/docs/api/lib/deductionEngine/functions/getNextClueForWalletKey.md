# Function: getNextClueForWalletKey()

> **getNextClueForWalletKey**(`clues`, `category`, `processedClueIds`): [`DeductionClue`](../interfaces/DeductionClue.md) \| `null`

Defined in: [src/lib/deductionEngine.ts:224](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/deductionEngine.ts#L224)

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
