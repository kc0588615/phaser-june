# Function: reconcileProjection()

> **reconcileProjection**(`projection`): [`ResumeDecision`](../type-aliases/ResumeDecision.md)

Defined in: [src/expedition/caseFlow.ts:126](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/caseFlow.ts#L126)

Maps a server projection onto the same flow machine the live loop uses.
Completed runs never re-enter the flow; everything else resumes at whatever
step the durable state says comes next.

## Parameters

### projection

[`ClientRunProjection`](../../../lib/runProjection/interfaces/ClientRunProjection.md)

## Returns

[`ResumeDecision`](../type-aliases/ResumeDecision.md)
