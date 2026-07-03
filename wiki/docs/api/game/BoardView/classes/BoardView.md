# Class: BoardView

Defined in: [src/game/BoardView.ts:33](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L33)

## Constructors

### Constructor

> **new BoardView**(`scene`, `config`): `BoardView`

Defined in: [src/game/BoardView.ts:46](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L46)

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

Defined in: [src/game/BoardView.ts:323](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L323)

Animates gem explosions. Removes sprites from grid and destroys them.

#### Parameters

##### matchCoords

[`Coordinate`](../../ExplodeAndReplacePhase/type-aliases/Coordinate.md)[]

#### Returns

`Promise`\<`void`\>

***

### animateFalls()

> **animateFalls**(`replacements`, `finalBackendState`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:391](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L391)

Animates existing gems falling and new gems entering. Updates gemsSprites array.

#### Parameters

##### replacements

\[`number`, (`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]\][]

##### finalBackendState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`Promise`\<`void`\>

***

### createBoard()

> **createBoard**(`initialPuzzleState`): `void`

Defined in: [src/game/BoardView.ts:82](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L82)

Creates the initial sprites based on the model state.

#### Parameters

##### initialPuzzleState

[`PuzzleGrid`](../../boardTypes/type-aliases/PuzzleGrid.md)

#### Returns

`void`

***

### destroyBoard()

> **destroyBoard**(): `void`

Defined in: [src/game/BoardView.ts:558](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L558)

Destroys all sprites and clears the board representation.

#### Returns

`void`

***

### getGemsSprites()

> **getGemsSprites**(): (`Sprite` \| `null`)[][]

Defined in: [src/game/BoardView.ts:823](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L823)

Returns the 2D array of sprite references.

#### Returns

(`Sprite` \| `null`)[][]

***

### getSpriteAt()

> **getSpriteAt**(`x`, `y`): `Sprite` \| `null`

Defined in: [src/game/BoardView.ts:817](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L817)

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

Defined in: [src/game/BoardView.ts:219](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L219)

Visually previews an adjacent swap during drag.

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

### setSnippetPreview()

> **setSnippetPreview**(`preview`): `void`

Defined in: [src/game/BoardView.ts:176](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L176)

Renders the non-playable SNIPPETS row above the board.

#### Parameters

##### preview

(`"sword"` \| `"staff"` \| `"shield"` \| `"key"` \| `"crate"` \| `"power"` \| `"thought"` \| `"multiplier"` \| `"grenade"` \| `"blade_drive"` \| `"caltrops"` \| `"shield_unit"` \| `"black"` \| `"blue"` \| `"green"` \| `"orange"` \| `"red"` \| `"white"` \| `"yellow"` \| `"purple"`)[]

#### Returns

`void`

***

### snapBack()

> **snapBack**(`spritesToSnap`, `startPositions`, `dragDirection`, `totalDeltaX`, `totalDeltaY`): `Promise`\<`void`\>

Defined in: [src/game/BoardView.ts:270](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L270)

Animates swapped sprites back to their original start positions.

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

Defined in: [src/game/BoardView.ts:256](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L256)

Instantly sets dragged sprites to their final grid positions. Assumes gemsSprites array is already updated.

#### Returns

`void`

***

### syncSpritesToGridPositions()

> **syncSpritesToGridPositions**(): `void`

Defined in: [src/game/BoardView.ts:881](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L881)

Utility to sync sprite visual positions to their stored logical grid coords.

#### Returns

`void`

***

### updateDimensions()

> **updateDimensions**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:162](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L162)

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

Defined in: [src/game/BoardView.ts:525](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L525)

Updates the internal gemsSprites array structure after a move.

#### Parameters

##### moveAction

[`MoveAction`](../../MoveAction/classes/MoveAction.md)

#### Returns

`void`

***

### updateVisualLayout()

> **updateVisualLayout**(`newGemSize`, `newBoardOffset`): `void`

Defined in: [src/game/BoardView.ts:125](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/BoardView.ts#L125)

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
