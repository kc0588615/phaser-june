# Function: POST()

> **POST**(`request`, `__namedParameters`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `reason`: [`RoutingFailure`](../../../../../../terrain/routingSession/type-aliases/RoutingFailure.md); \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `duplicate`: `boolean`; `ok`: `boolean`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>

Defined in: [phaser-june-039/src/app/api/routing-prototype/\[sessionId\]/route.ts:27](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/routing-prototype/[sessionId]/route.ts#L27)

## Parameters

### request

`NextRequest`

### \_\_namedParameters

#### params

`Promise`\<\{ `sessionId`: `string`; \}\>

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `reason`: [`RoutingFailure`](../../../../../../terrain/routingSession/type-aliases/RoutingFailure.md); \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `duplicate`: `boolean`; `ok`: `boolean`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>
