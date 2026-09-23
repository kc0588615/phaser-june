# Function: sharesLegalTraversalEdge()

> **sharesLegalTraversalEdge**(`scenario`, `terrain`, `crossingOpen`, `aId`, `bId`): `boolean`

Defined in: [terrain/routing.ts:93](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/routing.ts#L93)

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
