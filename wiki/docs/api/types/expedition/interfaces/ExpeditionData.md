# Interface: ExpeditionData

Defined in: [phaser-june-039/src/types/expedition.ts:67](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L67)

## Properties

### activeAffinities

> **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [phaser-june-039/src/types/expedition.ts:71](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L71)

***

### availableAffinities

> **availableAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [phaser-june-039/src/types/expedition.ts:72](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L72)

***

### bioregion

> **bioregion**: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:69](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L69)

***

### modifierNodes

> **modifierNodes**: `string`[]

Defined in: [phaser-june-039/src/types/expedition.ts:75](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L75)

***

### nearestRiverDistM?

> `optional` **nearestRiverDistM**: `number` \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:80](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L80)

***

### nodes

> **nodes**: [`RunNode`](../../../lib/nodeScoring/interfaces/RunNode.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:68](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L68)

***

### primaryNodeFamily

> **primaryNodeFamily**: `string`

Defined in: [phaser-june-039/src/types/expedition.ts:73](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L73)

***

### primaryVariant

> **primaryVariant**: `string`

Defined in: [phaser-june-039/src/types/expedition.ts:74](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L74)

***

### protectedAreas

> **protectedAreas**: `object`[]

Defined in: [phaser-june-039/src/types/expedition.ts:70](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L70)

#### designation

> **designation**: `string` \| `null`

#### iucn\_category

> **iucn\_category**: `string` \| `null`

#### name

> **name**: `string` \| `null`

***

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:77](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L77)

***

### signals

> **signals**: `Record`\<`string`, `number`\>

Defined in: [phaser-june-039/src/types/expedition.ts:76](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L76)

***

### waypointRadiusKm?

> `optional` **waypointRadiusKm**: `number` \| `null`

Defined in: [phaser-june-039/src/types/expedition.ts:79](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L79)

***

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypoint`](../../waypoints/interfaces/ExpeditionWaypoint.md)[]

Defined in: [phaser-june-039/src/types/expedition.ts:78](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/types/expedition.ts#L78)
