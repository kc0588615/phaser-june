# Function: getSpeciesById()

> **getSpeciesById**(`ogcFid`): `Promise`\<\{ \} \| `null`\>

Defined in: [src/lib/speciesQueries.ts:73](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/speciesQueries.ts#L73)

Fetches full species details by ID.
Use for species detail view / modal display.

## Parameters

### ogcFid

`number`

The species unique identifier

## Returns

`Promise`\<\{ \} \| `null`\>

Full species record or null if not found

## Example

```typescript
const turtle = await getSpeciesById(1);
if (turtle) {
  console.log(turtle.key_fact1, turtle.cons_text);
}
```
