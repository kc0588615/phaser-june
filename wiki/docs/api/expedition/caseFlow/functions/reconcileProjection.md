# Function: reconcileProjection()

> **reconcileProjection**(`projection`): [`ResumeDecision`](../type-aliases/ResumeDecision.md)

Defined in: [phaser-june-039/src/expedition/caseFlow.ts:83](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/expedition/caseFlow.ts#L83)

Maps a server projection onto the same flow machine the live loop uses.
Completed runs never re-enter the flow; everything else resumes at whatever
step the durable state says comes next.

## Parameters

### projection

[`ClientRunProjection`](../../../lib/runProjection/interfaces/ClientRunProjection.md)

## Returns

[`ResumeDecision`](../type-aliases/ResumeDecision.md)
