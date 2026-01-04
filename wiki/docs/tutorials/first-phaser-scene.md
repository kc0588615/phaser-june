---
sidebar_position: 1
title: Your First Phaser Scene
description: Learn the Phaser scene lifecycle through Critter Connect's codebase
tags: [tutorial, phaser, beginner]
---

# Tutorial: Your First Phaser Scene

In this tutorial, you'll learn how Phaser scenes work by examining real examples from the Critter Connect codebase.

## What You'll Learn

- Phaser scene lifecycle methods
- How scenes communicate with React via EventBus
- The relationship between scenes in a game flow

## Prerequisites

- Basic TypeScript knowledge
- Familiarity with class-based patterns
- [Project running locally](/docs/getting-started/quick-start)

## Understanding Scene Lifecycle

A Phaser scene has four main lifecycle methods:

```typescript
class MyScene extends Phaser.Scene {
  preload() {
    // Load assets (images, audio, etc.)
  }

  create() {
    // Set up game objects, event listeners
  }

  update(time: number, delta: number) {
    // Game loop - called every frame (~60fps)
  }

  shutdown() {
    // Cleanup when scene ends
  }
}
```

## Examining Boot Scene

**Location:** `src/game/scenes/Boot.ts`

The Boot scene is the simplest - it just configures settings and moves on:

```typescript
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');  // Scene key for reference
  }

  preload() {
    // Set base URL for assets
    this.load.setBaseURL('assets');
  }

  create() {
    // Move to Preloader scene
    this.scene.start('Preloader');
  }
}
```

**Key Concept:** `this.scene.start('SceneName')` transitions to another scene.

## Examining Preloader Scene

**Location:** `src/game/scenes/Preloader.ts`

The Preloader loads all game assets:

```typescript
export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Load gem sprites
    GEM_TYPES.forEach(gemType => {
      for (let frame = 0; frame < 8; frame++) {
        const key = `${gemType}_gem_${frame}`;
        this.load.image(key, `${gemType}_gem_${frame}.png`);
      }
    });

    // Load other assets
    this.load.image('bg', 'bg.png');
    this.load.spritesheet('owl', 'Owl_spritesheet.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create() {
    // Assets loaded, proceed to game
    this.scene.start('Game');
  }
}
```

**Key Concepts:**
- `this.load.image(key, path)` - Load static images
- `this.load.spritesheet(key, path, config)` - Load animated sprites
- Assets are cached by key for later use

## Examining the Game Scene

**Location:** `src/game/scenes/Game.ts`

The main game scene demonstrates EventBus integration:

```typescript
export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    // 1. Set up input handlers
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    // 2. Listen for React events
    EventBus.on('cesium-location-selected', this.initializeBoardFromCesium, this);
    EventBus.on('layout-changed', this.handleLayoutChange, this);

    // 3. Listen for resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    // 4. Notify React that scene is ready
    EventBus.emit('current-scene-ready', this);
  }

  shutdown() {
    // Clean up all listeners
    EventBus.off('cesium-location-selected', this.initializeBoardFromCesium, this);
    EventBus.off('layout-changed', this.handleLayoutChange, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }
}
```

**Key Concepts:**
- `create()` sets up everything: input, events, game objects
- `shutdown()` cleans up to prevent memory leaks
- EventBus bridges React ↔ Phaser communication

## Exercise: Add a Debug Scene

Create a simple debug scene that displays FPS:

```typescript
// src/game/scenes/Debug.ts
export class Debug extends Phaser.Scene {
  private fpsText!: Phaser.GameObjects.Text;

  constructor() {
    super('Debug');
  }

  create() {
    this.fpsText = this.add.text(10, 10, 'FPS: 0', {
      fontSize: '16px',
      color: '#00ff00'
    });
  }

  update() {
    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
  }
}
```

Register it in `src/game/main.ts`:

```typescript
import { Debug } from './scenes/Debug';

const config: Phaser.Types.Core.GameConfig = {
  scene: [Boot, Preloader, MainMenu, Game, GameOver, Debug],
  // ...
};
```

Launch it alongside Game:

```typescript
// In Game.create()
this.scene.launch('Debug');
```

## Scene Communication Patterns

### Scene to Scene

```typescript
// Start a new scene (stops current)
this.scene.start('GameOver', { score: 100 });

// Launch a scene (runs parallel)
this.scene.launch('HUD');

// Stop a scene
this.scene.stop('Debug');
```

### Passing Data

```typescript
// Sender
this.scene.start('GameOver', { finalScore: this.score });

// Receiver
create() {
  const data = this.scene.settings.data as { finalScore: number };
  console.log('Final score:', data.finalScore);
}
```

## Summary

- Scenes are self-contained game states
- Lifecycle: `preload` → `create` → `update` → `shutdown`
- EventBus enables React communication
- Always clean up listeners in `shutdown()`

## Next Tutorial

[React-Phaser Bridge](/docs/tutorials/react-phaser-bridge) - Deep dive into EventBus patterns
