# Prisma + Vercel Server Runtime Migration

Migration complete. Server runtime is the single source of truth and static export is intentionally disabled to support Prisma and API routes. This document records the issues and fixes from that migration.

## Summary

| Issue | Status | Fix |
|-------|--------|-----|
| Static export + API routes | Complete | Removed `output: 'export'` |
| ESLint 9 flat config | Resolved | Created `eslint.config.mjs`, deleted `.eslintrc.json` |
| Vercel cached `outputDirectory` | Resolved | Removed `distDir`, updated `vercel.json` |
| Next.js 15.3.1 vulnerability | Resolved | Updated to 16.1.0 |
| Turbopack vs Webpack (Cesium) | Resolved | Added `--webpack` flag to build scripts |

## Issue Details

### 1. Static Export Incompatible with API Routes

**Problem:** `next.config.mjs` had `output: 'export'` for static HTML generation. API routes (like `/api/species`) require a server runtime.

**Error:**
```
export const dynamic = "force-static"/export const revalidate not configured
on route "/api/species" with "output: export"
```

**Fix:** Removed `output: 'export'` from `next.config.mjs` to enable server mode.

**Trade-off:** Static export = CDN-only, fast. Server mode = serverless functions, enables Prisma/API routes.

---

### 2. ESLint 9 Flat Config Migration

**Problem:** ESLint 9.x uses flat config by default. Legacy `.eslintrc.json` with `extends: "next/core-web-vitals"` failed.

**Error:**
```
ESLint: Failed to load config "next/core-web-vitals" to extend from
```

**Fix:**
1. Added `eslint-config-next` to devDependencies
2. Created `eslint.config.mjs` using `FlatCompat` bridge:
```js
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: __dirname });
export default [...compat.extends("next/core-web-vitals")];
```
3. Deleted `.eslintrc.json`

---

### 3. Vercel Cached Output Directory

**Problem:** Previous `vercel.json` had `outputDirectory: "dist"`. Even after removing from repo, Vercel dashboard cached this setting.

**Error:**
```
The file "/vercel/path0/dist/routes-manifest.json" couldn't be found
```

**Fix:**
1. Removed `distDir: 'dist'` from `next.config.mjs`
2. Created `vercel.json` with explicit `framework: "nextjs"`
3. Cleared `Output Directory` setting in Vercel Dashboard → Settings → General

---

### 4. Next.js Security Vulnerability

**Problem:** Next.js 15.3.1 flagged as vulnerable by Vercel.

**Error:**
```
Vulnerable version of Next.js detected, please update immediately
```

**Fix:** Updated to Next.js 16.1.0:
```bash
npm install next@latest
```

---

### 5. Turbopack vs Webpack (Cesium Compatibility)

**Problem:** Next.js 16 uses Turbopack by default. Project has custom webpack config for Cesium (`CESIUM_BASE_URL` define, client-side fallbacks).

**Error:**
```
This build is using Turbopack, with a `webpack` config and no `turbopack` config
```

**Fix:** Added `--webpack` flag in build scripts and routed Vercel builds through them:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run vercel-build"
}
```

**Alternative:** Migrate webpack config to Turbopack (future task).

---

## Current Configuration

### next.config.mjs
```js
const nextConfig = {
    trailingSlash: true,
    images: { unoptimized: true },
    webpack: (config, { webpack, isServer }) => {
        config.plugins.push(
            new webpack.DefinePlugin({
                'CESIUM_BASE_URL': JSON.stringify('/cesium/')
            })
        );
        if (!isServer) {
            config.resolve.fallback = { fs: false, path: false, ... };
        }
        return config;
    },
    // headers...
};
```

### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run vercel-build"
}
```

### package.json scripts
```json
{
  "build": "npm run typecheck && next build --webpack",
  "vercel-build": "prisma generate && npm run typecheck && next build --webpack",
  "serve": "next start -p 8080",
  "postinstall": "prisma generate && ..."
}
```

---

## Architecture Change

```
BEFORE (Static Export):
  npm run build → dist/ (static HTML/JS/CSS) → CDN
  No API routes possible

AFTER (Server Runtime):
  npm run build → .next/ → Vercel Serverless Functions
  Prisma runs server-side (API routes, Server Components)
  Server runtime required for API routes and database access
```

---

## Prisma Usage

Prisma is now available for:
- API routes (`src/app/api/species/route.ts`)
- Server Components (direct import)
- Server Actions

### Key Files
- `prisma/schema.prisma` — database schema
- `src/lib/speciesQueries.ts` — Prisma query functions
- `src/app/api/species/route.ts` — demo API endpoint

---

## Related Docs
- [DATABASE_USER_GUIDE.md](./DATABASE_USER_GUIDE.md) — database tables, RPCs, TiTiler integration
- [README.md](./README.md) — setup, env vars, scripts
