# Function: computeActualEliminatedIds()

> **computeActualEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `compareTag`): `number`[]

Defined in: [phaser-june-039/src/lib/runCaseState.ts:50](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runCaseState.ts#L50)

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
