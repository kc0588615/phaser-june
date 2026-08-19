# Function: computeActualEliminatedIds()

> **computeActualEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `compareTag`): `number`[]

Defined in: [src/lib/runCaseState.ts:62](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runCaseState.ts#L62)

Client-safe elimination: compares one public marker across the symmetric candidate profiles.

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
