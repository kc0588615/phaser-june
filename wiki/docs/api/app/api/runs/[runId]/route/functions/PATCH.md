# Function: PATCH()

> **PATCH**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `checkpoint?`: `undefined`; `error`: `string`; `ok?`: `undefined`; `reason?`: `undefined`; `reasoningEventsCommitted?`: `undefined`; \} \| \{ `checkpoint`: \{ `bankedScore`: `null`; `bestTargetMatchLength?`: `undefined`; `currentNodeIndex`: `null`; `objectiveProgress`: `null`; \}; `error?`: `undefined`; `ok`: `boolean`; `reason?`: `undefined`; `reasoningEventsCommitted`: `never`[]; \} \| \{ `checkpoint?`: `undefined`; `error?`: `undefined`; `ok?`: `undefined`; `reason`: `string`; `reasoningEventsCommitted?`: `undefined`; \} \| \{ `checkpoint`: \{ `bankedScore`: \{ \} \| `null`; `bestTargetMatchLength`: `number` \| `null`; `currentNodeIndex`: \{ \} \| `null`; `objectiveProgress`: \{ \} \| `null`; \}; `error?`: `undefined`; `ok`: `boolean`; `reason?`: `undefined`; `reasoningEventsCommitted`: `string`[]; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/route.ts:35](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/runs/[runId]/route.ts#L35)

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `checkpoint?`: `undefined`; `error`: `string`; `ok?`: `undefined`; `reason?`: `undefined`; `reasoningEventsCommitted?`: `undefined`; \} \| \{ `checkpoint`: \{ `bankedScore`: `null`; `bestTargetMatchLength?`: `undefined`; `currentNodeIndex`: `null`; `objectiveProgress`: `null`; \}; `error?`: `undefined`; `ok`: `boolean`; `reason?`: `undefined`; `reasoningEventsCommitted`: `never`[]; \} \| \{ `checkpoint?`: `undefined`; `error?`: `undefined`; `ok?`: `undefined`; `reason`: `string`; `reasoningEventsCommitted?`: `undefined`; \} \| \{ `checkpoint`: \{ `bankedScore`: \{ \} \| `null`; `bestTargetMatchLength`: `number` \| `null`; `currentNodeIndex`: \{ \} \| `null`; `objectiveProgress`: \{ \} \| `null`; \}; `error?`: `undefined`; `ok`: `boolean`; `reason?`: `undefined`; `reasoningEventsCommitted`: `string`[]; \}\>\>
