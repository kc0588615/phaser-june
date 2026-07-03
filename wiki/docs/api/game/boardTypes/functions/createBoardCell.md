# Function: createBoardCell()

> **createBoardCell**(`gemType`, `state?`, `meta?`): [`BoardCell`](../interfaces/BoardCell.md)

Defined in: [src/game/boardTypes.ts:29](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L29)

## Parameters

### gemType

`"sword"` | `"staff"` | `"shield"` | `"key"` | `"crate"` | `"power"` | `"thought"` | `"multiplier"` | `"grenade"` | `"blade_drive"` | `"caltrops"` | `"shield_unit"` | `"black"` | `"blue"` | `"green"` | `"orange"` | `"red"` | `"white"` | `"yellow"` | `"purple"`

### state?

[`BoardCellState`](../interfaces/BoardCellState.md)

### meta?

`Partial`\<`Omit`\<[`BoardCell`](../interfaces/BoardCell.md), `"id"` \| `"family"` \| `"gemType"` \| `"state"`\>\>

## Returns

[`BoardCell`](../interfaces/BoardCell.md)
