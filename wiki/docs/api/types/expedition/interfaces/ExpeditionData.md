# Interface: ExpeditionData

Defined in: [types/expedition.ts:82](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L82)

## Properties

### activeAffinities

> **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [types/expedition.ts:86](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L86)

***

### availableAffinities

> **availableAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [types/expedition.ts:87](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L87)

***

### bioregion

> **bioregion**: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`

Defined in: [types/expedition.ts:84](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L84)

***

### modifierNodes

> **modifierNodes**: `string`[]

Defined in: [types/expedition.ts:90](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L90)

***

### nearestRiverDistM?

> `optional` **nearestRiverDistM**: `number` \| `null`

Defined in: [types/expedition.ts:95](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L95)

***

### nodes

> **nodes**: [`RunNode`](../../../lib/nodeScoring/interfaces/RunNode.md)[]

Defined in: [types/expedition.ts:83](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L83)

***

### primaryNodeFamily

> **primaryNodeFamily**: `string`

Defined in: [types/expedition.ts:88](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L88)

***

### primaryVariant

> **primaryVariant**: `string`

Defined in: [types/expedition.ts:89](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L89)

***

### protectedAreas

> **protectedAreas**: `object`[]

Defined in: [types/expedition.ts:85](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L85)

#### designation

> **designation**: `string` \| `null`

#### iucn\_category

> **iucn\_category**: `string` \| `null`

#### name

> **name**: `string` \| `null`

***

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [types/expedition.ts:92](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L92)

***

### signals

> **signals**: `Record`\<`string`, `number`\>

Defined in: [types/expedition.ts:91](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L91)

***

### waypointRadiusKm?

> `optional` **waypointRadiusKm**: `number` \| `null`

Defined in: [types/expedition.ts:94](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L94)

***

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypoint`](../../waypoints/interfaces/ExpeditionWaypoint.md)[]

Defined in: [types/expedition.ts:93](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L93)
