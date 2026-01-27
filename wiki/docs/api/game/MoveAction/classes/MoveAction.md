# Class: MoveAction

Defined in: [src/game/MoveAction.ts:8](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L8)

Represents a player's action of moving a row or column.

## Constructors

### Constructor

> **new MoveAction**(`rowOrCol`, `index`, `amount`): `MoveAction`

Defined in: [src/game/MoveAction.ts:15](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L15)

Creates a MoveAction.

#### Parameters

##### rowOrCol

[`MoveDirection`](../type-aliases/MoveDirection.md)

Whether a row or column was moved.

##### index

`number`

The index of the row or column moved.

##### amount

`number`

The number of cells shifted (positive for right/down, negative for left/up).

#### Returns

`MoveAction`

## Properties

### amount

> `readonly` **amount**: `number`

Defined in: [src/game/MoveAction.ts:18](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L18)

The number of cells shifted (positive for right/down, negative for left/up).

***

### index

> `readonly` **index**: `number`

Defined in: [src/game/MoveAction.ts:17](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L17)

The index of the row or column moved.

***

### rowOrCol

> `readonly` **rowOrCol**: [`MoveDirection`](../type-aliases/MoveDirection.md)

Defined in: [src/game/MoveAction.ts:16](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L16)

Whether a row or column was moved.

## Methods

### getDistance()

> **getDistance**(): `number`

Defined in: [src/game/MoveAction.ts:38](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L38)

Gets the absolute distance moved

#### Returns

`number`

***

### isHorizontal()

> **isHorizontal**(): `boolean`

Defined in: [src/game/MoveAction.ts:24](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L24)

Checks if this move is horizontal (row move)

#### Returns

`boolean`

***

### isPositiveDirection()

> **isPositiveDirection**(): `boolean`

Defined in: [src/game/MoveAction.ts:45](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L45)

Checks if move is to the right (for rows) or down (for columns)

#### Returns

`boolean`

***

### isVertical()

> **isVertical**(): `boolean`

Defined in: [src/game/MoveAction.ts:31](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L31)

Checks if this move is vertical (column move)

#### Returns

`boolean`

***

### toString()

> **toString**(): `string`

Defined in: [src/game/MoveAction.ts:52](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/game/MoveAction.ts#L52)

Returns a string representation of the move

#### Returns

`string`
