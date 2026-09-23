# Class: BoardView

Defined in: [phaser-june-039/src/game/BoardView.ts:38](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L38)

## Constructors

### Constructor

> **new BoardView**(`scene`, `config`): `BoardView`

Defined in: [phaser-june-039/src/game/BoardView.ts:56](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L56)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:441](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L441)

Animates gem explosions. Removes sprites from grid and destroys them.

#### Parameters

##### matchCoords

[`Coordinate`](../../ExplodeAndReplacePhase/type-aliases/Coordinate.md)[]

#### Returns

`Promise`\<`void`\>

***

### animateFalls()

> **animateFalls**(`replacements`, `finalBackendState`): `Promise`\<`void`\>

Defined in: [phaser-june-039/src/game/BoardView.ts:523](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L523)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:72](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L72)

Creates the initial sprites based on the model state.

#### Parameters

##### initialPuzzleState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### destroyBoard()

> **destroyBoard**(): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:701](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L701)

Destroys all sprites and clears the board representation.

#### Returns

`void`

***

### getGemsSprites()

> **getGemsSprites**(): (`Sprite` \| `null`)[][]

Defined in: [phaser-june-039/src/game/BoardView.ts:937](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L937)

Returns the 2D array of sprite references.

#### Returns

(`Sprite` \| `null`)[][]

***

### getSpriteAt()

> **getSpriteAt**(`x`, `y`): `Sprite` \| `null`

Defined in: [phaser-june-039/src/game/BoardView.ts:931](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L931)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:274](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L274)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:164](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L164)

#### Parameters

##### selection

[`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md)

#### Returns

`void`

***

### setEvidenceFamilyMode()

> **setEvidenceFamilyMode**(`enabled`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:249](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L249)

V3 uses family silhouettes; color is only a secondary cue.

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

***

### setRouting()

> **setRouting**(`view`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:159](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L159)

#### Parameters

##### view

[`PublicRoutingView`](../../../terrain/routing/interfaces/PublicRoutingView.md) | `null`

#### Returns

`void`

***

### setSurveyZones()

> **setSurveyZones**(`zones`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:243](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L243)

Sets the survey-verb plot highlights (empty array clears them).

#### Parameters

##### zones

readonly `object`[]

#### Returns

`void`

***

### setTerrain()

> **setTerrain**(`terrain`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:151](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L151)

#### Parameters

##### terrain

[`TerrainSnapshot`](../../../terrain/terrain/type-aliases/TerrainSnapshot.md) | `undefined`

#### Returns

`void`

***

### snapBack()

> **snapBack**(`spritesToSnap`, `startPositions`, `dragDirection`, `totalDeltaX`, `totalDeltaY`): `Promise`\<`void`\>

Defined in: [phaser-june-039/src/game/BoardView.ts:321](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L321)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:307](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L307)

Instantly sets dragged sprites to their final grid positions. Assumes gemsSprites array is already updated.

#### Returns

`void`

***

### syncCellStates()

> **syncCellStates**(`grid`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:995](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L995)

Refreshes blocker metadata and overlays without rebuilding the board.

#### Parameters

##### grid

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### syncSpritesToGridPositions()

> **syncSpritesToGridPositions**(): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:969](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L969)

Utility to sync sprite visual positions to their stored logical grid coords.

#### Returns

`void`

***

### terrainSelectionAt()

> **terrainSelectionAt**(`x`, `y`): [`TerrainSelection`](../../../terrain/terrain/interfaces/TerrainSelection.md) \| `null`

Defined in: [phaser-june-039/src/game/BoardView.ts:170](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L170)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:142](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L142)

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

Defined in: [phaser-june-039/src/game/BoardView.ts:655](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L655)

Updates the internal gemsSprites array structure after a move.

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

`void`

***

### updateVisualLayout()

> **updateVisualLayout**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [phaser-june-039/src/game/BoardView.ts:117](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/game/BoardView.ts#L117)

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
