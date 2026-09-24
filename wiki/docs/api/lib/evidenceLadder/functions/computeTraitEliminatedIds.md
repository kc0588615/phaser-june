# Function: computeTraitEliminatedIds()

> **computeTraitEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `tag`): `number`[]

Defined in: [lib/evidenceLadder.ts:71](https://github.com/kc0588615/phaser-june/blob/main/src/lib/evidenceLadder.ts#L71)

Live candidates whose profile lacks `tag` in the trait category (ladder rungs and hard cards).

## Parameters

### profiles

readonly `Pick`\<[`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md), `"speciesId"`\> & `Partial`\<[`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md)\>[]

### alreadyEliminatedIds

`Iterable`\<`number`\>

### traitCategory

`"behavior"` | `"habitat"` | `"morphology"` | `"diet"` | `"reproduction"` | `"taxonomy"` | `"key_fact"` | `"geography"` | `"conservation"`

### tag

`string`

## Returns

`number`[]
