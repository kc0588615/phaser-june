# Type Alias: QualityCheckpointDecision

> **QualityCheckpointDecision** = \{ `bestTargetMatchLength`: `number`; `kind`: `"store"`; \} \| \{ `bestTargetMatchLength`: `number`; `kind`: `"idempotent"`; \} \| \{ `kind`: `"reject"`; `reason`: `"invalid_quality"` \| `"node_not_active"`; \}

Defined in: [src/lib/runCaseState.ts:530](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L530)
