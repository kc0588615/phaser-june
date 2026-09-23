# Function: useMapLibreEcoregions()

> **useMapLibreEcoregions**(`mapRef`, `ready`, `enabled`, `generation`): `object`

Defined in: [hooks/useMapLibreEcoregions.ts:15](https://github.com/kc0588615/phaser-june/blob/main/src/hooks/useMapLibreEcoregions.ts#L15)

## Parameters

### mapRef

`MutableRefObject`\<`Map$1` \| `null`\>

### ready

`boolean`

### enabled

`boolean`

### generation

`number`

## Returns

`object`

### focusedEcoregion

> **focusedEcoregion**: [`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`

### isPreviewLoading

> **isPreviewLoading**: `boolean`

### pickEcoregionAtPoint()

> **pickEcoregionAtPoint**: (`point`) => [`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`

#### Parameters

##### point

`PointLike`

#### Returns

[`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`

### selectEcoregion()

> **selectEcoregion**: (`id`) => `void`

#### Parameters

##### id

`string` | `number` | `null`

#### Returns

`void`
