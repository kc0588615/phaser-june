# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ExpeditionWaypointRoute`](../../../../../../lib/waypointHarvesting/interfaces/ExpeditionWaypointRoute.md) \| \{ `origin`: \{ `lat`: `number`; `lon`: `number`; \}; `radiusKm`: `number`; `routePolyline`: `object`[]; `waypoints`: [`ExpeditionWaypoint`](../../../../../../types/waypoints/interfaces/ExpeditionWaypoint.md)[]; \}\>\>

Defined in: [phaser-june-039/src/app/api/expedition/waypoints/route.ts:4](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/expedition/waypoints/route.ts#L4)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<[`ExpeditionWaypointRoute`](../../../../../../lib/waypointHarvesting/interfaces/ExpeditionWaypointRoute.md) \| \{ `origin`: \{ `lat`: `number`; `lon`: `number`; \}; `radiusKm`: `number`; `routePolyline`: `object`[]; `waypoints`: [`ExpeditionWaypoint`](../../../../../../types/waypoints/interfaces/ExpeditionWaypoint.md)[]; \}\>\>
