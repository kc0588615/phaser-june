# Function: directMatchTouchesTrail()

> **directMatchTouchesTrail**(`state`, `scenario`, `terrain`, `spatial`): `boolean`

Defined in: [terrain/routing.ts:109](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/routing.ts#L109)

Pre-move camp-connected trail. Direct 3+ cells must overlap it or share a legal edge with it.

## Parameters

### state

[`RoutingState`](../interfaces/RoutingState.md)

### scenario

[`RoutingScenario`](../interfaces/RoutingScenario.md)

### terrain

[`TerrainSnapshotV1`](../../terrain/interfaces/TerrainSnapshotV1.md)

### spatial

[`SpatialMatchDelta`](../interfaces/SpatialMatchDelta.md)

## Returns

`boolean`
