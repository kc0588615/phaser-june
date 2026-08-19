# Function: getPlayerIdFromClerk()

> **getPlayerIdFromClerk**(): `Promise`\<`string` \| `null`\>

Defined in: [src/lib/authHelpers.ts:9](https://github.com/kc0588615/phaser-june/blob/a186c5a7d5781fa7bab87bffebc2e4d40f0a8afb/src/lib/authHelpers.ts#L9)

Resolve the internal playerId from Clerk session.
Returns null if not authenticated or profile not found.

## Returns

`Promise`\<`string` \| `null`\>
