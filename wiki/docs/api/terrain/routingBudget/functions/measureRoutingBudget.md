# Function: measureRoutingBudget()

> **measureRoutingBudget**(`terrain`, `scenario`, `seeds`): [`RoutingBudgetReport`](../interfaces/RoutingBudgetReport.md)

Defined in: [terrain/routingBudget.ts:64](https://github.com/kc0588615/phaser-june/blob/main/src/terrain/routingBudget.ts#L64)

First-legal-move policy with greedy frontier picks toward the survey. Does not change budgets.

## Parameters

### terrain

[`TerrainSnapshotV1`](../../terrain/interfaces/TerrainSnapshotV1.md)

### scenario

[`RoutingScenario`](../../routing/interfaces/RoutingScenario.md)

### seeds

readonly `number`[] = `ROUTING_MEASUREMENT_SEEDS`

## Returns

[`RoutingBudgetReport`](../interfaces/RoutingBudgetReport.md)
