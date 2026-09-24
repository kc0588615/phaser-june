# Interface: ClientRunProjection

Defined in: [lib/runProjection.ts:227](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L227)

## Properties

### casePublic

> **casePublic**: [`PublicCaseV4`](PublicCaseV4.md) \| `null`

Defined in: [lib/runProjection.ts:233](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L233)

***

### checkpoint

> **checkpoint**: [`PublicRunCheckpoint`](PublicRunCheckpoint.md)

Defined in: [lib/runProjection.ts:234](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L234)

***

### claims

> **claims**: [`ClaimState`](../../liveClaims/interfaces/ClaimState.md)

Defined in: [lib/runProjection.ts:228](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L228)

***

### completionReason

> **completionReason**: `"slipped"` \| `"captured"` \| `null`

Defined in: [lib/runProjection.ts:231](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L231)

***

### explanationFeedback

> **explanationFeedback**: `Record`\<`string`, `string`\>

Defined in: [lib/runProjection.ts:230](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L230)

***

### factLedger

> **factLedger**: [`PublicLedgerFact`](../../evidenceLadder/interfaces/PublicLedgerFact.md)[]

Defined in: [lib/runProjection.ts:237](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L237)

Ladder facts already revealed by matches, hydrated from reviewed hint text. Never hint ids or tags.

***

### hypotheses

> **hypotheses**: [`Hypotheses`](../../liveClaims/type-aliases/Hypotheses.md)

Defined in: [lib/runProjection.ts:229](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L229)

***

### legacy

> **legacy**: `boolean`

Defined in: [lib/runProjection.ts:240](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L240)

***

### memory

> **memory**: [`PublicRunMemory`](PublicRunMemory.md) \| `null`

Defined in: [lib/runProjection.ts:239](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L239)

***

### nodes

> **nodes**: [`PublicRunNode`](PublicRunNode.md)[]

Defined in: [lib/runProjection.ts:238](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L238)

***

### observations

> **observations**: [`PublicIssuedObservation`](PublicIssuedObservation.md)[]

Defined in: [lib/runProjection.ts:235](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L235)

***

### run

> **run**: [`PublicRunSummary`](PublicRunSummary.md)

Defined in: [lib/runProjection.ts:232](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L232)

***

### verdict

> **verdict**: \{ `fieldFacts`: `object`[]; `resolution`: [`MysteryResolution`](../../mysteryCase/interfaces/MysteryResolution.md); `resolvedExplanationId`: `string`; `resolvedSpeciesId`: `number`; \} \| `null`

Defined in: [lib/runProjection.ts:241](https://github.com/kc0588615/phaser-june/blob/main/src/lib/runProjection.ts#L241)
