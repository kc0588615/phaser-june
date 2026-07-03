# Function: GET()

> **GET**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `albumProfiles`: [`DeductionProfile`](../../../../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]; `mysteryClues`: [`DeductionClue`](../../../../../../lib/deductionEngine/interfaces/DeductionClue.md)[]; `mysteryProfile`: [`DeductionProfile`](../../../../../../lib/deductionEngine/interfaces/DeductionProfile.md); \}\>\>

Defined in: [src/app/api/species/deduction/route.ts:31](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/app/api/species/deduction/route.ts#L31)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `albumProfiles`: [`DeductionProfile`](../../../../../../lib/deductionEngine/interfaces/DeductionProfile.md)[]; `mysteryClues`: [`DeductionClue`](../../../../../../lib/deductionEngine/interfaces/DeductionClue.md)[]; `mysteryProfile`: [`DeductionProfile`](../../../../../../lib/deductionEngine/interfaces/DeductionProfile.md); \}\>\>
