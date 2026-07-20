# Interface: ExpeditionData

Defined in: [src/types/expedition.ts:84](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L84)

## Properties

### activeAffinities

> **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:88](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L88)

***

### availableAffinities

> **availableAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:89](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L89)

***

### bioregion

> **bioregion**: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`

Defined in: [src/types/expedition.ts:86](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L86)

***

### modifierNodes

> **modifierNodes**: `string`[]

Defined in: [src/types/expedition.ts:92](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L92)

***

### nearestRiverDistM?

> `optional` **nearestRiverDistM**: `number` \| `null`

Defined in: [src/types/expedition.ts:97](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L97)

***

### nodes

> **nodes**: [`RunNode`](../../../lib/nodeScoring/interfaces/RunNode.md)[]

Defined in: [src/types/expedition.ts:85](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L85)

***

### primaryNodeFamily

> **primaryNodeFamily**: `string`

Defined in: [src/types/expedition.ts:90](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L90)

***

### primaryVariant

> **primaryVariant**: `string`

Defined in: [src/types/expedition.ts:91](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L91)

***

### protectedAreas

> **protectedAreas**: `object`[]

Defined in: [src/types/expedition.ts:87](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L87)

#### designation

> **designation**: `string` \| `null`

#### iucn\_category

> **iucn\_category**: `string` \| `null`

#### name

> **name**: `string` \| `null`

***

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/types/expedition.ts:94](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L94)

***

### signals

> **signals**: `Record`\<`string`, `number`\>

Defined in: [src/types/expedition.ts:93](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L93)

***

### waypointRadiusKm?

> `optional` **waypointRadiusKm**: `number` \| `null`

Defined in: [src/types/expedition.ts:96](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L96)

***

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypoint`](../../waypoints/interfaces/ExpeditionWaypoint.md)[]

Defined in: [src/types/expedition.ts:95](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/types/expedition.ts#L95)
