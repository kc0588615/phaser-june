# Function: default()

> **default**(`req`, `res`): `Promise`\<`void`\>

Defined in: [pages/api/player/track.ts:12](https://github.com/kc0588615/phaser-june/blob/main/src/pages/api/player/track.ts#L12)

POST /api/player/track
Ends the caller's own game session (sent by Game.ts on shutdown).
Body: \{ action: 'endGameSession', sessionId, finalMoves, finalScore \}

## Parameters

### req

`NextApiRequest`

### res

`NextApiResponse`

## Returns

`Promise`\<`void`\>
