# Class: BackendPuzzle

Defined in: [src/game/BackendPuzzle.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L20)

## Constructors

### Constructor

> **new BackendPuzzle**(`width`, `height`): `BackendPuzzle`

Defined in: [src/game/BackendPuzzle.ts:30](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L30)

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

Defined in: [src/game/BackendPuzzle.ts:32](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L32)

***

### width

> `readonly` **width**: `number`

Defined in: [src/game/BackendPuzzle.ts:31](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L31)

## Methods

### addBonusScore()

> **addBonusScore**(`points`): `void`

Defined in: [src/game/BackendPuzzle.ts:103](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L103)

#### Parameters

##### points

`number`

#### Returns

`void`

***

### addNextGemsToSpawn()

> **addNextGemsToSpawn**(`gemTypes`): `void`

Defined in: [src/game/BackendPuzzle.ts:424](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L424)

#### Parameters

##### gemTypes

(`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### Returns

`void`

***

### addNextGemToSpawn()

> **addNextGemToSpawn**(`gemType`): `void`

Defined in: [src/game/BackendPuzzle.ts:420](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L420)

#### Parameters

##### gemType

`"sword"` | `"staff"` | `"shield"` | `"key"` | `"crate"` | `"power"` | `"thought"` | `"multiplier"` | `"grenade"` | `"blade_drive"` | `"caltrops"` | `"shield_unit"` | `"black"` | `"blue"` | `"green"` | `"orange"` | `"red"` | `"white"` | `"yellow"` | `"purple"`

#### Returns

`void`

***

### applyCellStateSeeds()

> **applyCellStateSeeds**(`seeds`): `void`

Defined in: [src/game/BackendPuzzle.ts:116](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L116)

#### Parameters

##### seeds

[`CellStateSeed`](../../nodeObstacles/interfaces/CellStateSeed.md)[]

#### Returns

`void`

***

### calculatePhaseBaseScore()

> **calculatePhaseBaseScore**(`phase`): `number`

Defined in: [src/game/BackendPuzzle.ts:127](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L127)

#### Parameters

##### phase

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

#### Returns

`number`

***

### clearCellDebuff()

> **clearCellDebuff**(`x`, `y`): `boolean`

Defined in: [src/game/BackendPuzzle.ts:472](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L472)

Clear a single cell's debuff, assigning a FRESH state object (matchGridState clone is shallow).

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`boolean`

***

### consumeCleanseCount()

> **consumeCleanseCount**(): `number`

Defined in: [src/game/BackendPuzzle.ts:485](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L485)

Number of debuffs cleansed since the last consume; consume reads and resets it.

#### Returns

`number`

***

### damageBlocker()

> **damageBlocker**(`x`, `y`): `boolean`

Defined in: [src/game/BackendPuzzle.ts:458](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L458)

Damage a blocker at (x,y). Returns true if the blocker was destroyed.

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`boolean`

***

### getGridState()

> **getGridState**(): [`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

Defined in: [src/game/BackendPuzzle.ts:93](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L93)

#### Returns

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

***

### getMatchesFromHypotheticalMove()

> **getMatchesFromHypotheticalMove**(`moveAction`): [`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

Defined in: [src/game/BackendPuzzle.ts:242](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L242)

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

[`Match`](../../ExplodeAndReplacePhase/type-aliases/Match.md)[]

***

### getMovesUsed()

> **getMovesUsed**(): `number`

Defined in: [src/game/BackendPuzzle.ts:84](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L84)

#### Returns

`number`

***

### getNextExplodeAndReplacePhase()

> **getNextExplodeAndReplacePhase**(`actions`): [`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

Defined in: [src/game/BackendPuzzle.ts:204](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L204)

#### Parameters

##### actions

[`MoveAction`](../../MoveAction/classes/MoveAction.md)[]

#### Returns

[`ExplodeAndReplacePhase`](../../ExplodeAndReplacePhase/classes/ExplodeAndReplacePhase.md)

***

### getScore()

> **getScore**(): `number`

Defined in: [src/game/BackendPuzzle.ts:80](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L80)

#### Returns

`number`

***

### getSnippetPreview()

> **getSnippetPreview**(`count`): (`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

Defined in: [src/game/BackendPuzzle.ts:97](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L97)

#### Parameters

##### count

`number` = `...`

#### Returns

(`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

***

### hasAnyValidMove()

> **hasAnyValidMove**(): `boolean`

Defined in: [src/game/BackendPuzzle.ts:369](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L369)

Check if any adjacent swap produces a match.

#### Returns

`boolean`

***

### isGameOver()

> **isGameOver**(): `boolean`

Defined in: [src/game/BackendPuzzle.ts:88](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L88)

#### Returns

`boolean`

***

### regenerateBoard()

> **regenerateBoard**(): `void`

Defined in: [src/game/BackendPuzzle.ts:70](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L70)

Regenerates the puzzle board with new random gems.
Called when user clicks on the map to start a new game.

#### Returns

`void`

***

### registerMove()

> **registerMove**(): `number`

Defined in: [src/game/BackendPuzzle.ts:107](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L107)

#### Returns

`number`

***

### reset()

> **reset**(): `void`

Defined in: [src/game/BackendPuzzle.ts:428](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L428)

#### Returns

`void`

***

### resetMoves()

> **resetMoves**(): `void`

Defined in: [src/game/BackendPuzzle.ts:112](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L112)

#### Returns

`void`

***

### setGemPool()

> **setGemPool**(`config`): `void`

Defined in: [src/game/BackendPuzzle.ts:40](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L40)

#### Parameters

##### config

[`BoardSpawnConfig`](../../../expedition/domain/interfaces/BoardSpawnConfig.md)

#### Returns

`void`

***

### setMatchBattleConfig()

> **setMatchBattleConfig**(`config`): `void`

Defined in: [src/game/BackendPuzzle.ts:49](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L49)

#### Parameters

##### config

[`MatchBattleBoardConfig`](../../matchBattle/types/interfaces/MatchBattleBoardConfig.md)

#### Returns

`void`

***

### shuffle()

> **shuffle**(): `void`

Defined in: [src/game/BackendPuzzle.ts:386](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BackendPuzzle.ts#L386)

Shuffle gem cells in place (Fisher-Yates), preserving slot states and cell ids. Repeats until at least one valid move exists.

#### Returns

`void`
