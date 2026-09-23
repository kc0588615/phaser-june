# Type Alias: EvidenceMoveVerificationResult

> **EvidenceMoveVerificationResult** = \{ `input`: [`EvidenceProgressInput`](../../evidenceRunState/interfaces/EvidenceProgressInput.md); `ok`: `true`; `spatial`: [`SpatialMatchDelta`](../interfaces/SpatialMatchDelta.md); \} \| \{ `gridDifference?`: \{ `actual`: [`PuzzleGrid`](../../../game/boardTypes/type-aliases/PuzzleGrid.md)\[`number`\]\[`number`\]; `expected`: [`PuzzleGrid`](../../../game/boardTypes/type-aliases/PuzzleGrid.md)\[`number`\]\[`number`\]; `x`: `number`; `y`: `number`; \}; `ok`: `false`; `reason`: [`EvidenceMoveVerificationFailure`](EvidenceMoveVerificationFailure.md); \}

Defined in: [lib/evidenceMoveVerification.ts:51](https://github.com/kc0588615/phaser-june/blob/main/src/lib/evidenceMoveVerification.ts#L51)
