# Function: generateRunNodes()

> **generateRunNodes**(`selection`, `scores`, `habitat`, `threatenedCount`, `protectedCoverage`, `anchorType?`): [`RunNode`](../interfaces/RunNode.md)[]

Defined in: [lib/nodeScoring.ts:389](https://github.com/kc0588615/phaser-june/blob/main/src/lib/nodeScoring.ts#L389)

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
