# Function: verifyCaseCorpusV3()

> **verifyCaseCorpusV3**(`profiles`, `cardsBySpecies`, `hintsBySpecies`): `object`

Defined in: [src/lib/caseCompilerV3.ts:139](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/caseCompilerV3.ts#L139)

## Parameters

### profiles

readonly [`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md)[]

### cardsBySpecies

`ReadonlyMap`\<`number`, readonly [`CompilerEvidenceFamilyCard`](../interfaces/CompilerEvidenceFamilyCard.md)[]\>

### hintsBySpecies

`ReadonlyMap`\<`number`, readonly [`CompilerEvidenceFamilyHint`](../interfaces/CompilerEvidenceFamilyHint.md)[]\>

## Returns

`object`

### errors

> **errors**: `string`[]

### pathCount

> **pathCount**: `number`

### residualCounts

> **residualCounts**: `Record`\<`number`, `number`\>

### warnings

> **warnings**: `string`[]
