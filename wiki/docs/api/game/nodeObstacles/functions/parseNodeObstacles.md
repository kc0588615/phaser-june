# Function: parseNodeObstacles()

> **parseNodeObstacles**(`hazardProfile`): (`"flow_shift"` \| `"mud_tiles"` \| `"overgrowth"` \| `"low_visibility"` \| `"junk_blockers"` \| `"noise_interference"` \| `"steep_terrain"` \| `"time_pressure"` \| `"signal_dropout"` \| `"unknown_terrain"` \| `"limited_signal"`)[]

Defined in: [game/nodeObstacles.ts:30](https://github.com/kc0588615/phaser-june/blob/main/src/game/nodeObstacles.ts#L30)

Known obstacle ids from a stored node hazard profile. Server replay and the
 client projection both use this, so the replayed board matches the played one.

## Parameters

### hazardProfile

`unknown`

## Returns

(`"flow_shift"` \| `"mud_tiles"` \| `"overgrowth"` \| `"low_visibility"` \| `"junk_blockers"` \| `"noise_interference"` \| `"steep_terrain"` \| `"time_pressure"` \| `"signal_dropout"` \| `"unknown_terrain"` \| `"limited_signal"`)[]
