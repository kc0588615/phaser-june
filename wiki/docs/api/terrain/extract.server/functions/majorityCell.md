# Function: majorityCell()

> **majorityCell**(`codes`, `masks`, `size`, `cellX`, `cellY`, `stride`): `object`

Defined in: [terrain/extract.server.ts:63](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/extract.server.ts#L63)

Mode of valid pixels in one stride×stride block. Ties → lowest code. Invalid if fewer than half the pixels are valid.

## Parameters

### codes

readonly `number`[]

### masks

readonly `number`[]

### size

`number`

### cellX

`number`

### cellY

`number`

### stride

`number`

## Returns

`object`

### code

> **code**: `number`

### valid

> **valid**: `boolean`
