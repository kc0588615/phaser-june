# Class: BackendPuzzle

Defined in: [game/BackendPuzzle.ts:28](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L28)

## Constructors

### Constructor

> **new BackendPuzzle**(`width`, `height`): `BackendPuzzle`

Defined in: [game/BackendPuzzle.ts:39](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L39)

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

Defined in: [game/BackendPuzzle.ts:41](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L41)

***

### width

> `readonly` **width**: `number`

Defined in: [game/BackendPuzzle.ts:40](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L40)

## Methods

### addBonusScore()

> **addBonusScore**(`points`): `void`

Defined in: [game/BackendPuzzle.ts:141](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L141)

#### Parameters

##### points

`number`

#### Returns

`void`

***

### addNextGemsToSpawn()

> **addNextGemsToSpawn**(`gemTypes`): `void`

Defined in: [game/BackendPuzzle.ts:374](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L374)

#### Parameters

##### gemTypes

(`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### Returns

`void`

***

### applyCellStateSeeds()

> **applyCellStateSeeds**(`seeds`): `void`

Defined in: [game/BackendPuzzle.ts:166](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L166)

#### Parameters

##### seeds

[`CellStateSeed`](../../nodeObstacles/interfaces/CellStateSeed.md)[]

#### Returns

`void`

***

### calculatePhaseBaseScore()

> **calculatePhaseBaseScore**(`phase`): `number`

Defined in: [game/BackendPuzzle.ts:177](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L177)

#### Parameters

##### phase

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

#### Returns

`number`

***

### damageBlocker()

> **damageBlocker**(`x`, `y`): `boolean`

Defined in: [game/BackendPuzzle.ts:429](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L429)

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

Defined in: [game/BackendPuzzle.ts:106](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L106)

#### Returns

[`BoardCheckpointV1`](../../boardTypes/interfaces/BoardCheckpointV1.md)

***

### getGridState()

> **getGridState**(): [`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

Defined in: [game/BackendPuzzle.ts:102](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L102)

#### Returns

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

***

### getMatchesFromHypotheticalMove()

> **getMatchesFromHypotheticalMove**(`moveAction`): [`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

Defined in: [game/BackendPuzzle.ts:288](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L288)

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

[`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

***

### getMaxMoves()

> **getMaxMoves**(): `number`

Defined in: [game/BackendPuzzle.ts:94](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L94)

#### Returns

`number`

***

### getMovesRemaining()

> **getMovesRemaining**(): `number`

Defined in: [game/BackendPuzzle.ts:86](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L86)

#### Returns

`number`

***

### getMovesUsed()

> **getMovesUsed**(): `number`

Defined in: [game/BackendPuzzle.ts:90](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L90)

#### Returns

`number`

***

### getNextExplodeAndReplacePhase()

> **getNextExplodeAndReplacePhase**(`actions`): [`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

Defined in: [game/BackendPuzzle.ts:250](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L250)

#### Parameters

##### actions

[`MoveAction`](../../MoveAction/classes/MoveAction.md)[]

#### Returns

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

***

### getScore()

> **getScore**(): `number`

Defined in: [game/BackendPuzzle.ts:82](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L82)

#### Returns

`number`

***

### hasAnyValidMove()

> **hasAnyValidMove**(): `boolean`

Defined in: [game/BackendPuzzle.ts:333](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L333)

Check if any single-cell row/col shift produces a match.

#### Returns

`boolean`

***

### hasFieldSignalSpawned()

> **hasFieldSignalSpawned**(): `boolean`

Defined in: [game/BackendPuzzle.ts:158](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L158)

#### Returns

`boolean`

***

### importCheckpoint()

> **importCheckpoint**(`value`): `void`

Defined in: [game/BackendPuzzle.ts:123](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L123)

#### Parameters

##### value

`unknown`

#### Returns

`void`

***

### isGameOver()

> **isGameOver**(): `boolean`

Defined in: [game/BackendPuzzle.ts:98](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L98)

#### Returns

`boolean`

***

### markFieldSignalSpawned()

> **markFieldSignalSpawned**(): `void`

Defined in: [game/BackendPuzzle.ts:162](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L162)

#### Returns

`void`

***

### regenerateBoard()

> **regenerateBoard**(): `void`

Defined in: [game/BackendPuzzle.ts:72](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L72)

Regenerates the puzzle board with new random gems.
Called when user clicks on the map to start a new game.

#### Returns

`void`

***

### registerMove()

> **registerMove**(): `number`

Defined in: [game/BackendPuzzle.ts:145](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L145)

#### Returns

`number`

***

### reset()

> **reset**(): `void`

Defined in: [game/BackendPuzzle.ts:378](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L378)

#### Returns

`void`

***

### resetMoves()

> **resetMoves**(): `void`

Defined in: [game/BackendPuzzle.ts:150](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L150)

#### Returns

`void`

***

### setGemPool()

> **setGemPool**(`config`): `void`

Defined in: [game/BackendPuzzle.ts:49](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L49)

#### Parameters

##### config

[`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### Returns

`void`

***

### setMaxMoves()

> **setMaxMoves**(`max`): `void`

Defined in: [game/BackendPuzzle.ts:154](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L154)

#### Parameters

##### max

`number`

#### Returns

`void`

***

### setSeed()

> **setSeed**(`seed`): `void`

Defined in: [game/BackendPuzzle.ts:60](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L60)

#### Parameters

##### seed

`number`

#### Returns

`void`

***

### shuffle()

> **shuffle**(): `void`

Defined in: [game/BackendPuzzle.ts:350](https://github.com/kc0588615/phaser-june/blob/main/src/game/BackendPuzzle.ts#L350)

Shuffle all gem types in place (Fisher-Yates), preserving cell states. Repeats until at least one valid move exists.

#### Returns

`void`
