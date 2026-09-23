# Interface: EvidenceProgressResponse

Defined in: [types/expedition.ts:33](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L33)

Success body of POST /api/runs/[runId]/evidence-progress.

## Properties

### cascadeHintLine

> **cascadeHintLine**: `string` \| `null`

Defined in: [types/expedition.ts:42](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L42)

***

### duplicate

> **duplicate**: `boolean`

Defined in: [types/expedition.ts:35](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L35)

***

### evidenceCharges

> **evidenceCharges**: [`EvidenceChargeState`](../../../expedition/evidenceFamilies/type-aliases/EvidenceChargeState.md)

Defined in: [types/expedition.ts:38](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L38)

***

### facts

> **facts**: [`PublicLedgerFact`](../../../lib/evidenceLadder/interfaces/PublicLedgerFact.md)[]

Defined in: [types/expedition.ts:43](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L43)

***

### hintFamilies

> **hintFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [types/expedition.ts:41](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L41)

***

### hintLines

> **hintLines**: `string`[]

Defined in: [types/expedition.ts:40](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L40)

***

### hypotheses

> **hypotheses**: [`Hypotheses`](../../../lib/liveClaims/type-aliases/Hypotheses.md)

Defined in: [types/expedition.ts:44](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L44)

***

### nodeIndex

> **nodeIndex**: `number`

Defined in: [types/expedition.ts:36](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L36)

***

### offeredFamilies

> **offeredFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [types/expedition.ts:39](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L39)

***

### ok

> **ok**: `true`

Defined in: [types/expedition.ts:34](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L34)

***

### reinforcedFamilies

> **reinforcedFamilies**: (`"relatives"` \| `"body"` \| `"behavior"` \| `"habits"` \| `"place"`)[]

Defined in: [types/expedition.ts:45](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L45)

***

### segmentMovesUsed

> **segmentMovesUsed**: `number`

Defined in: [types/expedition.ts:37](https://github.com/kc0588615/phaser-june/blob/main/src/types/expedition.ts#L37)
