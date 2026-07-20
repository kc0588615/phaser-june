# Function: selectNodes()

> **selectNodes**(`scores`): [`NodeSelection`](../interfaces/NodeSelection.md)

Defined in: [src/lib/nodeScoring.ts:97](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/nodeScoring.ts#L97)

Pick primary + modifiers from scored layers.
 Bioregion is background context — only becomes primary when no feature layer exceeds threshold.

## Parameters

### scores

[`LayerScore`](../interfaces/LayerScore.md)[]

## Returns

[`NodeSelection`](../interfaces/NodeSelection.md)
