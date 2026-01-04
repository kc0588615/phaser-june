---
sidebar_position: 3
title: Prisma ORM Guide
description: Using Prisma with the database
tags: [guide, prisma, orm]
---

# Prisma ORM Guide

Prisma provides type-safe database access.

## Schema

Located at `prisma/schema.prisma`.

## Client Usage

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const species = await prisma.icaaSpecies.findMany({
  where: { family: 'FELIDAE' }
});
```

## Migrations

```bash
npx prisma migrate dev --name add_field
```
