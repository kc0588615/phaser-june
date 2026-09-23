# Type Alias: ResumeDecision

> **ResumeDecision** = \{ `kind`: `"legacy"`; \} \| \{ `finalScore`: `number` \| `null`; `kind`: `"completed"`; \} \| \{ `flow`: [`CaseFlowState`](../interfaces/CaseFlowState.md); `kind`: `"active"`; `step`: [`FlowStep`](FlowStep.md); \}

Defined in: [phaser-june-039/src/expedition/caseFlow.ts:73](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/expedition/caseFlow.ts#L73)
