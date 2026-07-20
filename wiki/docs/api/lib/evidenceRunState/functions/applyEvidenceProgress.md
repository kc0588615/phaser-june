# Function: applyEvidenceProgress()

> **applyEvidenceProgress**(`state`, `input`): \{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_locked"` \| `"move_out_of_order"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}

Defined in: [src/lib/evidenceRunState.ts:127](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/evidenceRunState.ts#L127)

## Parameters

### state

[`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md)

### input

[`EvidenceProgressInput`](../interfaces/EvidenceProgressInput.md)

## Returns

\{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_locked"` \| `"move_out_of_order"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}
