# Function: sharesLegalTraversalEdge()

> **sharesLegalTraversalEdge**(`scenario`, `terrain`, `crossingOpen`, `aId`, `bId`): `boolean`

Defined in: [phaser-june-039/src/terrain/routing.ts:93](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/routing.ts#L93)

Orthogonal 4-neighbor on ground, or the authored crossing only while it is open. Never wraps.

## Parameters

### scenario

[`RoutingScenario`](../interfaces/RoutingScenario.md)

### terrain

[`TerrainSnapshotV1`](../../terrain/interfaces/TerrainSnapshotV1.md)

### crossingOpen

`boolean`

### aId

`string`

### bId

`string`

## Returns

`boolean`
