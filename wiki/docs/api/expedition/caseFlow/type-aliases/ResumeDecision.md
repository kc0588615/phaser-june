# Type Alias: ResumeDecision

> **ResumeDecision** = \{ `kind`: `"legacy"`; \} \| \{ `finalScore`: `number` \| `null`; `kind`: `"completed"`; \} \| \{ `flow`: [`CaseFlowState`](../interfaces/CaseFlowState.md); `kind`: `"active"`; `step`: [`FlowStep`](FlowStep.md); \}

Defined in: [expedition/caseFlow.ts:73](https://github.com/kc0588615/phaser-june/blob/main/src/expedition/caseFlow.ts#L73)
