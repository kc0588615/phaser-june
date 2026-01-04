---
sidebar_position: 4
title: Prisma Vercel Migration
description: Deploying Prisma to Vercel
tags: [guide, prisma, vercel, deployment]
---

# Prisma Vercel Migration

Configure Prisma for Vercel serverless deployment.

## Build Command

```json
{
  "build": "prisma generate && next build"
}
```

## Connection Pooling

Use connection pooling for serverless:

```env
DATABASE_URL="postgres://...?pgbouncer=true"
```
