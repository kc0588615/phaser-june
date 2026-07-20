# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ExpeditionWaypointRoute`](../../../../../../lib/waypointHarvesting/interfaces/ExpeditionWaypointRoute.md) \| \{ `origin`: \{ `lat`: `number`; `lon`: `number`; \}; `radiusKm`: `number`; `routePolyline`: `object`[]; `waypoints`: [`ExpeditionWaypoint`](../../../../../../types/waypoints/interfaces/ExpeditionWaypoint.md)[]; \}\>\>

Defined in: [src/app/api/expedition/waypoints/route.ts:4](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/expedition/waypoints/route.ts#L4)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ExpeditionWaypointRoute`](../../../../../../lib/waypointHarvesting/interfaces/ExpeditionWaypointRoute.md) \| \{ `origin`: \{ `lat`: `number`; `lon`: `number`; \}; `radiusKm`: `number`; `routePolyline`: `object`[]; `waypoints`: [`ExpeditionWaypoint`](../../../../../../types/waypoints/interfaces/ExpeditionWaypoint.md)[]; \}\>\>
