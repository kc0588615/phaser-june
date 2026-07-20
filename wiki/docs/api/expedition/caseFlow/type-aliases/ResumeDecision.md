# Type Alias: ResumeDecision

> **ResumeDecision** = \{ `kind`: `"legacy"`; \} \| \{ `finalScore`: `number` \| `null`; `kind`: `"completed"`; \} \| \{ `flow`: [`CaseFlowState`](../interfaces/CaseFlowState.md); `kind`: `"active"`; `step`: [`FlowStep`](FlowStep.md); \}

Defined in: [src/expedition/caseFlow.ts:116](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L116)
