# Function: useTerrainMap()

> **useTerrainMap**(`mapRef`, `ready`, `terrain`, `fullscreen`, `siteMarkers`): `object`

Defined in: [phaser-june-039/src/hooks/useTerrainMap.ts:7](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/hooks/useTerrainMap.ts#L7)

## Parameters

### mapRef

`RefObject`\<`Map$1` \| `null`\>

### ready

`boolean`

### terrain

[`TerrainSnapshot`](../../../terrain/terrain/type-aliases/TerrainSnapshot.md) | `undefined`

### fullscreen

`boolean`

### siteMarkers

readonly `unknown`[]

## Returns

`object`

### mode

> **mode**: [`TerrainMapMode`](../../../terrain/mapTerrain/type-aliases/TerrainMapMode.md)

### selectedCell

> **selectedCell**: [`TerrainCell`](../../../terrain/terrain/interfaces/TerrainCell.md) \| `undefined`

### setMode()

> **setMode**: (`next`) => `void`

#### Parameters

##### next

[`TerrainMapMode`](../../../terrain/mapTerrain/type-aliases/TerrainMapMode.md)

#### Returns

`void`
