# Type Alias: SpeciesCardRunMemory

> **SpeciesCardRunMemory** = `Partial`\<`Omit`\<[`PublicRunMemory`](../../../../lib/runProjection/interfaces/PublicRunMemory.md), `"nodes"` \| `"routePolyline"`\>\> & `object`

Defined in: [components/album/SpeciesTCGCard.tsx:41](https://github.com/kc0588615/phaser-june/blob/main/src/components/album/SpeciesTCGCard.tsx#L41)

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
