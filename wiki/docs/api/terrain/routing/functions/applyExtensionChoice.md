# Function: applyExtensionChoice()

> **applyExtensionChoice**(`state`, `scenario`, `terrain`, `cellId`): \{ `ok`: `true`; `state`: [`RoutingState`](../interfaces/RoutingState.md); \} \| \{ `ok`: `false`; `reason`: `"no_pending_extension"` \| `"illegal_frontier"`; \}

Defined in: [phaser-june-039/src/terrain/routing.ts:205](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/routing.ts#L205)

## Parameters

### state

[`RoutingState`](../interfaces/RoutingState.md)

### scenario

[`RoutingScenario`](../interfaces/RoutingScenario.md)

### terrain

[`TerrainSnapshotV1`](../../terrain/interfaces/TerrainSnapshotV1.md)

### cellId

`string` | `null`

## Returns

\{ `ok`: `true`; `state`: [`RoutingState`](../interfaces/RoutingState.md); \} \| \{ `ok`: `false`; `reason`: `"no_pending_extension"` \| `"illegal_frontier"`; \}
