# Function: applyEvidenceProgress()

> **applyEvidenceProgress**(`state`, `input`): \{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_locked"` \| `"move_out_of_order"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}

Defined in: [src/lib/evidenceRunState.ts:127](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/evidenceRunState.ts#L127)

## Parameters

### state

[`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md)

### input

[`EvidenceProgressInput`](../interfaces/EvidenceProgressInput.md)

## Returns

\{ `digest`: `string`; `state`: [`V3NodeEvidenceState`](../interfaces/V3NodeEvidenceState.md); \} \| \{ `error`: `"move_locked"` \| `"move_out_of_order"` \| `"invalid_family"` \| `"charge_overflow"` \| `"checkpoint_mismatch"`; \}
