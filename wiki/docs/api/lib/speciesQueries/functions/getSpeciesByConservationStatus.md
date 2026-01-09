# Function: getSpeciesByConservationStatus()

> **getSpeciesByConservationStatus**(`categories`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:138](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L138)

Filters species by conservation status (IUCN category).

## Parameters

### categories

`string`[]

Array of IUCN codes: 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'EX', 'EW'

## Returns

`Promise`\<`object`[]\>

## Example

```typescript
const endangered = await getSpeciesByConservationStatus(['CR', 'EN']);
```
