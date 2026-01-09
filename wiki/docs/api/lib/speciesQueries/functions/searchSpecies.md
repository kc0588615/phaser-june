# Function: searchSpecies()

> **searchSpecies**(`query`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:106](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L106)

Searches species by common or scientific name.
Case-insensitive partial matching.

## Parameters

### query

`string`

Search term to match against names

## Returns

`Promise`\<`object`[]\>

## Example

```typescript
const results = await searchSpecies('turtle');
// Returns species with "turtle" in common or scientific name
```
