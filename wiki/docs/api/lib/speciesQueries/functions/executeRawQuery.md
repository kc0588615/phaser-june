# Function: executeRawQuery()

> **executeRawQuery**\<`T`\>(`query`, ...`values`): `Promise`\<`T`[]\>

Defined in: [src/lib/speciesQueries.ts:271](https://github.com/kc0588615/phaser-june/blob/65b5d06c168bbb7e4e517656fc2aa3bc2d516eb1/src/lib/speciesQueries.ts#L271)

Executes a raw SQL query using Prisma's $queryRaw.

USE WITH CAUTION:
- Only use for queries that can't be expressed with Prisma's query API
- Always use tagged template literals (not string concatenation!)
- Variables are automatically parameterized to prevent SQL injection

## Type Parameters

### T

`T`

## Parameters

### query

`TemplateStringsArray`

### values

...`unknown`[]

## Returns

`Promise`\<`T`[]\>

## Example

```typescript
// Safe: using tagged template (parameterized)
const realm = 'Nearctic';
const results = await prisma.$queryRaw`
  SELECT ogc_fid, comm_name FROM icaa WHERE realm = ${realm}
`;

// UNSAFE: never do this!
// const results = await prisma.$queryRawUnsafe(`SELECT * FROM icaa WHERE realm = '${userInput}'`);
```
