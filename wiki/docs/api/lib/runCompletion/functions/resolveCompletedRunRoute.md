# Function: resolveCompletedRunRoute()

> **resolveCompletedRunRoute**(`startLon`, `startLat`, `nodes`, `fallbackRoute`, `allowPlannedFallback`): [`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [lib/runCompletion.ts:37](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runCompletion.ts#L37)

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
