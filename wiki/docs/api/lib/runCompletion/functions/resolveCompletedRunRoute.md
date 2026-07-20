# Function: resolveCompletedRunRoute()

> **resolveCompletedRunRoute**(`startLon`, `startLat`, `nodes`, `fallbackRoute`): [`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/lib/runCompletion.ts:42](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCompletion.ts#L42)

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

## Returns

[`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]
