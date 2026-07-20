# Interface: PublicRunCheckpoint

Defined in: [src/lib/runProjection.ts:223](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L223)

## Properties

### activeAffinities

> **activeAffinities**: `string`[]

Defined in: [src/lib/runProjection.ts:227](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L227)

***

### bankedScore?

> `optional` **bankedScore**: `number`

Defined in: [src/lib/runProjection.ts:225](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L225)

***

### citedEvidenceRefs

> **citedEvidenceRefs**: `string`[]

Defined in: [src/lib/runProjection.ts:241](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L241)

***

### currentNodeIndex?

> `optional` **currentNodeIndex**: `number`

Defined in: [src/lib/runProjection.ts:224](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L224)

***

### expeditionSnapshot

> **expeditionSnapshot**: `object`

Defined in: [src/lib/runProjection.ts:242](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L242)

#### availableAffinities

> **availableAffinities**: `string`[]

#### modifierNodes

> **modifierNodes**: `string`[]

#### nearestRiverDistM

> **nearestRiverDistM**: `number` \| `null`

#### primaryNodeFamily

> **primaryNodeFamily**: `string`

#### primaryVariant

> **primaryVariant**: `string`

#### protectedAreas

> **protectedAreas**: `object`[]

#### signals

> **signals**: `Record`\<`string`, `number`\>

#### waypointRadiusKm

> **waypointRadiusKm**: `number` \| `null`

#### waypoints

> **waypoints**: `object`[]

***

### featureFingerprints

> **featureFingerprints**: `object`[]

Defined in: [src/lib/runProjection.ts:230](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L230)

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

### habitats

> **habitats**: `string`[]

Defined in: [src/lib/runProjection.ts:228](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L228)

***

### objectiveProgress?

> `optional` **objectiveProgress**: `number`

Defined in: [src/lib/runProjection.ts:226](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L226)

***

### rasterHabitats

> **rasterHabitats**: `object`[]

Defined in: [src/lib/runProjection.ts:229](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L229)

#### habitat\_type

> **habitat\_type**: `string`

#### percentage

> **percentage**: `number`

***

### reasoningEvents

> **reasoningEvents**: [`PublicReasoningEvent`](PublicReasoningEvent.md)[]

Defined in: [src/lib/runProjection.ts:240](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L240)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [src/lib/runProjection.ts:239](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runProjection.ts#L239)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`
