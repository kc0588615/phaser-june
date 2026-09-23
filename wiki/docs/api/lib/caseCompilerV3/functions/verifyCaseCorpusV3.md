# Function: verifyCaseCorpusV3()

> **verifyCaseCorpusV3**(`profiles`, `cardsBySpecies`, `hintsBySpecies`): `object`

Defined in: [phaser-june-039/src/lib/caseCompilerV3.ts:195](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/caseCompilerV3.ts#L195)

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
