# Function: endGameSession()

> **endGameSession**(`playerId`, `sessionId`, `finalMoves`, `finalScore`): `Promise`\<`boolean`\>

Defined in: [lib/playerTracking.ts:62](https://github.com/kc0588615/phaser-june/blob/main/src/lib/playerTracking.ts#L62)

End an owned, still-open game session. Totals are client-reported (free
play has no server-side move record), so a session can only be closed once.

## Parameters

### playerId

`string`

### sessionId

`string`

### finalMoves

`number`

### finalScore

`number`

## Returns

`Promise`\<`boolean`\>
