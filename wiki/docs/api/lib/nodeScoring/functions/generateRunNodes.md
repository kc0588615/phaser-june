# Function: generateRunNodes()

> **generateRunNodes**(`selection`, `scores`, `habitat`, `threatenedCount`, `protectedCoverage`, `anchorType?`): [`RunNode`](../interfaces/RunNode.md)[]

Defined in: [src/lib/nodeScoring.ts:403](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/nodeScoring.ts#L403)

Three-node mystery generator. GIS chooses flavor; each slot earns one investigation method.

## Parameters

### selection

[`NodeSelection`](../interfaces/NodeSelection.md)

### scores

[`LayerScore`](../interfaces/LayerScore.md)[]

### habitat

[`HabitatSignals`](../interfaces/HabitatSignals.md)

### threatenedCount

`number`

### protectedCoverage

`number`

### anchorType?

[`WaypointType`](../../../types/waypoints/type-aliases/WaypointType.md) | `null`

## Returns

[`RunNode`](../interfaces/RunNode.md)[]
