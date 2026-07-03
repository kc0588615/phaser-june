# Interface: BoardCell

Defined in: [src/game/boardTypes.ts:14](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L14)

## Properties

### family

> **family**: [`GemFamily`](../../../expedition/domain/type-aliases/GemFamily.md)

Defined in: [src/game/boardTypes.ts:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L15)

***

### gemType

> **gemType**: `"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`

Defined in: [src/game/boardTypes.ts:16](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L16)

***

### id?

> `optional` **id**: `number`

Defined in: [src/game/boardTypes.ts:22](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L22)

Stable id minted at creation; survives cloneGridState spreads so consumers can dedupe across cascades.

***

### level?

> `optional` **level**: `number`

Defined in: [src/game/boardTypes.ts:18](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L18)

***

### pieceId?

> `optional` **pieceId**: `"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"`

Defined in: [src/game/boardTypes.ts:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L17)

***

### state?

> `optional` **state**: [`BoardCellState`](BoardCellState.md)

Defined in: [src/game/boardTypes.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L20)

***

### trigger?

> `optional` **trigger**: [`PieceTrigger`](../../matchBattle/types/type-aliases/PieceTrigger.md)

Defined in: [src/game/boardTypes.ts:19](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/boardTypes.ts#L19)
