# Function: useMapLibreEcoregions()

> **useMapLibreEcoregions**(`mapRef`, `ready`, `enabled`, `generation`): `object`

Defined in: [src/hooks/useMapLibreEcoregions.ts:15](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/hooks/useMapLibreEcoregions.ts#L15)

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
