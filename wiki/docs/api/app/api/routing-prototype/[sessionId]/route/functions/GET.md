# Function: GET()

> **GET**(`_request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>

Defined in: [app/api/routing-prototype/\[sessionId\]/route.ts:7](https://github.com/kc0588615/phaser-june/blob/main/src/app/api/routing-prototype/[sessionId]/route.ts#L7)

## Parameters

### \_request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `sessionId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>
