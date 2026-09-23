# Type Alias: EvidenceMoveVerificationResult

> **EvidenceMoveVerificationResult** = \{ `input`: [`EvidenceProgressInput`](../../evidenceRunState/interfaces/EvidenceProgressInput.md); `ok`: `true`; `spatial`: [`SpatialMatchDelta`](../interfaces/SpatialMatchDelta.md); \} \| \{ `gridDifference?`: \{ `actual`: [`PuzzleGrid`](../../../game/boardTypes/type-aliases/PuzzleGrid.md)\[`number`\]\[`number`\]; `expected`: [`PuzzleGrid`](../../../game/boardTypes/type-aliases/PuzzleGrid.md)\[`number`\]\[`number`\]; `x`: `number`; `y`: `number`; \}; `ok`: `false`; `reason`: [`EvidenceMoveVerificationFailure`](EvidenceMoveVerificationFailure.md); \}

Defined in: [phaser-june-039/src/lib/evidenceMoveVerification.ts:51](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceMoveVerification.ts#L51)
