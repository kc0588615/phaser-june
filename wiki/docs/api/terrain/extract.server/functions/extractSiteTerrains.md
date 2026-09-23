# Function: extractSiteTerrains()

> **extractSiteTerrains**(`sites`, `labels`, `options`): `Promise`\<[`TerrainSnapshot`](../../terrain/type-aliases/TerrainSnapshot.md)[]\>

Defined in: [phaser-june-039/src/terrain/extract.server.ts:206](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/terrain/extract.server.ts#L206)

Entire network operation shares one deadline. Resume never calls this module.

## Parameters

### sites

readonly `object`[]

### labels

`Record`\<`number`, `string`\>

### options

#### baseUrl?

`string`

#### cogUrl?

`string`

#### fetch?

\{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

#### modeResampling?

`boolean`

#### strides?

readonly (`1` \| `4` \| `8` \| `16`)[]

#### timeoutMs?

`number`

## Returns

`Promise`\<[`TerrainSnapshot`](../../terrain/type-aliases/TerrainSnapshot.md)[]\>
