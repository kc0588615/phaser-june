# Function: getPlayerIdFromClerk()

> **getPlayerIdFromClerk**(): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/authHelpers.ts:9](https://github.com/kc0588615/phaser-june/blob/f5b941d3c604a25cd2422fbb2069c8fcf3fe9e88/src/lib/authHelpers.ts#L9)

Resolve the internal playerId from Clerk session.
Returns null if not authenticated or profile not found.

## Returns

`Promise`\<`string` \| `null`\>
