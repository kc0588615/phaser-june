# Function: verifyCaseCorpusV3()

> **verifyCaseCorpusV3**(`profiles`, `cardsBySpecies`, `hintsBySpecies`): `object`

Defined in: [lib/caseCompilerV3.ts:191](https://github.com/kc0588615/phaser-june/blob/main/src/lib/caseCompilerV3.ts#L191)

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
