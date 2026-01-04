# Function: searchSpecies()

> **searchSpecies**(`query`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:106](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/speciesQueries.ts#L106)

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
