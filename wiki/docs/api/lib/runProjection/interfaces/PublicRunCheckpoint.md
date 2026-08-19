# Interface: PublicRunCheckpoint

Defined in: [src/lib/runProjection.ts:175](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L175)

## Properties

### activeAffinities

> **activeAffinities**: `string`[]

Defined in: [src/lib/runProjection.ts:179](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L179)

***

### bankedScore?

> `optional` **bankedScore**: `number`

Defined in: [src/lib/runProjection.ts:177](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L177)

***

### currentNodeIndex?

> `optional` **currentNodeIndex**: `number`

Defined in: [src/lib/runProjection.ts:176](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L176)

***

### expeditionSnapshot

> **expeditionSnapshot**: `object`

Defined in: [src/lib/runProjection.ts:192](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L192)

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

Defined in: [src/lib/runProjection.ts:182](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L182)

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

Defined in: [src/lib/runProjection.ts:180](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L180)

***

### objectiveProgress?

> `optional` **objectiveProgress**: `number`

Defined in: [src/lib/runProjection.ts:178](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L178)

***

### rasterHabitats

> **rasterHabitats**: `object`[]

Defined in: [src/lib/runProjection.ts:181](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L181)

#### habitat\_type

> **habitat\_type**: `string`

#### percentage

> **percentage**: `number`

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [src/lib/runProjection.ts:191](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runProjection.ts#L191)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

#### waypointSlot?

> `optional` **waypointSlot**: `number`
