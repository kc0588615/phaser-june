# Function: executeRawQuery()

> **executeRawQuery**\<`T`\>(`query`): `Promise`\<`T`[]\>

Defined in: [src/lib/speciesQueries.ts:297](https://github.com/kc0588615/phaser-june/blob/88f818ff8b55f30bdc1204084c11cc57d6a82bbd/src/lib/speciesQueries.ts#L297)

Executes a raw SQL query using Drizzle's sql template.
Always use tagged template literals (parameterized) for safety.

## Type Parameters

### T

`T` *extends* `Record`\<`string`, `unknown`\>

## Parameters

### query

`SQL`\<`unknown`\>

## Returns

`Promise`\<`T`[]\>
