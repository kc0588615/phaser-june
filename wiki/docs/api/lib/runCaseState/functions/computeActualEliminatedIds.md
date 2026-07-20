# Function: computeActualEliminatedIds()

> **computeActualEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `compareTag`): `number`[]

Defined in: [src/lib/runCaseState.ts:99](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L99)

Client-safe elimination: compares one public marker across the symmetric candidate profiles.

## Parameters

### profiles

readonly `Pick`\<[`DeductionProfile`](../../deductionEngine/interfaces/DeductionProfile.md), `"habitatTags"` \| `"speciesId"` \| `"morphologyTags"` \| `"dietTags"` \| `"behaviorTags"` \| `"reproductionTags"` \| `"taxonomyTags"` \| `"geographyTags"` \| `"conservationTags"` \| `"keyFactTags"`\>[]

### alreadyEliminatedIds

readonly `number`[]

### traitCategory

`"habitat"` | `"morphology"` | `"diet"` | `"behavior"` | `"reproduction"` | `"taxonomy"` | `"key_fact"` | `"geography"` | `"conservation"`

### compareTag

`string`

## Returns

`number`[]
