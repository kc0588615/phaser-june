# Function: refreshPlayerStats()

> **refreshPlayerStats**(`playerId`): `Promise`\<`boolean`\>

Defined in: [src/lib/playerTracking.ts:539](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/playerTracking.ts#L539)

Refresh player_stats from source tables (player_species_discoveries, player_clue_unlocks)
Uses upsert to create or update the stats row.

## Parameters

### playerId

`string`

## Returns

`Promise`\<`boolean`\>
