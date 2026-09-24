# Interface: PublicRunMemory

Defined in: [lib/runProjection.ts:123](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L123)

## Properties

### biome?

> `optional` **biome**: `string` \| `null`

Defined in: [lib/runProjection.ts:143](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L143)

***

### bioregion?

> `optional` **bioregion**: `string` \| `null`

Defined in: [lib/runProjection.ts:144](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L144)

***

### createdAt?

> `optional` **createdAt**: `string`

Defined in: [lib/runProjection.ts:145](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L145)

***

### deductionSummary

> **deductionSummary**: \{ `efficiencyBonus?`: `number`; `firstGuessCorrect?`: `boolean`; `guessBonus?`: `number`; `issuedEvidenceCount?`: `number`; `slipped?`: `boolean`; `wrongGuessCount?`: `number`; \} \| `null`

Defined in: [lib/runProjection.ts:133](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L133)

***

### finalScore?

> `optional` **finalScore**: `number` \| `null`

Defined in: [lib/runProjection.ts:141](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L141)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [lib/runProjection.ts:132](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L132)

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

Defined in: [lib/runProjection.ts:124](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L124)

***

### locationKey?

> `optional` **locationKey**: `string`

Defined in: [lib/runProjection.ts:126](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L126)

***

### nodes

> **nodes**: [`PublicMemoryNode`](PublicMemoryNode.md)[]

Defined in: [lib/runProjection.ts:131](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L131)

***

### realm?

> `optional` **realm**: `string` \| `null`

Defined in: [lib/runProjection.ts:142](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L142)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [lib/runProjection.ts:130](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L130)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [lib/runProjection.ts:129](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L129)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`

***

### runId?

> `optional` **runId**: `string`

Defined in: [lib/runProjection.ts:125](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L125)

***

### startLat?

> `optional` **startLat**: `number`

Defined in: [lib/runProjection.ts:128](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L128)

***

### startLon?

> `optional` **startLon**: `number`

Defined in: [lib/runProjection.ts:127](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L127)
