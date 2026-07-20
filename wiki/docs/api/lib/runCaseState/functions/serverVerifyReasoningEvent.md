# Function: serverVerifyReasoningEvent()

> **serverVerifyReasoningEvent**(`value`, `issued`, `candidateIds`, `card`, `profiles`): [`ReasoningEventCommit`](../interfaces/ReasoningEventCommit.md) \| `null`

Defined in: [src/lib/runCaseState.ts:338](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/runCaseState.ts#L338)

## Parameters

### value

`unknown`

### issued

readonly [`IssuedObservationRecord`](../interfaces/IssuedObservationRecord.md)[]

### candidateIds

readonly `number`[]

### card

[`EvidenceCardContent`](../interfaces/EvidenceCardContent.md) | `null`

### profiles

readonly `Record`\<`string`, `unknown`\>[]

## Returns

[`ReasoningEventCommit`](../interfaces/ReasoningEventCommit.md) \| `null`
