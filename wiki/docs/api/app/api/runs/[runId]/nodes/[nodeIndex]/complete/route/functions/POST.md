# Function: POST()

> **POST**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bestTargetMatchLength?`: `undefined`; `completed?`: `undefined`; `duplicate?`: `undefined`; `error`: `string`; `isLastNode?`: `undefined`; `nodeOrder?`: `undefined`; `objectiveMet?`: `undefined`; `qualityTier?`: `undefined`; `reason?`: `undefined`; \} \| \{ `bestTargetMatchLength?`: `undefined`; `completed?`: `undefined`; `duplicate?`: `undefined`; `error?`: `undefined`; `isLastNode?`: `undefined`; `nodeOrder?`: `undefined`; `objectiveMet?`: `undefined`; `qualityTier?`: `undefined`; `reason`: `string`; \} \| \{ `bestTargetMatchLength`: `number`; `completed`: `boolean`; `duplicate`: `boolean`; `error?`: `undefined`; `isLastNode`: `boolean`; `nodeOrder`: `number`; `objectiveMet`: `boolean`; `qualityTier`: [`EvidenceQualityTier`](../../../../../../../../../expedition/evidenceQuality/type-aliases/EvidenceQualityTier.md) \| `null`; `reason?`: `undefined`; \}\>\>

Defined in: [src/app/api/runs/\[runId\]/nodes/\[nodeIndex\]/complete/route.ts:10](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/app/api/runs/[runId]/nodes/[nodeIndex]/complete/route.ts#L10)

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `nodeIndex`: `string`; `runId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bestTargetMatchLength?`: `undefined`; `completed?`: `undefined`; `duplicate?`: `undefined`; `error`: `string`; `isLastNode?`: `undefined`; `nodeOrder?`: `undefined`; `objectiveMet?`: `undefined`; `qualityTier?`: `undefined`; `reason?`: `undefined`; \} \| \{ `bestTargetMatchLength?`: `undefined`; `completed?`: `undefined`; `duplicate?`: `undefined`; `error?`: `undefined`; `isLastNode?`: `undefined`; `nodeOrder?`: `undefined`; `objectiveMet?`: `undefined`; `qualityTier?`: `undefined`; `reason`: `string`; \} \| \{ `bestTargetMatchLength`: `number`; `completed`: `boolean`; `duplicate`: `boolean`; `error?`: `undefined`; `isLastNode`: `boolean`; `nodeOrder`: `number`; `objectiveMet`: `boolean`; `qualityTier`: [`EvidenceQualityTier`](../../../../../../../../../expedition/evidenceQuality/type-aliases/EvidenceQualityTier.md) \| `null`; `reason?`: `undefined`; \}\>\>
