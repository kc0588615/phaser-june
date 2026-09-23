# Interface: TerrainSnapshotV2

Defined in: [phaser-june-039/src/terrain/terrain.ts:35](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L35)

## Extends

- `TerrainSnapshotBase`

## Properties

### cells

> `readonly` **cells**: readonly readonly [`TerrainCell`](TerrainCell.md)[][]

Defined in: [phaser-june-039/src/terrain/terrain.ts:27](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L27)

#### Inherited from

`TerrainSnapshotBase.cells`

***

### datasetRevision

> `readonly` **datasetRevision**: `string`

Defined in: [phaser-june-039/src/terrain/terrain.ts:19](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L19)

#### Inherited from

`TerrainSnapshotBase.datasetRevision`

***

### extractedAt

> `readonly` **extractedAt**: `string`

Defined in: [phaser-june-039/src/terrain/terrain.ts:21](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L21)

#### Inherited from

`TerrainSnapshotBase.extractedAt`

***

### height

> `readonly` **height**: `6`

Defined in: [phaser-june-039/src/terrain/terrain.ts:26](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L26)

#### Inherited from

`TerrainSnapshotBase.height`

***

### id

> `readonly` **id**: `string`

Defined in: [phaser-june-039/src/terrain/terrain.ts:18](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L18)

#### Inherited from

`TerrainSnapshotBase.id`

***

### mappingVersion

> `readonly` **mappingVersion**: `string`

Defined in: [phaser-june-039/src/terrain/terrain.ts:20](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L20)

#### Inherited from

`TerrainSnapshotBase.mappingVersion`

***

### sourceCrs

> `readonly` **sourceCrs**: `"EPSG:3857"`

Defined in: [phaser-june-039/src/terrain/terrain.ts:22](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L22)

#### Inherited from

`TerrainSnapshotBase.sourceCrs`

***

### sourceWindow

> `readonly` **sourceWindow**: `object`

Defined in: [phaser-june-039/src/terrain/terrain.ts:37](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L37)

#### col

> `readonly` **col**: `number`

#### row

> `readonly` **row**: `number`

#### stride

> `readonly` **stride**: `1` \| `4` \| `8` \| `16`

***

### strideReason

> `readonly` **strideReason**: [`TerrainStrideReason`](TerrainStrideReason.md)

Defined in: [phaser-june-039/src/terrain/terrain.ts:38](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L38)

***

### transform

> `readonly` **transform**: readonly \[`number`, `number`, `number`, `number`, `number`, `number`\]

Defined in: [phaser-june-039/src/terrain/terrain.ts:24](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L24)

GDAL affine: origin X, pixel X, row X, origin Y, column Y, pixel Y.

#### Inherited from

`TerrainSnapshotBase.transform`

***

### version

> `readonly` **version**: `2`

Defined in: [phaser-june-039/src/terrain/terrain.ts:36](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L36)

***

### width

> `readonly` **width**: `6`

Defined in: [phaser-june-039/src/terrain/terrain.ts:25](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/terrain.ts#L25)

#### Inherited from

`TerrainSnapshotBase.width`
