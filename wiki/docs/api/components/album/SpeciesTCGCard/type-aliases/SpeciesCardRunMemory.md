# Type Alias: SpeciesCardRunMemory

> **SpeciesCardRunMemory** = `Partial`\<`Omit`\<[`PublicRunMemory`](../../../../lib/runProjection/interfaces/PublicRunMemory.md), `"nodes"` \| `"routePolyline"`\>\> & `object`

Defined in: [src/components/album/SpeciesTCGCard.tsx:51](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/components/album/SpeciesTCGCard.tsx#L51)

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
