# Function: generateRunNodes()

> **generateRunNodes**(`selection`, `scores`, `habitat`, `threatenedCount`, `protectedCoverage`, `anchorType?`): [`RunNode`](../interfaces/RunNode.md)[]

Defined in: [src/lib/nodeScoring.ts:387](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/nodeScoring.ts#L387)

Three-node mystery generator. GIS chooses flavor; v3 applies one evidence family at each site.

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
