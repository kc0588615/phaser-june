# Function: verifyCaseCorpusV3()

> **verifyCaseCorpusV3**(`profiles`, `cardsBySpecies`, `hintsBySpecies`): `object`

Defined in: [src/lib/caseCompilerV3.ts:139](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/caseCompilerV3.ts#L139)

## Parameters

### profiles

readonly [`CompilerSpeciesProfile`](../../caseCompiler/interfaces/CompilerSpeciesProfile.md)[]

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
