# Function: getSpeciesCatalog()

> **getSpeciesCatalog**(): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:27](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L27)

Fetches species catalog for SpeciesList component.
Returns a minimal set of fields for efficient list rendering.

## Returns

`Promise`\<`object`[]\>

## Example

```typescript
const species = await getSpeciesCatalog();
species.forEach(s => console.log(s.comm_name, s.realm));
```
