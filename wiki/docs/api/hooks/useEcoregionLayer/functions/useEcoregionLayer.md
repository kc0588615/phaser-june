# Function: useEcoregionLayer()

> **useEcoregionLayer**(`viewerRef`, `enabled`): `object`

Defined in: [src/hooks/useEcoregionLayer.ts:49](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/hooks/useEcoregionLayer.ts#L49)

## Parameters

### viewerRef

`MutableRefObject`\<`any`\>

### enabled

`boolean` = `true`

## Returns

`object`

### focusedEcoregion

> **focusedEcoregion**: [`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`

### isPreviewLoading

> **isPreviewLoading**: `boolean`

### pickEcoregionAtPosition()

> **pickEcoregionAtPosition**: (`position`) => [`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`

#### Parameters

##### position

`Cartesian2`

#### Returns

[`EcoregionPreviewPick`](../../../types/ecoregions/interfaces/EcoregionPreviewPick.md) \| `null`
