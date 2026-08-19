# Function: reconcileProjection()

> **reconcileProjection**(`projection`): [`ResumeDecision`](../type-aliases/ResumeDecision.md)

Defined in: [src/expedition/caseFlow.ts:73](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/expedition/caseFlow.ts#L73)

Maps a server projection onto the same flow machine the live loop uses.
Completed runs never re-enter the flow; everything else resumes at whatever
step the durable state says comes next.

## Parameters

### projection

[`ClientRunProjection`](../../../lib/runProjection/interfaces/ClientRunProjection.md)

## Returns

[`ResumeDecision`](../type-aliases/ResumeDecision.md)
