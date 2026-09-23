# Function: computeActualEliminatedIds()

> **computeActualEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `compareTag`): `number`[]

Defined in: [lib/runCaseState.ts:50](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runCaseState.ts#L50)

Server-authoritative elimination: compares one private marker across symmetric candidate profiles.

## Parameters

### profiles

readonly `Pick`\<[`DeductionProfile`](../../deductionEngine/interfaces/DeductionProfile.md), `"habitatTags"` \| `"speciesId"` \| `"morphologyTags"` \| `"dietTags"` \| `"behaviorTags"` \| `"reproductionTags"` \| `"taxonomyTags"` \| `"geographyTags"` \| `"conservationTags"` \| `"keyFactTags"`\>[]

### alreadyEliminatedIds

readonly `number`[]

### traitCategory

`"behavior"` | `"habitat"` | `"morphology"` | `"diet"` | `"reproduction"` | `"taxonomy"` | `"key_fact"` | `"geography"` | `"conservation"`

### compareTag

`string`

## Returns

`number`[]
