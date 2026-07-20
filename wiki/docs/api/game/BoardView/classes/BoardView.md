# Class: BoardView

Defined in: [src/game/BoardView.ts:36](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L36)

## Constructors

### Constructor

> **new BoardView**(`scene`, `config`): `BoardView`

Defined in: [src/game/BoardView.ts:49](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L49)

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

Defined in: [src/game/BoardView.ts:337](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L337)

Animates gem explosions. Removes sprites from grid and destroys them.

#### Parameters

##### matchCoords

[`Coordinate`](../../ExplodeAndReplacePhase/type-aliases/Coordinate.md)[]

#### Returns

`Promise`\<`void`\>

***

### animateFalls()

> **animateFalls**(`replacements`, `finalBackendState`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:419](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L419)

Animates existing gems falling and new gems entering. Updates gemsSprites array.

#### Parameters

##### replacements

\[`number`, (`"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]\][]

##### finalBackendState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`Promise`\<`void`\>

***

### createBoard()

> **createBoard**(`initialPuzzleState`): `void`

Defined in: [src/game/BoardView.ts:65](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L65)

Creates the initial sprites based on the model state.

#### Parameters

##### initialPuzzleState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### destroyBoard()

> **destroyBoard**(): `void`

Defined in: [src/game/BoardView.ts:597](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L597)

Destroys all sprites and clears the board representation.

#### Returns

`void`

***

### getGemsSprites()

> **getGemsSprites**(): (`Sprite` \| `null`)[][]

Defined in: [src/game/BoardView.ts:811](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L811)

Returns the 2D array of sprite references.

#### Returns

(`Sprite` \| `null`)[][]

***

### getSpriteAt()

> **getSpriteAt**(`x`, `y`): `Sprite` \| `null`

Defined in: [src/game/BoardView.ts:805](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L805)

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

Defined in: [src/game/BoardView.ts:170](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L170)

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

### setEvidenceFamilyMode()

> **setEvidenceFamilyMode**(`enabled`): `void`

Defined in: [src/game/BoardView.ts:145](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L145)

V3 uses family silhouettes; color is only a secondary cue.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### setSurveyZones()

> **setSurveyZones**(`zones`): `void`

Defined in: [src/game/BoardView.ts:139](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L139)

Sets the survey-verb plot highlights (empty array clears them).

#### Parameters

##### zones

readonly `object`[]

#### Returns

`void`

***

### snapBack()

> **snapBack**(`spritesToSnap`, `startPositions`, `dragDirection`, `totalDeltaX`, `totalDeltaY`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:217](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L217)

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

Defined in: [src/game/BoardView.ts:203](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L203)

Instantly sets dragged sprites to their final grid positions. Assumes gemsSprites array is already updated.

#### Returns

`void`

***

### syncSpritesToGridPositions()

> **syncSpritesToGridPositions**(): `void`

Defined in: [src/game/BoardView.ts:843](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L843)

Utility to sync sprite visual positions to their stored logical grid coords.

#### Returns

`void`

***

### updateDimensions()

> **updateDimensions**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:131](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L131)

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

Defined in: [src/game/BoardView.ts:551](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L551)

Updates the internal gemsSprites array structure after a move.

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

`void`

***

### updateVisualLayout()

> **updateVisualLayout**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:108](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/game/BoardView.ts#L108)

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
