# Interface: PublicRunCheckpoint

Defined in: [lib/runProjection.ts:159](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L159)

## Properties

### activeAffinities

> **activeAffinities**: `string`[]

Defined in: [lib/runProjection.ts:164](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L164)

***

### bankedScore?

> `optional` **bankedScore**: `number`

Defined in: [lib/runProjection.ts:161](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L161)

***

### currentNodeIndex?

> `optional` **currentNodeIndex**: `number`

Defined in: [lib/runProjection.ts:160](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L160)

***

### expeditionSnapshot

> **expeditionSnapshot**: `object`

Defined in: [lib/runProjection.ts:177](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L177)

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

Defined in: [lib/runProjection.ts:167](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L167)

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

Defined in: [lib/runProjection.ts:165](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L165)

***

### incidentAcknowledged

> **incidentAcknowledged**: `boolean`

Defined in: [lib/runProjection.ts:163](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L163)

***

### objectiveProgress?

> `optional` **objectiveProgress**: `number`

Defined in: [lib/runProjection.ts:162](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L162)

***

### rasterHabitats

> **rasterHabitats**: `object`[]

Defined in: [lib/runProjection.ts:166](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L166)

#### habitat\_type

> **habitat\_type**: `string`

#### percentage

> **percentage**: `number`

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [lib/runProjection.ts:176](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L176)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`
