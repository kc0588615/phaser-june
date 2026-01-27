# Function: executeRawQuery()

> **executeRawQuery**\<`T`\>(`query`): `Promise`\<`T`[]\>

Defined in: [src/lib/speciesQueries.ts:311](https://github.com/kc0588615/phaser-june/blob/2c42124790104a6e4e53747f896c57465af1ab63/src/lib/speciesQueries.ts#L311)

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
