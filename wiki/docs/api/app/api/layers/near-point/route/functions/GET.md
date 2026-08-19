# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: \{ `features`: `unknown`[]; `type`: `string`; \}; `lakes`: \{ `features`: `unknown`[]; `type`: `string`; \}; `protected_areas`: \{ `features`: `unknown`[]; `type`: `string`; \}; `rivers`: \{ `features`: `unknown`[]; `type`: `string`; \}; `wetlands`: \{ `features`: `unknown`[]; `type`: `string`; \}; \}\>\>

Defined in: [src/app/api/layers/near-point/route.ts:25](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/app/api/layers/near-point/route.ts#L25)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `bioregions`: \{ `features`: `unknown`[]; `type`: `string`; \}; `lakes`: \{ `features`: `unknown`[]; `type`: `string`; \}; `protected_areas`: \{ `features`: `unknown`[]; `type`: `string`; \}; `rivers`: \{ `features`: `unknown`[]; `type`: `string`; \}; `wetlands`: \{ `features`: `unknown`[]; `type`: `string`; \}; \}\>\>
