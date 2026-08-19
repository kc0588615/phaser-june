---
sidebar_position: 4
title: Environment Variables
description: Runtime and build configuration
tags: [reference, config, environment]
---

# Environment Variables

## Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL/PgBouncer URL with TLS |
| `CASE_COMPILER_SECRET` | Server-only case compiler secret |
| `CRON_SECRET` | Server-only cron authorization |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key |

## Optional

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_MAP_STYLE_URL` | Hosted/self-hosted MapLibre style | Network-independent app fallback |
| `NEXT_PUBLIC_TITILER_BASE_URL` | Habitat TileJSON/statistics endpoint | Deployed app endpoint |
| `NEXT_PUBLIC_COG_URL` | Habitat Cloud-Optimized GeoTIFF | Deployed habitat COG |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route | `/login` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-sign-in route | `/` |

MapLibre needs no vendor token. If a custom style fails, clear `NEXT_PUBLIC_MAP_STYLE_URL` to verify the local fallback.
