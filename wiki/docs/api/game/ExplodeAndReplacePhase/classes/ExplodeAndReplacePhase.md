# Class: ExplodeAndReplacePhase

Defined in: [src/game/ExplodeAndReplacePhase.ts:12](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L12)

Represents the result of applying moves: matches found and replacements needed.

## Constructors

### Constructor

> **new ExplodeAndReplacePhase**(`matches`, `replacements`): `ExplodeAndReplacePhase`

Defined in: [src/game/ExplodeAndReplacePhase.ts:18](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L18)

Creates an ExplodeAndReplacePhase result.

#### Parameters

##### matches

[`Match`](../type-aliases/Match.md)[] = `[]`

The coordinates of matched gems.

##### replacements

[`ColumnReplacement`](../type-aliases/ColumnReplacement.md)[] = `[]`

The new gems needed per column.

#### Returns

`ExplodeAndReplacePhase`

## Properties

### matches

> `readonly` **matches**: [`Match`](../type-aliases/Match.md)[] = `[]`

Defined in: [src/game/ExplodeAndReplacePhase.ts:19](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L19)

The coordinates of matched gems.

***

### replacements

> `readonly` **replacements**: [`ColumnReplacement`](../type-aliases/ColumnReplacement.md)[] = `[]`

Defined in: [src/game/ExplodeAndReplacePhase.ts:20](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L20)

The new gems needed per column.

## Methods

### getAllMatchedCoordinates()

> **getAllMatchedCoordinates**(): `Set`\<`string`\>

Defined in: [src/game/ExplodeAndReplacePhase.ts:34](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L34)

Gets all unique coordinates from all matches

#### Returns

`Set`\<`string`\>

***

### getReplacementsForColumn()

> **getReplacementsForColumn**(`columnIndex`): (`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

Defined in: [src/game/ExplodeAndReplacePhase.ts:54](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L54)

Gets replacement gems for a specific column

#### Parameters

##### columnIndex

`number`

#### Returns

(`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

***

### getTotalReplacements()

> **getTotalReplacements**(): `number`

Defined in: [src/game/ExplodeAndReplacePhase.ts:47](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L47)

Gets the total number of gems that will be replaced

#### Returns

`number`

***

### isNothingToDo()

> **isNothingToDo**(): `boolean`

Defined in: [src/game/ExplodeAndReplacePhase.ts:27](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/ExplodeAndReplacePhase.ts#L27)

Checks if any matches occurred in this phase.

#### Returns

`boolean`

True if there were no matches.
