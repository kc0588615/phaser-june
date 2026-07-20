# Function: methodFrictionForObstacles()

> **methodFrictionForObstacles**(`method`, `obstacles`): `string` \| `null`

Defined in: [src/expedition/methodVerbs.ts:63](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/expedition/methodVerbs.ts#L63)

One-line friction warning for a method at a node, or null when the node's
 obstacles don't stress that verb.

## Parameters

### method

`"track"` | `"observe"` | `"listen"` | `"survey"` | `"analyze"`

### obstacles

readonly (`"flow_shift"` \| `"mud_tiles"` \| `"overgrowth"` \| `"low_visibility"` \| `"junk_blockers"` \| `"noise_interference"` \| `"steep_terrain"` \| `"time_pressure"` \| `"signal_dropout"` \| `"unknown_terrain"` \| `"limited_signal"`)[] | `undefined`

## Returns

`string` \| `null`
