# Function: selectNodes()

> **selectNodes**(`scores`): [`NodeSelection`](../interfaces/NodeSelection.md)

Defined in: [lib/nodeScoring.ts:92](https://github.com/kc0588615/phaser-june/blob/main/src/lib/nodeScoring.ts#L92)

Pick primary + modifiers from scored layers.
 Bioregion is background context — only becomes primary when no feature layer exceeds threshold.

## Parameters

### scores

[`LayerScore`](../interfaces/LayerScore.md)[]

## Returns

[`NodeSelection`](../interfaces/NodeSelection.md)
