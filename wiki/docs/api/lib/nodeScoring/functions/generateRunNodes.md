# Function: generateRunNodes()

> **generateRunNodes**(`selection`, `scores`, `habitat`, `threatenedCount`, `protectedCoverage`): [`RunNode`](../interfaces/RunNode.md)[]

Defined in: [src/lib/nodeScoring.ts:462](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/nodeScoring.ts#L462)

Unified 6-node run generator. Derives all nodes from layer scores + habitat context.

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

## Returns

[`RunNode`](../interfaces/RunNode.md)[]
