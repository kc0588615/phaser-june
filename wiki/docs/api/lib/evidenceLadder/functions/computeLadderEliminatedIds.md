# Function: computeLadderEliminatedIds()

> **computeLadderEliminatedIds**(`profiles`, `alreadyEliminatedIds`, `traitCategory`, `weakTag`): `number`[]

Defined in: [lib/evidenceLadder.ts:71](https://github.com/kc0588615/phaser-june/blob/main/src/lib/evidenceLadder.ts#L71)

Live candidates lacking the rung tag in the family's trait category.

## Parameters

### profiles

readonly `Pick`\<[`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md), `"speciesId"`\> & `Partial`\<[`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md)\>[]

### alreadyEliminatedIds

`Iterable`\<`number`\>

### traitCategory

`"behavior"` | `"habitat"` | `"morphology"` | `"diet"` | `"reproduction"` | `"taxonomy"` | `"key_fact"` | `"geography"` | `"conservation"`

### weakTag

`string`

## Returns

`number`[]
