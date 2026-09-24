# Class: BoardView

Defined in: [game/BoardView.ts:38](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L38)

## Constructors

### Constructor

> **new BoardView**(`scene`, `config`): `BoardView`

Defined in: [game/BoardView.ts:54](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L54)

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

Defined in: [game/BoardView.ts:411](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L411)

Animates gem explosions. Removes sprites from grid and destroys them.

#### Parameters

##### matchCoords

[`Coordinate`](../../ExplodeAndReplacePhase/type-aliases/Coordinate.md)[]

#### Returns

`Promise`\<`void`\>

***

### animateFalls()

> **animateFalls**(`replacements`, `finalBackendState`): `Promise`\<`void`\>

Defined in: [game/BoardView.ts:493](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L493)

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

Defined in: [game/BoardView.ts:70](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L70)

Creates the initial sprites based on the model state.

#### Parameters

##### initialPuzzleState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### destroyBoard()

> **destroyBoard**(): `void`

Defined in: [game/BoardView.ts:671](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L671)

Destroys all sprites and clears the board representation.

#### Returns

`void`

***

### getGemsSprites()

> **getGemsSprites**(): (`Sprite` \| `null`)[][]

Defined in: [game/BoardView.ts:902](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L902)

Returns the 2D array of sprite references.

#### Returns

(`Sprite` \| `null`)[][]

***

### getSpriteAt()

> **getSpriteAt**(`x`, `y`): `Sprite` \| `null`

Defined in: [game/BoardView.ts:896](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L896)

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

Defined in: [game/BoardView.ts:244](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L244)

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

### selectTerrain()

> **selectTerrain**(`selection`): `void`

Defined in: [game/BoardView.ts:160](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L160)

#### Parameters

##### selection

[`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md)

#### Returns

`void`

***

### setEvidenceFamilyMode()

> **setEvidenceFamilyMode**(`enabled`): `void`

Defined in: [game/BoardView.ts:239](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L239)

V3 uses family silhouettes; color is only a secondary cue.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### setRouting()

> **setRouting**(`view`): `void`

Defined in: [game/BoardView.ts:155](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L155)

#### Parameters

##### view

[`PublicRoutingView`](../../../terrain/routing/interfaces/PublicRoutingView.md) | `null`

#### Returns

`void`

***

### setTerrain()

> **setTerrain**(`terrain`): `void`

Defined in: [game/BoardView.ts:147](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L147)

#### Parameters

##### terrain

[`TerrainSnapshot`](../../../terrain/terrain/type-aliases/TerrainSnapshot.md) | `undefined`

#### Returns

`void`

***

### snapBack()

> **snapBack**(`spritesToSnap`, `startPositions`, `dragDirection`, `totalDeltaX`, `totalDeltaY`): `Promise`\<`void`\>

Defined in: [game/BoardView.ts:291](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L291)

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

Defined in: [game/BoardView.ts:277](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L277)

Instantly sets dragged sprites to their final grid positions. Assumes gemsSprites array is already updated.

#### Returns

`void`

***

### syncCellStates()

> **syncCellStates**(`grid`): `void`

Defined in: [game/BoardView.ts:960](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L960)

Refreshes blocker metadata and overlays without rebuilding the board.

#### Parameters

##### grid

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### syncSpritesToGridPositions()

> **syncSpritesToGridPositions**(): `void`

Defined in: [game/BoardView.ts:934](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L934)

Utility to sync sprite visual positions to their stored logical grid coords.

#### Returns

`void`

***

### terrainSelectionAt()

> **terrainSelectionAt**(`x`, `y`): [`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md) \| `null`

Defined in: [game/BoardView.ts:166](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L166)

#### Parameters

##### x

`number`

##### y

`number`

#### Returns

[`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md) \| `null`

***

### updateDimensions()

> **updateDimensions**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [game/BoardView.ts:139](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L139)

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

Defined in: [game/BoardView.ts:625](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L625)

Updates the internal gemsSprites array structure after a move.

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

`void`

***

### updateVisualLayout()

> **updateVisualLayout**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [game/BoardView.ts:115](https://github.com/kc0588615/phaser-june/blob/main/src/game/BoardView.ts#L115)

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
