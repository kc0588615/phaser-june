# Function: getSpeciesByConservationStatus()

> **getSpeciesByConservationStatus**(`categories`): `Promise`\<`object`[]\>

Defined in: [src/lib/speciesQueries.ts:138](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/speciesQueries.ts#L138)

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
