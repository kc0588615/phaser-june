# Interface: PublicRunMemory

Defined in: [src/lib/runProjection.ts:138](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L138)

## Properties

### biome?

> `optional` **biome**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:157](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L157)

***

### bioregion?

> `optional` **bioregion**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:158](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L158)

***

### createdAt?

> `optional` **createdAt**: `string`

Defined in: [src/lib/runProjection.ts:159](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L159)

***

### deductionSummary

> **deductionSummary**: \{ `efficiencyBonus?`: `number`; `firstGuessCorrect?`: `boolean`; `guessBonus?`: `number`; `issuedEvidenceCount?`: `number`; `wrongGuessCount?`: `number`; \} \| `null`

Defined in: [src/lib/runProjection.ts:148](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L148)

***

### finalScore?

> `optional` **finalScore**: `number` \| `null`

Defined in: [src/lib/runProjection.ts:155](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L155)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [src/lib/runProjection.ts:147](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L147)

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

Defined in: [src/lib/runProjection.ts:139](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L139)

***

### locationKey?

> `optional` **locationKey**: `string`

Defined in: [src/lib/runProjection.ts:141](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L141)

***

### nodes

> **nodes**: [`PublicMemoryNode`](PublicMemoryNode.md)[]

Defined in: [src/lib/runProjection.ts:146](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L146)

***

### realm?

> `optional` **realm**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:156](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L156)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [src/lib/runProjection.ts:145](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L145)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [src/lib/runProjection.ts:144](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L144)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`

***

### runId?

> `optional` **runId**: `string`

Defined in: [src/lib/runProjection.ts:140](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L140)

***

### startLat?

> `optional` **startLat**: `number`

Defined in: [src/lib/runProjection.ts:143](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L143)

***

### startLon?

> `optional` **startLon**: `number`

Defined in: [src/lib/runProjection.ts:142](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L142)
