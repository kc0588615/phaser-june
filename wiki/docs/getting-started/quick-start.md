---
sidebar_position: 1
title: Quick Start
description: Get the project running in 5 minutes
tags: [setup, installation]
---

# Quick Start

Get Phaser-June running locally in under 5 minutes.

## Prerequisites

- **Node.js 22** ([download](https://nodejs.org/))
- **PostgreSQL database** (Hetzner VPS or other)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/phaser-june.git
cd phaser-june

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

## Configure Environment

Edit `.env.local` with your credentials:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Optional: TiTiler raster service
NEXT_PUBLIC_TITILER_BASE_URL=https://your-titiler.com
NEXT_PUBLIC_COG_URL=https://your-cog-bucket/habitat.tif
NEXT_PUBLIC_MAP_STYLE_URL=https://your-tile-host/style.json
```

## Run Development Server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080) to see the app.

## Build for Production

```bash
npm run build
npm run serve    # Next.js server on port 8080
```

## Verify Setup

A successful setup shows:
1. A 3D MapLibre globe in the top section
2. Click anywhere on land to see habitat/species data
3. A "Start Game" button appears after location selection
4. The match-3 puzzle board loads with colored gems

## Development Workflow

### Common Commands

```bash
# Development server (hot reload)
npm run dev          # http://localhost:8080

# Type checking (run before commits)
npm run typecheck

# Production build
npm run build        # Creates static export in dist/
npm run serve        # Serves dist/ on port 8080
```

### Expected Output

When `npm run dev` succeeds, you should see:

```
▲ Next.js 15.x
- Local: http://localhost:8080
✓ Ready in Xs
```

### Smoke Test

1. Open http://localhost:8080
2. MapLibre globe should render with the local fallback style
3. Click on land → species panel should update
4. "Start Game" button should show puzzle board

### Debugging Tips

- **Phaser not loading:** Check browser console for asset 404s
- **MapLibre blank:** Check WebGL support and the browser console; remove a failing `NEXT_PUBLIC_MAP_STYLE_URL` to use the fallback
- **No species data:** Check `/api/species/catalog` and `DATABASE_URL` connectivity

## Next Steps

- [Project Structure](/docs/getting-started/project-structure) - Understand the codebase layout
- [Environment Setup](/docs/getting-started/environment-setup) - Deep dive on configuration
- [First Phaser Scene](/docs/tutorials/first-phaser-scene) - Build your first scene
