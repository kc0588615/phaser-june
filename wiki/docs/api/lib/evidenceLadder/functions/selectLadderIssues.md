# Function: selectLadderIssues()

> **selectLadderIssues**(`input`, `cursors`, `idsByFamily`): [`LadderSelection`](../interfaces/LadderSelection.md)

Defined in: [phaser-june-039/src/lib/evidenceLadder.ts:40](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceLadder.ts#L40)

One rung per player swap: the direct-match family with the most cleared cells
(ties → replay order) that still has rungs. A Field Signal payout adds its
one or two rungs on the clearing family. Cascades never climb.

## Parameters

### input

`Pick`\<[`EvidenceProgressInput`](../../evidenceRunState/interfaces/EvidenceProgressInput.md), `"directClears"` \| `"directMatchFamilies"` \| `"signalClearedFamily"` \| `"signalHintCount"`\>

### cursors

[`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

### idsByFamily

`Record`\<[`EvidenceFamily`](../../../expedition/evidenceFamilies/type-aliases/EvidenceFamily.md), readonly `number`[]\>

## Returns

[`LadderSelection`](../interfaces/LadderSelection.md)
