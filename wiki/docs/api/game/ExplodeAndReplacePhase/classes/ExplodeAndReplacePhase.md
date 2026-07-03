# Class: ExplodeAndReplacePhase

Defined in: [src/game/ExplodeAndReplacePhase.ts:13](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L13)

Represents the result of applying moves: matches found and replacements needed.

## Constructors

### Constructor

> **new ExplodeAndReplacePhase**(`matches`, `replacements`, `matchGridState`): `ExplodeAndReplacePhase`

Defined in: [src/game/ExplodeAndReplacePhase.ts:19](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L19)

Creates an ExplodeAndReplacePhase result.

#### Parameters

##### matches

[`Match`](../type-aliases/Match.md)[] = `[]`

The coordinates of matched gems.

##### replacements

[`ColumnReplacement`](../type-aliases/ColumnReplacement.md)[] = `[]`

The new gems needed per column.

##### matchGridState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md) | `null`

#### Returns

`ExplodeAndReplacePhase`

## Properties

### matches

> `readonly` **matches**: [`Match`](../type-aliases/Match.md)[] = `[]`

Defined in: [src/game/ExplodeAndReplacePhase.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L20)

The coordinates of matched gems.

***

### matchGridState

> `readonly` **matchGridState**: [`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md) \| `null` = `null`

Defined in: [src/game/ExplodeAndReplacePhase.ts:22](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L22)

***

### replacements

> `readonly` **replacements**: [`ColumnReplacement`](../type-aliases/ColumnReplacement.md)[] = `[]`

Defined in: [src/game/ExplodeAndReplacePhase.ts:21](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L21)

The new gems needed per column.

## Methods

### getAllMatchedCoordinates()

> **getAllMatchedCoordinates**(): `Set`\<`string`\>

Defined in: [src/game/ExplodeAndReplacePhase.ts:36](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L36)

Gets all unique coordinates from all matches

#### Returns

`Set`\<`string`\>

***

### getReplacementsForColumn()

> **getReplacementsForColumn**(`columnIndex`): (`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

Defined in: [src/game/ExplodeAndReplacePhase.ts:56](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L56)

Gets replacement gems for a specific column

#### Parameters

##### columnIndex

`number`

#### Returns

(`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

***

### getTotalReplacements()

> **getTotalReplacements**(): `number`

Defined in: [src/game/ExplodeAndReplacePhase.ts:49](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L49)

Gets the total number of gems that will be replaced

#### Returns

`number`

***

### isNothingToDo()

> **isNothingToDo**(): `boolean`

Defined in: [src/game/ExplodeAndReplacePhase.ts:29](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/ExplodeAndReplacePhase.ts#L29)

Checks if any matches occurred in this phase.

#### Returns

`boolean`

True if there were no matches.
