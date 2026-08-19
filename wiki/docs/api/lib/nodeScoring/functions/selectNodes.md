# Function: selectNodes()

> **selectNodes**(`scores`): [`NodeSelection`](../interfaces/NodeSelection.md)

Defined in: [src/lib/nodeScoring.ts:90](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/nodeScoring.ts#L90)

Pick primary + modifiers from scored layers.
 Bioregion is background context — only becomes primary when no feature layer exceeds threshold.

## Parameters

### scores

[`LayerScore`](../interfaces/LayerScore.md)[]

## Returns

[`NodeSelection`](../interfaces/NodeSelection.md)
