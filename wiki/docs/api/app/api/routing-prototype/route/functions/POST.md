# Function: POST()

> **POST**(`request`): `Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>

Defined in: [phaser-june-039/src/app/api/routing-prototype/route.ts:6](https://github.com/kc0588615/phaser-june/blob/2412a348dbcd2e4eff57d0f114ff66307d7b96ab/src/app/api/routing-prototype/route.ts#L6)

## Parameters

### request

`NextRequest`

## Returns

`Promise`\<`NextResponse`\<\{ `error`: `string`; \}\> \| `NextResponse`\<\{ `boardSeed`: `number`; `checkpoint`: [`BoardCheckpointV1`](../../../../../game/boardTypes/interfaces/BoardCheckpointV1.md) \| `null`; `sessionId`: `string`; `terrain`: [`TerrainSnapshotV1`](../../../../../terrain/terrain/interfaces/TerrainSnapshotV1.md); `view`: [`PublicRoutingView`](../../../../../terrain/routing/interfaces/PublicRoutingView.md); \}\>\>
