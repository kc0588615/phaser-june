# Function: resolveCompletedRunRoute()

> **resolveCompletedRunRoute**(`startLon`, `startLat`, `nodes`, `fallbackRoute`, `allowPlannedFallback`): [`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [phaser-june-039/src/lib/runCompletion.ts:37](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runCompletion.ts#L37)

Use completed node waypoints as the authoritative traversed route.

## Parameters

### startLon

`number`

### startLat

`number`

### nodes

readonly `CompletionNode`[]

### fallbackRoute

`unknown`

### allowPlannedFallback

`boolean` = `true`

## Returns

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]
