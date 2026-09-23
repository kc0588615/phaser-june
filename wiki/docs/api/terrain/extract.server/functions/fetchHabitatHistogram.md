# Function: fetchHabitatHistogram()

> **fetchHabitatHistogram**(`lon`, `lat`, `options`): `Promise`\<[`HabitatShare`](../../../lib/habitatHistogram/interfaces/HabitatShare.md)[] \| `null`\>

Defined in: [phaser-june-039/src/terrain/extract.server.ts:179](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/extract.server.ts#L179)

## Parameters

### lon

`number`

### lat

`number`

### options

#### baseUrl

`string`

#### cogUrl

`string`

#### fetch

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### signal

`AbortSignal`

## Returns

`Promise`\<[`HabitatShare`](../../../lib/habitatHistogram/interfaces/HabitatShare.md)[] \| `null`\>
