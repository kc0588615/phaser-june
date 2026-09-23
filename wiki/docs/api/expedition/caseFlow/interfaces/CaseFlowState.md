# Interface: CaseFlowState

Defined in: [phaser-june-039/src/expedition/caseFlow.ts:20](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/expedition/caseFlow.ts#L20)

## Properties

### incidentAcknowledged

> **incidentAcknowledged**: `boolean`

Defined in: [phaser-june-039/src/expedition/caseFlow.ts:24](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/expedition/caseFlow.ts#L24)

Durable after POST /incident; board progress still infers it on older runs.

***

### nodes

> **nodes**: [`FlowNode`](FlowNode.md)[]

Defined in: [phaser-june-039/src/expedition/caseFlow.ts:22](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/expedition/caseFlow.ts#L22)

Exactly three route nodes, index = client nodeIndex (DB node_order - 1).
