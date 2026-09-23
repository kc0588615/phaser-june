# Interface: ClientRunProjection

Defined in: [phaser-june-039/src/lib/runProjection.ts:239](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L239)

## Properties

### casePublic

> **casePublic**: [`PublicCaseV4`](PublicCaseV4.md) \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:245](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L245)

***

### checkpoint

> **checkpoint**: [`PublicRunCheckpoint`](PublicRunCheckpoint.md)

Defined in: [phaser-june-039/src/lib/runProjection.ts:246](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L246)

***

### claims

> **claims**: [`ClaimState`](../../liveClaims/interfaces/ClaimState.md)

Defined in: [phaser-june-039/src/lib/runProjection.ts:240](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L240)

***

### completionReason

> **completionReason**: `"slipped"` \| `"captured"` \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:243](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L243)

***

### explanationFeedback

> **explanationFeedback**: `Record`\<`string`, `string`\>

Defined in: [phaser-june-039/src/lib/runProjection.ts:242](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L242)

***

### factLedger

> **factLedger**: [`PublicLedgerFact`](../../evidenceLadder/interfaces/PublicLedgerFact.md)[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:249](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L249)

Ladder facts already revealed by matches, hydrated from reviewed hint text. Never hint ids or tags.

***

### hypotheses

> **hypotheses**: [`Hypotheses`](../../liveClaims/type-aliases/Hypotheses.md)

Defined in: [phaser-june-039/src/lib/runProjection.ts:241](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L241)

***

### legacy

> **legacy**: `boolean`

Defined in: [phaser-june-039/src/lib/runProjection.ts:252](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L252)

***

### memory

> **memory**: [`PublicRunMemory`](PublicRunMemory.md) \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:251](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L251)

***

### nodes

> **nodes**: [`PublicRunNode`](PublicRunNode.md)[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:250](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L250)

***

### observations

> **observations**: [`PublicIssuedObservation`](PublicIssuedObservation.md)[]

Defined in: [phaser-june-039/src/lib/runProjection.ts:247](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L247)

***

### run

> **run**: [`PublicRunSummary`](PublicRunSummary.md)

Defined in: [phaser-june-039/src/lib/runProjection.ts:244](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L244)

***

### verdict

> **verdict**: \{ `fieldFacts`: `object`[]; `resolution`: [`MysteryResolution`](../../mysteryCase/interfaces/MysteryResolution.md); `resolvedExplanationId`: `string`; `resolvedSpeciesId`: `number`; \} \| `null`

Defined in: [phaser-june-039/src/lib/runProjection.ts:253](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/runProjection.ts#L253)
