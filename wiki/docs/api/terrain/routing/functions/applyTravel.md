# Function: applyTravel()

> **applyTravel**(`state`, `scenario`, `terrain`, `cellId`): \{ `ok`: `true`; `state`: [`RoutingState`](../interfaces/RoutingState.md); \} \| \{ `ok`: `false`; `reason`: `"illegal_travel"`; \}

Defined in: [phaser-june-039/src/terrain/routing.ts:223](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/routing.ts#L223)

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
