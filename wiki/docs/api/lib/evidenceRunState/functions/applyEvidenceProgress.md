# Function: applyEvidenceProgress()

> **applyEvidenceProgress**(`state`, `input`, `issuedFamilies`): \{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_out_of_order"` \| `"move_locked"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}

Defined in: [lib/evidenceRunState.ts:161](https://github.com/kc0588615/phaser-june/blob/main/src/lib/evidenceRunState.ts#L161)

`issuedFamilies` lists one entry per ladder rung the move reveals (see
evidenceLadder.selectLadderIssues); hintCounts are the run-wide rung cursors.

## Parameters

### state

[`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md)

### input

[`EvidenceProgressInput`](../interfaces/EvidenceProgressInput.md)

### issuedFamilies

readonly (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

## Returns

\{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_out_of_order"` \| `"move_locked"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}
