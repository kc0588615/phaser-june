# Interface: CaseFlowState

Defined in: [src/expedition/caseFlow.ts:24](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L24)

## Properties

### committedRefs

> **committedRefs**: `string`[]

Defined in: [src/expedition/caseFlow.ts:31](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L31)

Refs whose interpretation commit is durable server-side.

***

### issuedRefs

> **issuedRefs**: `string`[]

Defined in: [src/expedition/caseFlow.ts:29](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L29)

Refs of issued observations (obs-0..obs-3).

***

### nodes

> **nodes**: [`FlowNode`](FlowNode.md)[]

Defined in: [src/expedition/caseFlow.ts:27](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L27)

Exactly three route nodes, index = client nodeIndex (DB node_order - 1).

***

### signatureSettled

> **signatureSettled**: `boolean`

Defined in: [src/expedition/caseFlow.ts:33](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L33)

True once the single obs-3 attempt reports unavailable (no_signature / not_eligible).

***

### version

> **version**: `1` \| `2` \| `3`

Defined in: [src/expedition/caseFlow.ts:25](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L25)
