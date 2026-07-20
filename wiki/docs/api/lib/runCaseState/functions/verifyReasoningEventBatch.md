# Function: verifyReasoningEventBatch()

> **verifyReasoningEventBatch**(`existingValue`, `requestedValue`, `issued`, `candidateIds`, `cards`, `profiles`): `object`

Defined in: [src/lib/runCaseState.ts:360](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L360)

## Parameters

### existingValue

`unknown`

### requestedValue

`unknown`

### issued

readonly [`IssuedObservationRecord`](../interfaces/IssuedObservationRecord.md)[]

### candidateIds

readonly `number`[]

### cards

`ReadonlyMap`\<`number`, [`EvidenceCardContent`](../interfaces/EvidenceCardContent.md)\>

### profiles

readonly `Record`\<`string`, `unknown`\>[]

## Returns

`object`

### committedRefs

> **committedRefs**: `string`[]

### error

> **error**: `string` \| `null`

### events

> **events**: [`ReasoningEventCommit`](../interfaces/ReasoningEventCommit.md)[]
