# Interface: PublicRunMemory

Defined in: [src/lib/runProjection.ts:167](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L167)

## Properties

### biome?

> `optional` **biome**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:194](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L194)

***

### bioregion?

> `optional` **bioregion**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:195](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L195)

***

### createdAt?

> `optional` **createdAt**: `string`

Defined in: [src/lib/runProjection.ts:196](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L196)

***

### deductionSummary

> **deductionSummary**: \{ `candidateCount?`: `number`; `citedEvidenceRefs?`: `string`[]; `confirmedCategories?`: `number`; `efficiencyBonus?`: `number`; `finalScore?`: `number`; `firstGuessCorrect?`: `boolean`; `guessBonus?`: `number`; `issuedEvidenceCount?`: `number`; `processedClues?`: `number`; `reasoningEventCount?`: `number`; `referenceAttempts?`: `number`; `scoreSpent?`: `number`; `wrongGuessCount?`: `number`; \} \| `null`

Defined in: [src/lib/runProjection.ts:177](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L177)

***

### finalScore?

> `optional` **finalScore**: `number` \| `null`

Defined in: [src/lib/runProjection.ts:192](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L192)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [src/lib/runProjection.ts:176](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L176)

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

Defined in: [src/lib/runProjection.ts:168](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L168)

***

### locationKey?

> `optional` **locationKey**: `string`

Defined in: [src/lib/runProjection.ts:170](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L170)

***

### nodes

> **nodes**: [`PublicMemoryNode`](PublicMemoryNode.md)[]

Defined in: [src/lib/runProjection.ts:175](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L175)

***

### realm?

> `optional` **realm**: `string` \| `null`

Defined in: [src/lib/runProjection.ts:193](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L193)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [src/lib/runProjection.ts:174](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L174)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [src/lib/runProjection.ts:173](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L173)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`

***

### runId?

> `optional` **runId**: `string`

Defined in: [src/lib/runProjection.ts:169](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L169)

***

### startLat?

> `optional` **startLat**: `number`

Defined in: [src/lib/runProjection.ts:172](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L172)

***

### startLon?

> `optional` **startLon**: `number`

Defined in: [src/lib/runProjection.ts:171](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L171)
