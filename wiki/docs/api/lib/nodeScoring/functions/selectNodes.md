# Function: selectNodes()

> **selectNodes**(`scores`): [`NodeSelection`](../interfaces/NodeSelection.md)

Defined in: [src/lib/nodeScoring.ts:101](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/nodeScoring.ts#L101)

Pick primary + modifiers from scored layers.
 Bioregion is background context — only becomes primary when no feature layer exceeds threshold.

## Parameters

### scores

[`LayerScore`](../interfaces/LayerScore.md)[]

## Returns

[`NodeSelection`](../interfaces/NodeSelection.md)
