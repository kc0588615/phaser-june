# Function: validateFamilyLadder()

> **validateFamilyLadder**(`answerId`, `card`, `rungs`, `profiles`, `options`): `string`[]

Defined in: [phaser-june-039/src/lib/evidenceLadder.ts:183](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceLadder.ts#L183)

Safety (always): every rung tag is canonical for the card's category, present
in the answer profile (answer never eliminated), leaves 2–5 survivors on its
own, and the cumulative survivor set never grows.
Quality (strict): each rung removes at least one more candidate than the rung
before it, so the ladder actually narrows.

## Parameters

### answerId

`number`

### card

[`LadderCard`](../interfaces/LadderCard.md)

### rungs

readonly [`LadderRung`](../interfaces/LadderRung.md)[]

### profiles

readonly [`CompilerSpeciesProfile`](../../caseTraits/interfaces/CompilerSpeciesProfile.md)[]

### options

#### strict

`boolean`

## Returns

`string`[]
