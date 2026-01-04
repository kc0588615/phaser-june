# Class: BackendPuzzle

Defined in: [src/game/BackendPuzzle.ts:14](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L14)

## Constructors

### Constructor

> **new BackendPuzzle**(`width`, `height`): `BackendPuzzle`

Defined in: [src/game/BackendPuzzle.ts:21](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L21)

#### Parameters

##### width

`number`

##### height

`number`

#### Returns

`BackendPuzzle`

## Properties

### height

> `readonly` **height**: `number`

Defined in: [src/game/BackendPuzzle.ts:23](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L23)

***

### width

> `readonly` **width**: `number`

Defined in: [src/game/BackendPuzzle.ts:22](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L22)

## Methods

### addBonusScore()

> **addBonusScore**(`points`): `void`

Defined in: [src/game/BackendPuzzle.ts:66](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L66)

#### Parameters

##### points

`number`

#### Returns

`void`

***

### addNextGemsToSpawn()

> **addNextGemsToSpawn**(`gemTypes`): `void`

Defined in: [src/game/BackendPuzzle.ts:209](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L209)

#### Parameters

##### gemTypes

(`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### Returns

`void`

***

### addNextGemToSpawn()

> **addNextGemToSpawn**(`gemType`): `void`

Defined in: [src/game/BackendPuzzle.ts:205](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L205)

#### Parameters

##### gemType

`"black"` | `"blue"` | `"green"` | `"orange"` | `"red"` | `"white"` | `"yellow"` | `"purple"`

#### Returns

`void`

***

### calculatePhaseBaseScore()

> **calculatePhaseBaseScore**(`phase`): `number`

Defined in: [src/game/BackendPuzzle.ts:79](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L79)

#### Parameters

##### phase

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

#### Returns

`number`

***

### getGridState()

> **getGridState**(): [`PuzzleGrid`](../type-aliases/PuzzleGrid.md)

Defined in: [src/game/BackendPuzzle.ts:62](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L62)

#### Returns

[`PuzzleGrid`](../type-aliases/PuzzleGrid.md)

***

### getMatchesFromHypotheticalMove()

> **getMatchesFromHypotheticalMove**(`moveAction`): [`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

Defined in: [src/game/BackendPuzzle.ts:180](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L180)

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

[`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

***

### getMaxMoves()

> **getMaxMoves**(): `number`

Defined in: [src/game/BackendPuzzle.ts:54](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L54)

#### Returns

`number`

***

### getMovesRemaining()

> **getMovesRemaining**(): `number`

Defined in: [src/game/BackendPuzzle.ts:46](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L46)

#### Returns

`number`

***

### getMovesUsed()

> **getMovesUsed**(): `number`

Defined in: [src/game/BackendPuzzle.ts:50](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L50)

#### Returns

`number`

***

### getNextExplodeAndReplacePhase()

> **getNextExplodeAndReplacePhase**(`actions`): [`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

Defined in: [src/game/BackendPuzzle.ts:143](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L143)

#### Parameters

##### actions

[`MoveAction`](../../MoveAction/classes/MoveAction.md)[]

#### Returns

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

***

### getScore()

> **getScore**(): `number`

Defined in: [src/game/BackendPuzzle.ts:42](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L42)

#### Returns

`number`

***

### isGameOver()

> **isGameOver**(): `boolean`

Defined in: [src/game/BackendPuzzle.ts:58](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L58)

#### Returns

`boolean`

***

### regenerateBoard()

> **regenerateBoard**(): `void`

Defined in: [src/game/BackendPuzzle.ts:35](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L35)

Regenerates the puzzle board with new random gems.
Called when user clicks on the map to start a new game.

#### Returns

`void`

***

### registerMove()

> **registerMove**(): `number`

Defined in: [src/game/BackendPuzzle.ts:70](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L70)

#### Returns

`number`

***

### reset()

> **reset**(): `void`

Defined in: [src/game/BackendPuzzle.ts:213](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L213)

#### Returns

`void`

***

### resetMoves()

> **resetMoves**(): `void`

Defined in: [src/game/BackendPuzzle.ts:75](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/game/BackendPuzzle.ts#L75)

#### Returns

`void`
