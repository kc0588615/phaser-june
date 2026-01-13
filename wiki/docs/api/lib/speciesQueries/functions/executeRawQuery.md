# Function: executeRawQuery()

> **executeRawQuery**\<`T`\>(`query`): `Promise`\<`T`[]\>

Defined in: [src/lib/speciesQueries.ts:297](https://github.com/kc0588615/phaser-june/blob/dc88a140368b29a3e7c30936b266fd46ea76c6ee/src/lib/speciesQueries.ts#L297)

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
