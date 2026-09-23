# Function: applyTravel()

> **applyTravel**(`state`, `scenario`, `terrain`, `cellId`): \{ `ok`: `true`; `state`: [`RoutingState`](../interfaces/RoutingState.md); \} \| \{ `ok`: `false`; `reason`: `"illegal_travel"`; \}

Defined in: [terrain/routing.ts:223](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/routing.ts#L223)

## Parameters

### state

[`RoutingState`](../interfaces/RoutingState.md)

### scenario

[`RoutingScenario`](../interfaces/RoutingScenario.md)

### terrain

[`TerrainSnapshotV1`](../../terrain/interfaces/TerrainSnapshotV1.md)

### cellId

`string`

## Returns

\{ `ok`: `true`; `state`: [`RoutingState`](../interfaces/RoutingState.md); \} \| \{ `ok`: `false`; `reason`: `"illegal_travel"`; \}
