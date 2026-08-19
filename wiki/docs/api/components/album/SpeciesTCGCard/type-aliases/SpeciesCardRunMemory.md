# Type Alias: SpeciesCardRunMemory

> **SpeciesCardRunMemory** = `Partial`\<`Omit`\<[`PublicRunMemory`](../../../../lib/runProjection/interfaces/PublicRunMemory.md), `"nodes"` \| `"routePolyline"`\>\> & `object`

Defined in: [src/components/album/SpeciesTCGCard.tsx:51](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/components/album/SpeciesTCGCard.tsx#L51)

## Type Declaration

### captured?

> `optional` **captured**: `boolean`

### nodes?

> `optional` **nodes**: [`PublicRunMemory`](../../../../lib/runProjection/interfaces/PublicRunMemory.md)\[`"nodes"`\]

### routePolyline?

> `optional` **routePolyline**: [`RoutePoint`](../../../../lib/expeditionRoute/interfaces/RoutePoint.md)[]

### startedAt?

> `optional` **startedAt**: `string`

### visitedWaypointSlot?

> `optional` **visitedWaypointSlot**: `number`

### waypoints?

> `optional` **waypoints**: [`ExpeditionWaypointMemory`](../../../../types/waypoints/interfaces/ExpeditionWaypointMemory.md)[]
