# Type Alias: ResumeDecision

> **ResumeDecision** = \{ `kind`: `"legacy"`; \} \| \{ `finalScore`: `number` \| `null`; `kind`: `"completed"`; \} \| \{ `flow`: [`CaseFlowState`](../interfaces/CaseFlowState.md); `kind`: `"active"`; `step`: [`FlowStep`](FlowStep.md); \}

Defined in: [src/expedition/caseFlow.ts:63](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/expedition/caseFlow.ts#L63)
