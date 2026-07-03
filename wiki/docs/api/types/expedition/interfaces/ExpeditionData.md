# Interface: ExpeditionData

Defined in: [src/types/expedition.ts:15](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L15)

## Properties

### actionBias

> **actionBias**: `Partial`\<`Record`\<[`ActionGemType`](../../../expedition/domain/type-aliases/ActionGemType.md), `number`\>\>

Defined in: [src/types/expedition.ts:19](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L19)

***

### activeAffinities

> **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:20](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L20)

***

### availableAffinities

> **availableAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:21](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L21)

***

### bioregion

> **bioregion**: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`

Defined in: [src/types/expedition.ts:17](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L17)

***

### modifierNodes

> **modifierNodes**: `string`[]

Defined in: [src/types/expedition.ts:24](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L24)

***

### nearestRiverDistM?

> `optional` **nearestRiverDistM**: `number` \| `null`

Defined in: [src/types/expedition.ts:29](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L29)

***

### nodes

> **nodes**: [`RunNode`](../../../lib/nodeScoring/interfaces/RunNode.md)[]

Defined in: [src/types/expedition.ts:16](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L16)

***

### primaryNodeFamily

> **primaryNodeFamily**: `string`

Defined in: [src/types/expedition.ts:22](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L22)

***

### primaryVariant

> **primaryVariant**: `string`

Defined in: [src/types/expedition.ts:23](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L23)

***

### protectedAreas

> **protectedAreas**: `object`[]

Defined in: [src/types/expedition.ts:18](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L18)

#### designation

> **designation**: `string` \| `null`

#### iucn\_category

> **iucn\_category**: `string` \| `null`

#### name

> **name**: `string` \| `null`

***

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/types/expedition.ts:26](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L26)

***

### signals

> **signals**: `Record`\<`string`, `number`\>

Defined in: [src/types/expedition.ts:25](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L25)

***

### waypointRadiusKm?

> `optional` **waypointRadiusKm**: `number` \| `null`

Defined in: [src/types/expedition.ts:28](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L28)

***

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypoint`](../../waypoints/interfaces/ExpeditionWaypoint.md)[]

Defined in: [src/types/expedition.ts:27](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/types/expedition.ts#L27)
