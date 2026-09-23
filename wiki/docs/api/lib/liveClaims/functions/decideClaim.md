# Function: decideClaim()

> **decideClaim**(`claims`, `input`, `answerId`, `answerExplanation`, `candidateIds`, `eliminatedIds`, `hypotheses`): \{ `claims?`: `undefined`; `error`: `"claim_locked"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"invalid_candidate"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"candidate_eliminated"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"invalid_explanation"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"hypothesis_contradicted"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims`: [`ClaimState`](../interfaces/ClaimState.md); `error?`: `undefined`; `resolved`: `boolean`; `slipped`: `boolean`; `verdict`: `"supported"` \| `"revise"`; \}

Defined in: [phaser-june-039/src/lib/liveClaims.ts:68](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/lib/liveClaims.ts#L68)

## Parameters

### claims

[`ClaimState`](../interfaces/ClaimState.md)

### input

[`ClaimInput`](../type-aliases/ClaimInput.md)

### answerId

`number`

### answerExplanation

`string`

### candidateIds

readonly `number`[]

### eliminatedIds

readonly `number`[]

### hypotheses

[`Hypotheses`](../type-aliases/Hypotheses.md)

## Returns

\{ `claims?`: `undefined`; `error`: `"claim_locked"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"invalid_candidate"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"candidate_eliminated"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"invalid_explanation"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims?`: `undefined`; `error`: `"hypothesis_contradicted"`; `resolved?`: `undefined`; `slipped?`: `undefined`; `verdict?`: `undefined`; \} \| \{ `claims`: [`ClaimState`](../interfaces/ClaimState.md); `error?`: `undefined`; `resolved`: `boolean`; `slipped`: `boolean`; `verdict`: `"supported"` \| `"revise"`; \}
