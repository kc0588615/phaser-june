---
sidebar_position: 5
title: User Accounts Migration
description: Auth migration steps
tags: [guide, auth, migration]
---

# User Accounts Migration Plan

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
