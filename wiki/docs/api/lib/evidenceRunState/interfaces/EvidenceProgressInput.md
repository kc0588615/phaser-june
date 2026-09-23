# Interface: EvidenceProgressInput

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:18](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L18)

## Properties

### boardCheckpoint

> **boardCheckpoint**: [`BoardCheckpointV1`](../../../game/boardTypes/interfaces/BoardCheckpointV1.md)

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:28](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L28)

***

### cascadeCount

> **cascadeCount**: `number`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:23](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L23)

***

### directClears

> **directClears**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:21](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L21)

***

### directMatchFamilies

> **directMatchFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:22](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L22)

***

### moveNumber

> **moveNumber**: `number`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:20](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L20)

***

### nodeIndex

> **nodeIndex**: `number`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:19](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L19)

***

### signalCleared

> **signalCleared**: `boolean`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:24](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L24)

***

### signalClearedFamily?

> `optional` **signalClearedFamily**: `"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:25](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L25)

***

### signalHintCount?

> `optional` **signalHintCount**: `1` \| `2`

Defined in: [phaser-june-039/src/lib/evidenceRunState.ts:27](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/evidenceRunState.ts#L27)

Soft hints the verified clear pays: 1 for a direct 3-match, 2 for 4+.
