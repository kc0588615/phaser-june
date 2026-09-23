# Interface: PublicRunMemory

Defined in: [phaser-june-039/src/lib/runProjection.ts:135](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L135)

## Properties

### biome?

> `optional` **biome**: `string` \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:155](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L155)

***

### bioregion?

> `optional` **bioregion**: `string` \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:156](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L156)

***

### createdAt?

> `optional` **createdAt**: `string`

Defined in: [phaser-june-039/src/lib/runProjection.ts:157](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L157)

***

### deductionSummary

> **deductionSummary**: \{ `efficiencyBonus?`: `number`; `firstGuessCorrect?`: `boolean`; `guessBonus?`: `number`; `issuedEvidenceCount?`: `number`; `slipped?`: `boolean`; `wrongGuessCount?`: `number`; \} \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:145](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L145)

***

### finalScore?

> `optional` **finalScore**: `number` \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:153](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L153)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:144](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L144)

#### distanceM

> **distanceM**: `number`

#### featureClass

> **featureClass**: `string`

#### name

> **name**: `string` \| `null`

#### overlapRatio

> **overlapRatio**: `number`

#### properties

> **properties**: `object`

##### properties.biome?

> `optional` **biome**: `string`

##### properties.bioregion?

> `optional` **bioregion**: `string`

##### properties.realm?

> `optional` **realm**: `string`

#### sourceId

> **sourceId**: `string` \| `number`

#### sourceTable

> **sourceTable**: `string`

***

### id?

> `optional` **id**: `string`

Defined in: [phaser-june-039/src/lib/runProjection.ts:136](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L136)

***

### locationKey?

> `optional` **locationKey**: `string`

Defined in: [phaser-june-039/src/lib/runProjection.ts:138](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L138)

***

### nodes

> **nodes**: [`PublicMemoryNode`](PublicMemoryNode.md)[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:143](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L143)

***

### realm?

> `optional` **realm**: `string` \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:154](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L154)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:142](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L142)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:141](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L141)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`

***

### runId?

> `optional` **runId**: `string`

Defined in: [phaser-june-039/src/lib/runProjection.ts:137](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L137)

***

### startLat?

> `optional` **startLat**: `number`

Defined in: [phaser-june-039/src/lib/runProjection.ts:140](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L140)

***

### startLon?

> `optional` **startLon**: `number`

Defined in: [phaser-june-039/src/lib/runProjection.ts:139](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L139)
