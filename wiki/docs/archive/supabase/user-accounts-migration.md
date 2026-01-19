---
title: User Accounts Migration
description: Auth migration steps
tags: [guide, auth, migration, archived]
---

# User Accounts Migration Plan

:::caution Archived
This page documents the Supabase-era auth plan and is kept for historical reference only.
:::

Steps for migrating authentication.

## Supabase Auth

Use Supabase Auth with social providers.

## Profile Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  avatar_url TEXT
);
```
