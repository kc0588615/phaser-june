# Function: getPlayerIdFromClerk()

> **getPlayerIdFromClerk**(): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/authHelpers.ts:9](https://github.com/kc0588615/phaser-june/blob/920f8fb16170def93f7b6148984124639037198d/src/lib/authHelpers.ts#L9)

Resolve the internal playerId from Clerk session.
Returns null if not authenticated or profile not found.

## Returns

`Promise`\<`string` \| `null`\>
