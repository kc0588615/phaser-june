# Interface: RunSummary

Defined in: [src/types/runSummary.ts:5](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L5)

## Properties

### affinities

> **affinities**: `string`[]

Defined in: [src/types/runSummary.ts:17](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L17)

***

### biome

> **biome**: `string` \| `null`

Defined in: [src/types/runSummary.ts:10](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L10)

***

### bioregion

> **bioregion**: `string` \| `null`

Defined in: [src/types/runSummary.ts:11](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L11)

***

### discoveredSpecies

> **discoveredSpecies**: \{ `id`: `number`; `name`: `string`; \} \| `null`

Defined in: [src/types/runSummary.ts:19](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L19)

***

### endedAt

> **endedAt**: `string` \| `null`

Defined in: [src/types/runSummary.ts:16](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L16)

***

### finalScore

> **finalScore**: `number` \| `null`

Defined in: [src/types/runSummary.ts:13](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L13)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [src/types/runSummary.ts:22](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L22)

#### featureClass

> **featureClass**: [`FeatureClass`](../../gis/type-aliases/FeatureClass.md)

#### name?

> `optional` **name**: `string` \| `null`

***

### hasResumeSnapshot?

> `optional` **hasResumeSnapshot**: `boolean`

Defined in: [src/types/runSummary.ts:18](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L18)

***

### id

> **id**: `string`

Defined in: [src/types/runSummary.ts:6](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L6)

***

### locationKey

> **locationKey**: `string`

Defined in: [src/types/runSummary.ts:8](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L8)

***

### nodeCount

> **nodeCount**: `number`

Defined in: [src/types/runSummary.ts:14](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L14)

***

### nodes

> **nodes**: `object`[]

Defined in: [src/types/runSummary.ts:23](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L23)

#### movesUsed

> **movesUsed**: `number`

#### nodeOrder

> **nodeOrder**: `number`

#### nodeStatus

> **nodeStatus**: `string`

#### nodeType

> **nodeType**: `string`

#### obstacleFamily

> **obstacleFamily**: `string` \| `null`

#### scoreEarned

> **scoreEarned**: `number`

#### waypoint?

> `optional` **waypoint**: [`ExpeditionWaypointMemory`](../../waypoints/interfaces/ExpeditionWaypointMemory.md) \| `null`

***

### realm

> **realm**: `string` \| `null`

Defined in: [src/types/runSummary.ts:9](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L9)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [src/types/runSummary.ts:21](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L21)

***

### routePolyline

> **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/types/runSummary.ts:20](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L20)

***

### scoreTotal

> **scoreTotal**: `number`

Defined in: [src/types/runSummary.ts:12](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L12)

***

### startedAt

> **startedAt**: `string`

Defined in: [src/types/runSummary.ts:15](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L15)

***

### status

> **status**: `string`

Defined in: [src/types/runSummary.ts:7](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/runSummary.ts#L7)
