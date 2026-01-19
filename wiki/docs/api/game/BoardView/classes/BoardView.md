# Class: BoardView

Defined in: [src/game/BoardView.ts:32](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L32)

## Constructors

### Constructor

> **new BoardView**(`scene`, `config`): `BoardView`

Defined in: [src/game/BoardView.ts:41](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L41)

#### Parameters

##### scene

`Scene`

##### config

`BoardConfig`

#### Returns

`BoardView`

## Methods

### animateExplosions()

> **animateExplosions**(`matchCoords`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:296](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L296)

Animates gem explosions. Removes sprites from grid and destroys them.

#### Parameters

##### matchCoords

[`Coordinate`](../../ExplodeAndReplacePhase/type-aliases/Coordinate.md)[]

#### Returns

`Promise`\<`void`\>

***

### animateFalls()

> **animateFalls**(`replacements`, `finalBackendState`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:364](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L364)

Animates existing gems falling and new gems entering. Updates gemsSprites array.

#### Parameters

##### replacements

\[`number`, (`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]\][]

##### finalBackendState

[`PuzzleGrid`](../../BackendPuzzle/type-aliases/PuzzleGrid.md)

#### Returns

`Promise`\<`void`\>

***

### createBoard()

> **createBoard**(`initialPuzzleState`): `void`

Defined in: [src/game/BoardView.ts:57](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L57)

Creates the initial sprites based on the model state.

#### Parameters

##### initialPuzzleState

[`PuzzleGrid`](../../BackendPuzzle/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### destroyBoard()

> **destroyBoard**(): `void`

Defined in: [src/game/BoardView.ts:531](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L531)

Destroys all sprites and clears the board representation.

#### Returns

`void`

***

### getGemsSprites()

> **getGemsSprites**(): (`Sprite` \| `null`)[][]

Defined in: [src/game/BoardView.ts:637](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L637)

Returns the 2D array of sprite references.

#### Returns

(`Sprite` \| `null`)[][]

***

### getSpriteAt()

> **getSpriteAt**(`x`, `y`): `Sprite` \| `null`

Defined in: [src/game/BoardView.ts:631](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L631)

Gets the sprite at [x, y] if active, otherwise null.

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

`Sprite` \| `null`

***

### moveDraggingSprites()

> **moveDraggingSprites**(`spritesToMove`, `startVisualPositions`, `deltaX`, `deltaY`, `direction`): `void`

Defined in: [src/game/BoardView.ts:129](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L129)

Visually moves sprites during drag, handling wrapping.

#### Parameters

##### spritesToMove

`Sprite`[]

##### startVisualPositions

`object`[]

##### deltaX

`number`

##### deltaY

`number`

##### direction

[`MoveDirection`](../../MoveAction/type-aliases/MoveDirection.md)

#### Returns

`void`

***

### snapBack()

> **snapBack**(`spritesToSnap`, `startPositions`, `dragDirection`, `totalDeltaX`, `totalDeltaY`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:176](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L176)

Animates sprites back to their original start positions, sliding the row/column as a unit.

#### Parameters

##### spritesToSnap

`Sprite`[]

##### startPositions

`object`[]

##### dragDirection

[`MoveDirection`](../../MoveAction/type-aliases/MoveDirection.md) | `undefined`

##### totalDeltaX

`number`

##### totalDeltaY

`number`

#### Returns

`Promise`\<`void`\>

***

### snapDraggedGemsToFinalGridPositions()

> **snapDraggedGemsToFinalGridPositions**(): `void`

Defined in: [src/game/BoardView.ts:162](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L162)

Instantly sets dragged sprites to their final grid positions. Assumes gemsSprites array is already updated.

#### Returns

`void`

***

### syncSpritesToGridPositions()

> **syncSpritesToGridPositions**(): `void`

Defined in: [src/game/BoardView.ts:669](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L669)

Utility to sync sprite visual positions to their stored logical grid coords.

#### Returns

`void`

***

### updateDimensions()

> **updateDimensions**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:122](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L122)

Updates dimensions without animation (for use before board recreation).

#### Parameters

##### newGemSize

`number`

##### newBoardOffset

###### x

`number`

###### y

`number`

#### Returns

`void`

***

### updateGemsSpritesArrayAfterMove()

> **updateGemsSpritesArrayAfterMove**(`moveAction`): `void`

Defined in: [src/game/BoardView.ts:485](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L485)

Updates the internal gemsSprites array structure after a move.

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

`void`

***

### updateVisualLayout()

> **updateVisualLayout**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:100](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/game/BoardView.ts#L100)

Updates sprite positions and scales after resize/orientation change.

#### Parameters

##### newGemSize

`number`

##### newBoardOffset

###### x

`number`

###### y

`number`

#### Returns

`void`
