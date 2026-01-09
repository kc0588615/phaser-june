# Variable: prisma

> `const` **prisma**: `PrismaClient`\<`PrismaClientOptions`, `never`, `DefaultArgs`\>

Defined in: [src/lib/prisma.ts:60](https://github.com/kc0588615/phaser-june/blob/1755769f9313e5c417051ecf2e0b01990a74cc73/src/lib/prisma.ts#L60)

Shared Prisma Client instance.

Features:
- Reuses existing client across hot reloads in development
- Single instance in production
- Minimal logging (errors and warnings only) to keep console clean

## Example

```typescript
import { prisma } from '@/lib/prisma';

// Query species catalog
const allSpecies = await prisma.iCAA.findMany({
  select: { ogc_fid: true, comm_name: true, sci_name: true },
  orderBy: { comm_name: 'asc' },
});
```
