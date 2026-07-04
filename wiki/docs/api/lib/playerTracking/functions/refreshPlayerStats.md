# Function: refreshPlayerStats()

> **refreshPlayerStats**(`playerId`): `Promise`\<`boolean`\>

Defined in: [src/lib/playerTracking.ts:525](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/playerTracking.ts#L525)

Refresh player_stats from source tables (player_species_discoveries, player_clue_unlocks)
Uses upsert to create or update the stats row.

## Parameters

### playerId

`string`

## Returns

`Promise`\<`boolean`\>
