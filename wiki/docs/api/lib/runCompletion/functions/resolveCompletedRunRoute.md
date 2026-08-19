# Function: resolveCompletedRunRoute()

> **resolveCompletedRunRoute**(`startLon`, `startLat`, `nodes`, `fallbackRoute`): [`RoutePoint`](../../expeditionRoute/interfaces/RoutePoint.md)[]

Defined in: [src/lib/runCompletion.ts:42](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/runCompletion.ts#L42)

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
