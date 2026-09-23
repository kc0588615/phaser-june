# Interface: CaseFlowState

Defined in: [expedition/caseFlow.ts:20](https://github.com/kc0588615/phaser-june/blob/main/src/expedition/caseFlow.ts#L20)

## Properties

### incidentAcknowledged

> **incidentAcknowledged**: `boolean`

Defined in: [expedition/caseFlow.ts:24](https://github.com/kc0588615/phaser-june/blob/main/src/expedition/caseFlow.ts#L24)

Durable after POST /incident; board progress still infers it on older runs.

***

### nodes

> **nodes**: [`FlowNode`](FlowNode.md)[]

Defined in: [expedition/caseFlow.ts:22](https://github.com/kc0588615/phaser-june/blob/main/src/expedition/caseFlow.ts#L22)

Exactly three route nodes, index = client nodeIndex (DB node_order - 1).
