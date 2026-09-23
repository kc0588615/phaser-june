# Interface: PublicRunCheckpoint

Defined in: [phaser-june-039/src/lib/runProjection.ts:171](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L171)

## Properties

### activeAffinities

> **activeAffinities**: `string`[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:176](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L176)

***

### bankedScore?

> `optional` **bankedScore**: `number`

Defined in: [phaser-june-039/src/lib/runProjection.ts:173](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L173)

***

### currentNodeIndex?

> `optional` **currentNodeIndex**: `number`

Defined in: [phaser-june-039/src/lib/runProjection.ts:172](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L172)

***

### expeditionSnapshot

> **expeditionSnapshot**: `object`

Defined in: [phaser-june-039/src/lib/runProjection.ts:189](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L189)

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

Defined in: [phaser-june-039/src/lib/runProjection.ts:179](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L179)

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

Defined in: [phaser-june-039/src/lib/runProjection.ts:177](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L177)

***

### incidentAcknowledged

> **incidentAcknowledged**: `boolean`

Defined in: [phaser-june-039/src/lib/runProjection.ts:175](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L175)

***

### objectiveProgress?

> `optional` **objectiveProgress**: `number`

Defined in: [phaser-june-039/src/lib/runProjection.ts:174](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L174)

***

### rasterHabitats

> **rasterHabitats**: `object`[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:178](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L178)

#### habitat\_type

> **habitat\_type**: `string`

#### percentage

> **percentage**: `number`

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:188](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L188)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`
