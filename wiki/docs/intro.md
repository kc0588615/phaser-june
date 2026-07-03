---
sidebar_position: 1
title: Introduction
description: Welcome to Phaser-June - a biodiversity discovery game
slug: /intro
---

# Phaser-June Documentation

Technical documentation for **Phaser-June**, a biodiversity discovery game that combines a Phaser match board, Cesium geospatial exploration, and species deduction.

## What is Phaser-June?

Phaser-June lets players click a location on a 3D globe, generate a GIS-scored expedition, and play a match-board run using species and habitat data from Postgres.

There are two documented game loops:

- **Match Battle**: active direction. A branching combat route layers weighted board pieces, Stamina, Actions, Focus, field gear, upgrades, rewards, and checkpoint persistence over the Phaser board.
- **Standard expedition**: legacy/useful runtime context. A GIS-generated node route feeds objective progress, spook meter rewards, clue fragments, and Deduction Camp.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Game Engine** | Phaser 3 |
| **UI Framework** | React + Next.js |
| **3D Globe** | Cesium / Resium |
| **Database** | PostgreSQL (Hetzner VPS) |
| **ORM** | Drizzle (postgres.js) |
| **Auth** | Clerk |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Raster Data** | TiTiler (COG processing) |

## Architecture Overview

The application uses a hybrid React-Phaser architecture:

```
┌─────────────────────────────────────┐
│           React/Next.js             │
│   (UI, Layout, State Management)    │
├─────────────────────────────────────┤
│              EventBus               │
│    (Cross-framework Communication)  │
├─────────────────────────────────────┤
│           Phaser Canvas             │
│   (Game Logic, Sprites, Animation)  │
└─────────────────────────────────────┘
```

## Documentation Structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/):

- **[Getting Started](/docs/category/getting-started)** - Quick setup and orientation
- **[Tutorials](/docs/category/tutorials)** - Step-by-step learning paths
- **[Architecture](/docs/category/architecture)** - System design and concepts
- **[How-To Guides](/docs/category/guides)** - Task-specific recipes
- **[Reference](/docs/category/reference)** - Technical specifications
- **[API Reference](/docs/api)** - Auto-generated TypeDoc documentation

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| Set up the project | [Quick Start](/docs/getting-started/quick-start) |
| Understand the source layout | [Project Structure](/docs/getting-started/project-structure) |
| Understand Match Battle | [Match Battle Guide](/docs/guides/game/match-battle) |
| Understand the EventBus | [Event Types Reference](/docs/reference/event-types) |
| Add a new clue type | [Clue Board Guide](/docs/guides/game/clue-board) |
| Query species data | [Database Guide](/docs/guides/data/database-guide) |
| Explore the API | [API Reference](/docs/api) |

## Contributing

This codebase was built with LLM assistance and has extensive inline documentation. Before making changes:

1. Read the relevant architecture docs
2. Check the API reference for type definitions
3. Follow existing patterns in the codebase
4. Run `npm run typecheck` before committing
