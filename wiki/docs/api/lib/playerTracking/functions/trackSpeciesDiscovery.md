# Function: trackSpeciesDiscovery()

> **trackSpeciesDiscovery**(`playerId`, `speciesId`, `options`): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/playerTracking.ts:368](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/playerTracking.ts#L368)

Track a species discovery
Links all pending clues to this discovery

## Parameters

### playerId

`string`

### speciesId

`number`

### options

#### cluesUnlockedBeforeGuess

`number`

#### foundEcoregionId?

`number` \| `null`

#### foundLat?

`number`

#### foundLon?

`number`

#### incorrectGuessesCount

`number`

#### scoreEarned

`number`

#### sessionId?

`string`

#### timeToDiscoverSeconds?

`number`

## Returns

`Promise`\<`string` \| `null`\>
