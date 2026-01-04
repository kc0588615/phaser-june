---
sidebar_position: 1
title: Introduction
description: Welcome to Phaser-June - a biodiversity discovery game
slug: /intro
---

# Phaser-June Documentation

Welcome to the technical documentation for **Phaser-June**, a biodiversity discovery game that combines match-3 puzzle mechanics with geospatial exploration.

## What is Phaser-June?

Phaser-June is a web application that lets players explore Earth's biodiversity through an interactive game. Players click on a 3D Cesium globe to select a location, then play a match-3 gem puzzle to unlock clues about species found in that habitat. The goal is to identify the mystery species based on the clues revealed.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Game Engine** | Phaser 3 |
| **UI Framework** | React + Next.js |
| **3D Globe** | Cesium / Resium |
| **Database** | PostgreSQL (Hetzner VPS) |
| **ORM** | Prisma |
| **Auth** | Clerk (TBD) |
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
| Understand the EventBus | [EventBus Architecture](/docs/architecture/eventbus-display) |
| Add a new clue type | [Clue Board Guide](/docs/guides/game/clue-board) |
| Query species data | [Database Guide](/docs/guides/data/database-guide) |
| Explore the API | [API Reference](/docs/api) |

## Contributing

This codebase was built with LLM assistance and has extensive inline documentation. Before making changes:

1. Read the relevant architecture docs
2. Check the API reference for type definitions
3. Follow existing patterns in the codebase
4. Run `npm run typecheck` before committing
