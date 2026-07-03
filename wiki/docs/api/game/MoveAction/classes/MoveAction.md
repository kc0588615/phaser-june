# Class: MoveAction

Defined in: [src/game/MoveAction.ts:13](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L13)

Represents a player's board move.

## Constructors

### Constructor

> **new MoveAction**(`from`, `to`): `MoveAction`

Defined in: [src/game/MoveAction.ts:21](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L21)

#### Parameters

##### from

[`GridCoordinate`](../interfaces/GridCoordinate.md)

##### to

[`GridCoordinate`](../interfaces/GridCoordinate.md)

#### Returns

`MoveAction`

### Constructor

> **new MoveAction**(`rowOrCol`, `index`, `amount`): `MoveAction`

Defined in: [src/game/MoveAction.ts:22](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L22)

#### Parameters

##### rowOrCol

[`MoveDirection`](../type-aliases/MoveDirection.md)

##### index

`number`

##### amount

`number`

#### Returns

`MoveAction`

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [src/game/MoveAction.ts:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L17)

***

### from

> `readonly` **from**: [`GridCoordinate`](../interfaces/GridCoordinate.md)

Defined in: [src/game/MoveAction.ts:18](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L18)

***

### index

> `readonly` **index**: `number`

Defined in: [src/game/MoveAction.ts:16](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L16)

***

### mode

> `readonly` **mode**: `"swap"` \| `"line"`

Defined in: [src/game/MoveAction.ts:14](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L14)

***

### rowOrCol

> `readonly` **rowOrCol**: [`MoveDirection`](../type-aliases/MoveDirection.md) \| `null`

Defined in: [src/game/MoveAction.ts:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L15)

***

### to

> `readonly` **to**: [`GridCoordinate`](../interfaces/GridCoordinate.md)

Defined in: [src/game/MoveAction.ts:19](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L19)

## Methods

### getDistance()

> **getDistance**(): `number`

Defined in: [src/game/MoveAction.ts:88](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L88)

Gets the absolute distance moved

#### Returns

`number`

***

### isAdjacent()

> **isAdjacent**(): `boolean`

Defined in: [src/game/MoveAction.ts:63](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L63)

#### Returns

`boolean`

***

### isHorizontal()

> **isHorizontal**(): `boolean`

Defined in: [src/game/MoveAction.ts:70](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L70)

Checks if this move is horizontal (row move)

#### Returns

`boolean`

***

### isNoop()

> **isNoop**(): `boolean`

Defined in: [src/game/MoveAction.ts:59](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L59)

#### Returns

`boolean`

***

### isPositiveDirection()

> **isPositiveDirection**(): `boolean`

Defined in: [src/game/MoveAction.ts:97](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L97)

Checks if move is to the right (for rows) or down (for columns)

#### Returns

`boolean`

***

### isSwap()

> **isSwap**(): `boolean`

Defined in: [src/game/MoveAction.ts:55](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L55)

#### Returns

`boolean`

***

### isVertical()

> **isVertical**(): `boolean`

Defined in: [src/game/MoveAction.ts:79](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L79)

Checks if this move is vertical (column move)

#### Returns

`boolean`

***

### toString()

> **toString**(): `string`

Defined in: [src/game/MoveAction.ts:109](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/game/MoveAction.ts#L109)

Returns a string representation of the move

#### Returns

`string`
