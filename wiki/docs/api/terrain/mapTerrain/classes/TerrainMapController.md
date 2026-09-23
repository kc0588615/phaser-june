# Class: TerrainMapController

Defined in: [phaser-june-039/src/terrain/mapTerrain.ts:9](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/mapTerrain.ts#L9)

Camera and layers are presentation-only; this controller never fetches or moves gems.

## Constructors

### Constructor

> **new TerrainMapController**(`map`, `onSelect`): `TerrainMapController`

Defined in: [phaser-june-039/src/terrain/mapTerrain.ts:15](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/mapTerrain.ts#L15)

#### Parameters

##### map

`Map$1`

##### onSelect

(`selection`) => `void`

#### Returns

`TerrainMapController`

## Methods

### destroy()

> **destroy**(): `void`

Defined in: [phaser-june-039/src/terrain/mapTerrain.ts:96](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/mapTerrain.ts#L96)

#### Returns

`void`

***

### select()

> **select**(`selection`): `void`

Defined in: [phaser-june-039/src/terrain/mapTerrain.ts:44](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/mapTerrain.ts#L44)

#### Parameters

##### selection

[`TerrainSelection`](../../terrain/interfaces/TerrainSelection.md)

#### Returns

`void`

***

### update()

> **update**(`terrain`, `mode`, `fullscreen`): `void`

Defined in: [phaser-june-039/src/terrain/mapTerrain.ts:21](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/mapTerrain.ts#L21)

#### Parameters

##### terrain

[`TerrainSnapshot`](../../terrain/type-aliases/TerrainSnapshot.md) | `undefined`

##### mode

[`TerrainMapMode`](../type-aliases/TerrainMapMode.md)

##### fullscreen

`boolean`

#### Returns

`void`
