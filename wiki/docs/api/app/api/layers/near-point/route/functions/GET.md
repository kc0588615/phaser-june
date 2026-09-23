# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: \{ `features`: `unknown`[]; `type`: `string`; \}; `cities`: \{ `features`: `unknown`[]; `type`: `string`; \}; `lakes`: \{ `features`: `unknown`[]; `type`: `string`; \}; `protected_areas`: \{ `features`: `unknown`[]; `type`: `string`; \}; `rivers`: \{ `features`: `unknown`[]; `type`: `string`; \}; `wetlands`: \{ `features`: `unknown`[]; `type`: `string`; \}; \}\>\>

Defined in: [app/api/layers/near-point/route.ts:25](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/layers/near-point/route.ts#L25)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: \{ `features`: `unknown`[]; `type`: `string`; \}; `cities`: \{ `features`: `unknown`[]; `type`: `string`; \}; `lakes`: \{ `features`: `unknown`[]; `type`: `string`; \}; `protected_areas`: \{ `features`: `unknown`[]; `type`: `string`; \}; `rivers`: \{ `features`: `unknown`[]; `type`: `string`; \}; `wetlands`: \{ `features`: `unknown`[]; `type`: `string`; \}; \}\>\>
