# Interface: ExpeditionData

Defined in: [src/types/expedition.ts:55](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L55)

## Properties

### activeAffinities

> **activeAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:59](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L59)

***

### availableAffinities

> **availableAffinities**: (`"avian"` \| `"feline"` \| `"amphibian"` \| `"primate"` \| `"insect"` \| `"ungulate"` \| `"reptile"` \| `"fish"` \| `"arachnid"` \| `"burrower"`)[]

Defined in: [src/types/expedition.ts:60](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L60)

***

### bioregion

> **bioregion**: \{ `biome`: `string` \| `null`; `bioregion`: `string` \| `null`; `realm`: `string` \| `null`; \} \| `null`

Defined in: [src/types/expedition.ts:57](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L57)

***

### modifierNodes

> **modifierNodes**: `string`[]

Defined in: [src/types/expedition.ts:63](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L63)

***

### nearestRiverDistM?

> `optional` **nearestRiverDistM**: `number` \| `null`

Defined in: [src/types/expedition.ts:68](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L68)

***

### nodes

> **nodes**: [`RunNode`](../../../lib/nodeScoring/interfaces/RunNode.md)[]

Defined in: [src/types/expedition.ts:56](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L56)

***

### primaryNodeFamily

> **primaryNodeFamily**: `string`

Defined in: [src/types/expedition.ts:61](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L61)

***

### primaryVariant

> **primaryVariant**: `string`

Defined in: [src/types/expedition.ts:62](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L62)

***

### protectedAreas

> **protectedAreas**: `object`[]

Defined in: [src/types/expedition.ts:58](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L58)

#### designation

> **designation**: `string` \| `null`

#### iucn\_category

> **iucn\_category**: `string` \| `null`

#### name

> **name**: `string` \| `null`

***

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/types/expedition.ts:65](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L65)

***

### signals

> **signals**: `Record`\<`string`, `number`\>

Defined in: [src/types/expedition.ts:64](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L64)

***

### waypointRadiusKm?

> `optional` **waypointRadiusKm**: `number` \| `null`

Defined in: [src/types/expedition.ts:67](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L67)

***

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypoint`](../../waypoints/interfaces/ExpeditionWaypoint.md)[]

Defined in: [src/types/expedition.ts:66](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/types/expedition.ts#L66)
