# Class: BackendPuzzle

Defined in: [src/game/BackendPuzzle.ts:28](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L28)

## Constructors

### Constructor

> **new BackendPuzzle**(`width`, `height`): `BackendPuzzle`

Defined in: [src/game/BackendPuzzle.ts:38](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L38)

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

Defined in: [src/game/BackendPuzzle.ts:40](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L40)

***

### width

> `readonly` **width**: `number`

Defined in: [src/game/BackendPuzzle.ts:39](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L39)

## Methods

### addBonusScore()

> **addBonusScore**(`points`): `void`

Defined in: [src/game/BackendPuzzle.ts:137](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L137)

#### Parameters

##### points

`number`

#### Returns

`void`

***

### addNextGemsToSpawn()

> **addNextGemsToSpawn**(`gemTypes`): `void`

Defined in: [src/game/BackendPuzzle.ts:366](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L366)

#### Parameters

##### gemTypes

(`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### Returns

`void`

***

### addNextGemToSpawn()

> **addNextGemToSpawn**(`gemType`): `void`

Defined in: [src/game/BackendPuzzle.ts:362](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L362)

#### Parameters

##### gemType

`"black"` | `"blue"` | `"green"` | `"orange"` | `"red"` | `"white"` | `"yellow"` | `"purple"`

#### Returns

`void`

***

### applyCellStateSeeds()

> **applyCellStateSeeds**(`seeds`): `void`

Defined in: [src/game/BackendPuzzle.ts:154](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L154)

#### Parameters

##### seeds

[`CellStateSeed`](../../nodeObstacles/interfaces/CellStateSeed.md)[]

#### Returns

`void`

***

### calculatePhaseBaseScore()

> **calculatePhaseBaseScore**(`phase`): `number`

Defined in: [src/game/BackendPuzzle.ts:165](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L165)

#### Parameters

##### phase

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

#### Returns

`number`

***

### damageBlocker()

> **damageBlocker**(`x`, `y`): `boolean`

Defined in: [src/game/BackendPuzzle.ts:420](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L420)

Damage a blocker at (x,y). Returns true if the blocker was destroyed.

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`boolean`

***

### exportCheckpoint()

> **exportCheckpoint**(): [`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

Defined in: [src/game/BackendPuzzle.ts:104](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L104)

#### Returns

[`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

***

### getGridState()

> **getGridState**(): [`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

Defined in: [src/game/BackendPuzzle.ts:100](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L100)

#### Returns

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

***

### getMatchesFromHypotheticalMove()

> **getMatchesFromHypotheticalMove**(`moveAction`): [`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

Defined in: [src/game/BackendPuzzle.ts:276](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L276)

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

[`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

***

### getMaxMoves()

> **getMaxMoves**(): `number`

Defined in: [src/game/BackendPuzzle.ts:92](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L92)

#### Returns

`number`

***

### getMovesRemaining()

> **getMovesRemaining**(): `number`

Defined in: [src/game/BackendPuzzle.ts:84](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L84)

#### Returns

`number`

***

### getMovesUsed()

> **getMovesUsed**(): `number`

Defined in: [src/game/BackendPuzzle.ts:88](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L88)

#### Returns

`number`

***

### getNextExplodeAndReplacePhase()

> **getNextExplodeAndReplacePhase**(`actions`): [`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

Defined in: [src/game/BackendPuzzle.ts:238](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L238)

#### Parameters

##### actions

[`MoveAction`](../../MoveAction/classes/MoveAction.md)[]

#### Returns

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

***

### getScore()

> **getScore**(): `number`

Defined in: [src/game/BackendPuzzle.ts:80](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L80)

#### Returns

`number`

***

### hasAnyValidMove()

> **hasAnyValidMove**(): `boolean`

Defined in: [src/game/BackendPuzzle.ts:321](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L321)

Check if any single-cell row/col shift produces a match.

#### Returns

`boolean`

***

### importCheckpoint()

> **importCheckpoint**(`value`): `void`

Defined in: [src/game/BackendPuzzle.ts:120](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L120)

#### Parameters

##### value

`unknown`

#### Returns

`void`

***

### isGameOver()

> **isGameOver**(): `boolean`

Defined in: [src/game/BackendPuzzle.ts:96](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L96)

#### Returns

`boolean`

***

### regenerateBoard()

> **regenerateBoard**(): `void`

Defined in: [src/game/BackendPuzzle.ts:71](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L71)

Regenerates the puzzle board with new random gems.
Called when user clicks on the map to start a new game.

#### Returns

`void`

***

### registerMove()

> **registerMove**(): `number`

Defined in: [src/game/BackendPuzzle.ts:141](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L141)

#### Returns

`number`

***

### reset()

> **reset**(): `void`

Defined in: [src/game/BackendPuzzle.ts:370](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L370)

#### Returns

`void`

***

### resetMoves()

> **resetMoves**(): `void`

Defined in: [src/game/BackendPuzzle.ts:146](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L146)

#### Returns

`void`

***

### setGemPool()

> **setGemPool**(`config`): `void`

Defined in: [src/game/BackendPuzzle.ts:48](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L48)

#### Parameters

##### config

[`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### Returns

`void`

***

### setMaxMoves()

> **setMaxMoves**(`max`): `void`

Defined in: [src/game/BackendPuzzle.ts:150](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L150)

#### Parameters

##### max

`number`

#### Returns

`void`

***

### setSeed()

> **setSeed**(`seed`): `void`

Defined in: [src/game/BackendPuzzle.ts:59](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L59)

#### Parameters

##### seed

`number`

#### Returns

`void`

***

### shuffle()

> **shuffle**(): `void`

Defined in: [src/game/BackendPuzzle.ts:338](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/game/BackendPuzzle.ts#L338)

Shuffle all gem types in place (Fisher-Yates), preserving cell states. Repeats until at least one valid move exists.

#### Returns

`void`
