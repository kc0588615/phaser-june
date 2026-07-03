# Interface: RunSummary

Defined in: [src/components/species-list/types.ts:4](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L4)

## Properties

### affinities

> **affinities**: `string`[]

Defined in: [src/components/species-list/types.ts:16](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L16)

***

### biome

> **biome**: `string` \| `null`

Defined in: [src/components/species-list/types.ts:9](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L9)

***

### bioregion

> **bioregion**: `string` \| `null`

Defined in: [src/components/species-list/types.ts:10](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L10)

***

### discoveredSpecies

> **discoveredSpecies**: \{ `id`: `number`; `name`: `string`; \} \| `null`

Defined in: [src/components/species-list/types.ts:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L17)

***

### endedAt

> **endedAt**: `string` \| `null`

Defined in: [src/components/species-list/types.ts:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L15)

***

### finalScore

> **finalScore**: `number` \| `null`

Defined in: [src/components/species-list/types.ts:12](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L12)

***

### gisFeaturesNearby

> **gisFeaturesNearby**: `object`[]

Defined in: [src/components/species-list/types.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L20)

#### featureClass

> **featureClass**: [`FeatureClass`](../../../../types/gis/type-aliases/FeatureClass.md)

#### name?

> `optional` **name**: `string` \| `null`

***

### id

> **id**: `string`

Defined in: [src/components/species-list/types.ts:5](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L5)

***

### locationKey

> **locationKey**: `string`

Defined in: [src/components/species-list/types.ts:7](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L7)

***

### nodeCount

> **nodeCount**: `number`

Defined in: [src/components/species-list/types.ts:13](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L13)

***

### nodes

> **nodes**: `object`[]

Defined in: [src/components/species-list/types.ts:21](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L21)

#### counterGem

> **counterGem**: `string` \| `null`

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

> `optional` **waypoint**: `Partial`\<`Pick`\<[`ExpeditionWaypoint`](../../../../types/waypoints/interfaces/ExpeditionWaypoint.md), `"name"` \| `"lon"` \| `"lat"` \| `"slot"` \| `"waypointType"` \| `"nodeRole"` \| `"fallback"` \| `"designationCategory"`\>\> \| `null`

***

### realm

> **realm**: `string` \| `null`

Defined in: [src/components/species-list/types.ts:8](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L8)

***

### routeBounds

> **routeBounds**: \{ `maxLat`: `number`; `maxLon`: `number`; `minLat`: `number`; `minLon`: `number`; \} \| `null`

Defined in: [src/components/species-list/types.ts:19](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L19)

***

### routePolyline

> **routePolyline**: `object`[]

Defined in: [src/components/species-list/types.ts:18](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L18)

#### lat

> **lat**: `number`

#### lon

> **lon**: `number`

***

### scoreTotal

> **scoreTotal**: `number`

Defined in: [src/components/species-list/types.ts:11](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L11)

***

### startedAt

> **startedAt**: `string`

Defined in: [src/components/species-list/types.ts:14](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L14)

***

### status

> **status**: `string`

Defined in: [src/components/species-list/types.ts:6](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/components/species-list/types.ts#L6)
